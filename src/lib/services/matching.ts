import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from './audit';
import type { ConsultantProfile, SelfAssessmentScore } from '@/types/database';

interface MatchingCriteria {
  industry: string;
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
    .select('industry, company_size')
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

  // 1. 업종 적합성 (25점)
  const industryScore = calculateIndustryScore(profile.available_industries, criteria.industry);
  breakdown.push({
    criteria: '업종 적합성',
    score: industryScore,
    maxScore: 25,
    explanation: profile.available_industries.includes(criteria.industry)
      ? `${criteria.industry} 업종 경험 있음`
      : '해당 업종 직접 경험 없음',
  });
  totalScore += industryScore;

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
  if (industries.includes(targetIndustry)) {
    return 25;
  }
  // 관련 업종이 있으면 부분 점수
  const relatedIndustries: Record<string, string[]> = {
    '제조업': ['유통/물류', 'IT/소프트웨어'],
    '서비스업': ['유통/물류', '금융/보험'],
    '유통/물류': ['제조업', '서비스업'],
    'IT/소프트웨어': ['제조업', '서비스업'],
  };

  const related = relatedIndustries[targetIndustry] || [];
  if (industries.some((i) => related.includes(i))) {
    return 15;
  }
  return 5;
}

function calculateExpertiseScore(
  domains: string[]
): { score: number; explanation: string } {
  // 다양한 전문분야 보유 시 가점
  const score = Math.min(20, domains.length * 4);
  return {
    score,
    explanation: `${domains.length}개 전문분야 보유 (${domains.slice(0, 3).join(', ')}${domains.length > 3 ? ' 등' : ''})`,
  };
}

function calculateSkillScore(
  skills: string[],
  assessmentScores: SelfAssessmentScore
): { score: number; explanation: string } {
  // 자가진단 점수가 낮은 영역과 매칭되는 스킬 확인
  const lowScoreDimensions = assessmentScores.dimension_scores
    ?.filter((d) => d.score / d.max_score < 0.6)
    .map((d) => d.dimension) || [];

  // 스킬과 차원 매핑
  const skillDimensionMap: Record<string, string[]> = {
    '데이터 전처리': ['데이터 활용'],
    '업무자동화': ['업무 프로세스'],
    'AI 도구 활용': ['AI 활용 현황'],
    '프로세스 개선': ['업무 프로세스'],
    '교육/코칭': ['조직 역량'],
  };

  let matchCount = 0;
  for (const skill of skills) {
    const relatedDimensions = skillDimensionMap[skill] || [];
    if (relatedDimensions.some((d) => lowScoreDimensions.includes(d))) {
      matchCount++;
    }
  }

  const score = Math.min(20, matchCount * 5 + skills.length * 2);
  return {
    score,
    explanation: `${skills.length}개 역량 보유, 약점 영역 ${matchCount}개 매칭`,
  };
}

function calculateLevelScore(
  levels: string[]
): { score: number; explanation: string } {
  // 다양한 레벨 커버 가능 시 가점
  const score = Math.min(15, levels.length * 5);
  const levelLabels = levels.map((l) =>
    l === 'BEGINNER' ? '초급' : l === 'INTERMEDIATE' ? '중급' : '고급'
  );
  return {
    score,
    explanation: `${levelLabels.join(', ')} 레벨 강의 가능`,
  };
}

function calculateExperienceScore(
  years: number
): { score: number; explanation: string } {
  let score: number;
  let explanation: string;

  if (years >= 10) {
    score = 20;
    explanation = `${years}년 경력 (시니어급)`;
  } else if (years >= 5) {
    score = 15;
    explanation = `${years}년 경력 (중급)`;
  } else if (years >= 2) {
    score = 10;
    explanation = `${years}년 경력 (주니어급)`;
  } else {
    score = 5;
    explanation = `${years}년 경력`;
  }

  return { score, explanation };
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
