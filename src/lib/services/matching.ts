import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from './audit';
import type { ConsultantProfile, SelfAssessmentScore } from '@/types/database';

interface MatchingCriteria {
  industry: string;
  subIndustries: string[];
  companySize: string;
  assessmentScores: SelfAssessmentScore;
}

interface CandidateScore {
  userId: string;
  totalScore: number;
  breakdown: {
    criteria: string;
    score: number;
    maxScore: number;
    explanation: string;
  }[];
  rationale: string;
}

interface MatchingOptions {
  topN?: number;
  preserveStatus?: boolean; // 재계산 시 기존 상태 유지
}

/** 점수 계산 결과 타입 */
interface ScoreResult {
  score: number;
  explanation: string;
}

/** 관련 업종 매핑 */
const RELATED_INDUSTRIES: Record<string, string[]> = {
  '제조업': ['유통/물류', 'IT/소프트웨어'],
  '서비스업': ['유통/물류', '금융/보험'],
  '유통/물류': ['제조업', '서비스업'],
  'IT/소프트웨어': ['제조업', '서비스업'],
};

/** 레벨 라벨 매핑 */
const LEVEL_LABEL_MAP: Record<string, string> = {
  BEGINNER: '입문',
  INTERMEDIATE: '실무',
  ADVANCED: '심화',
  LEADER: '리더',
};

/**
 * 매칭 추천 생성
 * 기업 정보 + 자가진단 결과를 바탕으로 Top-N 컨설턴트 추천
 */
export async function generateMatchingRecommendations(
  projectId: string,
  actorUserId: string,
  options: MatchingOptions = {}
): Promise<CandidateScore[]> {
  const { topN = 3, preserveStatus = false } = options;
  const supabase = createAdminClient();

  // 프로젝트 정보 조회
  const { data: projectData } = await supabase
    .from('projects')
    .select('industry, sub_industries, company_size')
    .eq('id', projectId)
    .single();

  if (!projectData) {
    throw new Error('프로젝트 정보를 찾을 수 없습니다.');
  }

  // 자가진단 결과 조회
  const { data: assessment } = await supabase
    .from('self_assessments')
    .select('scores')
    .eq('project_id', projectId)
    .single();

  if (!assessment) {
    throw new Error('자가진단이 완료되지 않았습니다. 자가진단을 먼저 진행해주세요.');
  }

  // 후보 컨설턴트 조회 (CONSULTANT_APPROVED + ACTIVE)
  const { data: candidates } = await supabase
    .from('users')
    .select(`
      id,
      name,
      consultant_profile:consultant_profiles(*)
    `)
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (!candidates || candidates.length === 0) {
    throw new Error('활성화된 컨설턴트가 없습니다. 컨설턴트를 먼저 등록해주세요.');
  }

  // 프로필이 있는 컨설턴트만 필터링
  const candidatesWithProfile = candidates.filter(
    (c) => c.consultant_profile && c.consultant_profile.length > 0
  );

  if (candidatesWithProfile.length === 0) {
    throw new Error('컨설턴트 프로필이 등록되지 않았습니다. 컨설턴트가 프로필을 먼저 작성해야 합니다.');
  }

  const criteria: MatchingCriteria = {
    industry: projectData.industry,
    subIndustries: projectData.sub_industries || [],
    companySize: projectData.company_size,
    assessmentScores: assessment.scores,
  };

  // 각 후보에 대해 점수 계산
  const scoredCandidates: CandidateScore[] = candidatesWithProfile
    .map((candidate) => {
      const profile = candidate.consultant_profile[0] as ConsultantProfile;
      return calculateMatchingScore(candidate.id, profile, criteria);
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topN);

  // 기존 추천 삭제
  await supabase.from('matching_recommendations').delete().eq('project_id', projectId);

  // 새 추천 저장
  const recommendations = scoredCandidates.map((candidate, index) => ({
    project_id: projectId,
    candidate_user_id: candidate.userId,
    total_score: candidate.totalScore,
    score_breakdown: candidate.breakdown,
    rationale: candidate.rationale,
    rank: index + 1,
  }));

  const { error: insertError } = await supabase
    .from('matching_recommendations')
    .insert(recommendations);

  if (insertError) {
    throw new Error(`매칭 추천 저장 실패: ${insertError.message}`);
  }

  // 프로젝트 상태 업데이트 (preserveStatus가 false이거나 아직 DIAGNOSED 상태일 때만)
  if (!preserveStatus) {
    // 현재 상태 확인
    const { data: currentProject } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

    // DIAGNOSED 상태일 때만 MATCH_RECOMMENDED로 변경
    // 이미 ASSIGNED 이상이면 상태 유지
    if (currentProject?.status === 'DIAGNOSED' || currentProject?.status === 'NEW') {
      await supabase.from('projects').update({ status: 'MATCH_RECOMMENDED' }).eq('id', projectId);
    }
  }

  // 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'MATCHING_EXECUTE',
    targetType: 'project',
    targetId: projectId,
    meta: {
      top_n: topN,
      candidates_count: scoredCandidates.length,
      top_candidate: scoredCandidates[0]?.userId,
      is_recalculation: preserveStatus,
    },
  });

  return scoredCandidates;
}

/**
 * 매칭 점수 계산
 */
function calculateMatchingScore(
  userId: string,
  profile: ConsultantProfile,
  criteria: MatchingCriteria
): CandidateScore {
  const breakdown: CandidateScore['breakdown'] = [];
  let totalScore = 0;
  const maxTotal = 100;

  // 1. 업종 적합성 (20점)
  const industryScore = calculateIndustryScore(profile.available_industries, criteria.industry);
  breakdown.push({
    criteria: '업종 적합성',
    score: industryScore,
    maxScore: 20,
    explanation: profile.available_industries.includes(criteria.industry)
      ? `${criteria.industry} 업종 경험 있음`
      : '해당 업종 직접 경험 없음',
  });
  totalScore += industryScore;

  // 1-1. 세부 업종 적합성 (5점)
  const subIndustryScore = calculateSubIndustryScore(
    profile.sub_industries || [],
    criteria.subIndustries
  );
  breakdown.push({
    criteria: '세부 업종 적합성',
    score: subIndustryScore.score,
    maxScore: 5,
    explanation: subIndustryScore.explanation,
  });
  totalScore += subIndustryScore.score;

  // 2. 전문분야 일치도 (20점)
  const expertiseScore = calculateExpertiseScore(profile.expertise_domains);
  breakdown.push({
    criteria: '전문분야 일치도',
    score: expertiseScore.score,
    maxScore: 20,
    explanation: expertiseScore.explanation,
  });
  totalScore += expertiseScore.score;

  // 3. 역량 태그 매칭 (20점)
  const skillScore = calculateSkillScore(profile.skill_tags, criteria.assessmentScores);
  breakdown.push({
    criteria: '역량 매칭',
    score: skillScore.score,
    maxScore: 20,
    explanation: skillScore.explanation,
  });
  totalScore += skillScore.score;

  // 4. 강의 레벨 적합성 (15점)
  const levelScore = calculateLevelScore(profile.teaching_levels);
  breakdown.push({
    criteria: '강의 레벨 적합성',
    score: levelScore.score,
    maxScore: 15,
    explanation: levelScore.explanation,
  });
  totalScore += levelScore.score;

  // 5. 경력/가용성 (20점)
  const experienceScore = calculateExperienceScore(profile.years_of_experience);
  breakdown.push({
    criteria: '경력/가용성',
    score: experienceScore.score,
    maxScore: 20,
    explanation: experienceScore.explanation,
  });
  totalScore += experienceScore.score;

  // 종합 근거 생성
  const rationale = generateRationale(breakdown, profile);

  return {
    userId,
    totalScore: Math.round((totalScore / maxTotal) * 100) / 100,
    breakdown,
    rationale,
  };
}

function calculateIndustryScore(industries: string[], targetIndustry: string): number {
  // 정확히 일치하는 업종이 있으면 만점
  if (industries.includes(targetIndustry)) {
    return 20;
  }

  // 관련 업종이 있으면 부분 점수
  const related = RELATED_INDUSTRIES[targetIndustry] || [];
  if (industries.some((i) => related.includes(i))) {
    return 12;
  }

  return 4;
}

function calculateSubIndustryScore(
  consultantSubIndustries: string[],
  projectSubIndustries: string[]
): ScoreResult {
  // 프로젝트에 세부 업종이 없으면 기본 점수 부여
  if (projectSubIndustries.length === 0) {
    return { score: 3, explanation: '기업 세부 업종 미지정' };
  }

  // 컨설턴트에 세부 업종이 없으면 낮은 점수
  if (consultantSubIndustries.length === 0) {
    return { score: 1, explanation: '컨설턴트 세부 업종 미지정' };
  }

  // 대소문자 무시 비교를 위한 정규화
  const normalizedProject = projectSubIndustries.map((p) => p.toLowerCase());

  // 정확히 일치하는 세부 업종 찾기
  const exactMatches = consultantSubIndustries.filter((ci) =>
    normalizedProject.includes(ci.toLowerCase())
  );

  if (exactMatches.length > 0) {
    return { score: 5, explanation: `세부 업종 일치: ${exactMatches.join(', ')}` };
  }

  // 부분 일치 (키워드 포함) 찾기
  const partialMatches = consultantSubIndustries.filter((ci) => {
    const ciLower = ci.toLowerCase();
    return normalizedProject.some(
      (pi) => pi.includes(ciLower) || ciLower.includes(pi)
    );
  });

  if (partialMatches.length > 0) {
    return { score: 3, explanation: `세부 업종 유사: ${partialMatches.join(', ')}` };
  }

  return { score: 1, explanation: '세부 업종 일치 없음' };
}

function calculateExpertiseScore(domains: string[]): ScoreResult {
  const score = Math.min(20, domains.length * 4);
  const domainSummary = domains.length > 3
    ? `${domains.slice(0, 3).join(', ')} 등`
    : domains.join(', ');
  return {
    score,
    explanation: `${domains.length}개 전문분야 보유 (${domainSummary})`,
  };
}

function calculateSkillScore(
  skills: string[],
  assessmentScores: SelfAssessmentScore
): ScoreResult {
  // 자가진단 점수가 낮은 영역과 매칭되는 스킬 확인
  const lowScoreDimensions = assessmentScores.dimension_scores
    ?.filter((d) => d.score / d.max_score < 0.6)
    .map((d) => d.dimension) || [];

  // 스킬과 차원 매핑 (새로운 스킬 태그 반영)
  const skillDimensionMap: Record<string, string[]> = {
    // AI 도구 관련
    '생성형 AI 활용 (ChatGPT, Claude, Gemini 등)': ['AI 활용 현황'],
    '프롬프트 엔지니어링': ['AI 활용 현황'],
    'AI 코딩 도구 (클로드코드, 코덱스, 안티그래비티, 커서AI 등)': ['AI 활용 현황'],
    '협업 도구 AI 활용 (Notion AI, Copilot for M365, Slack AI 등)': ['AI 활용 현황', '업무 프로세스'],
    'AI 디자인 도구 활용 (Midjourney, Canva AI, Figma AI 등)': ['AI 활용 현황'],
    // 데이터/프로세스 관련
    '데이터 수집/정제': ['데이터 활용'],
    '데이터 시각화': ['데이터 활용'],
    '업무 자동화 (RPA/노코드)': ['업무 프로세스'],
    '워크플로우 설계': ['업무 프로세스'],
    '프로세스 개선': ['업무 프로세스'],
    '문서/보고서 작성': ['업무 프로세스'],
    '품질/통계 분석': ['데이터 활용'],
    // 조직/전략 관련
    '변화관리/내재화': ['조직 역량'],
    'AI 전략/거버넌스': ['조직 역량', 'AI 활용 현황'],
    '보안/컴플라이언스': ['조직 역량'],
  };

  let matchCount = 0;
  for (const skill of skills) {
    const relatedDimensions = skillDimensionMap[skill] || [];
    if (relatedDimensions.some((d) => lowScoreDimensions.includes(d))) {
      matchCount++;
    }
  }

  const score = Math.min(20, matchCount * 4 + skills.length);
  return {
    score,
    explanation: `${skills.length}개 역량 보유, 약점 영역 ${matchCount}개 매칭`,
  };
}

function calculateLevelScore(levels: string[]): ScoreResult {
  const score = Math.min(15, levels.length * 4);
  const levelLabels = levels.map((l) => LEVEL_LABEL_MAP[l] || l);
  return {
    score,
    explanation: `${levelLabels.join(', ')} 레벨 강의 가능`,
  };
}

function calculateExperienceScore(years: number): ScoreResult {
  if (years >= 10) {
    return { score: 20, explanation: `${years}년 경력 (시니어급)` };
  }
  if (years >= 5) {
    return { score: 15, explanation: `${years}년 경력 (중급)` };
  }
  if (years >= 2) {
    return { score: 10, explanation: `${years}년 경력 (주니어급)` };
  }
  return { score: 5, explanation: `${years}년 경력` };
}

function generateRationale(
  breakdown: CandidateScore['breakdown'],
  profile: ConsultantProfile
): string {
  const topStrengths = breakdown
    .filter((b) => b.score / b.maxScore >= 0.7)
    .map((b) => b.criteria);

  const weaknesses = breakdown
    .filter((b) => b.score / b.maxScore < 0.5)
    .map((b) => b.criteria);

  let rationale = '';

  if (topStrengths.length > 0) {
    rationale += `강점: ${topStrengths.join(', ')}. `;
  }

  if (weaknesses.length > 0) {
    rationale += `보완 필요: ${weaknesses.join(', ')}. `;
  }

  if (profile.strengths_constraints) {
    rationale += `특이사항: ${profile.strengths_constraints.substring(0, 100)}`;
    if (profile.strengths_constraints.length > 100) {
      rationale += '...';
    }
  }

  return rationale || '추가 분석 정보 없음';
}
