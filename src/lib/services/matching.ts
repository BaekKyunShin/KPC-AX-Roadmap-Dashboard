import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from './audit';
import { callLLMForJSON } from './llm';
import type { ConsultantProfile, SelfAssessmentScore } from '@/types/database';

// ============================================================================
// 타입 정의
// ============================================================================

/** 매칭 옵션 */
interface MatchingOptions {
  topN?: number;
  preserveStatus?: boolean;
}

/** LLM 기반 매칭 추천 근거 */
export interface LLMMatchingRationale {
  analysis: string;
  strengths: string[];
  considerations: string[];
}

/** LLM 매칭 후보 점수 */
interface LLMCandidateScore {
  userId: string;
  totalScore: number;
  rationale: LLMMatchingRationale;
}

/** LLM 응답 타입 */
interface LLMMatchingResponse {
  recommendations: {
    userId: string;
    score: number;
    analysis: string;
    strengths: string[];
    considerations: string[];
  }[];
}

/** 레거시: 매칭 추천 근거 */
export interface MatchingRationale {
  strengths: string[];
  improvements: string[];
  consultantNote?: string;
}

// ============================================================================
// 상수
// ============================================================================

/** LLM 응답 제한 */
const LLM_LIMITS = {
  MAX_STRENGTHS: 3,
  MAX_CONSIDERATIONS: 2,
} as const;

/** 교육 레벨 라벨 매핑 */
const LEVEL_LABEL_MAP: Record<string, string> = {
  BEGINNER: '입문',
  INTERMEDIATE: '실무',
  ADVANCED: '심화',
  LEADER: '리더',
};

// ============================================================================
// LLM 기반 매칭 (현재 사용)
// ============================================================================

/**
 * LLM 기반 매칭 추천 생성
 * AI가 프로젝트 요구사항과 컨설턴트 프로필을 종합 분석하여 최적의 매칭 추천
 */
export async function generateLLMMatchingRecommendations(
  projectId: string,
  actorUserId: string,
  options: MatchingOptions = {}
): Promise<LLMCandidateScore[]> {
  const { topN = 3, preserveStatus = false } = options;
  const supabase = createAdminClient();

  // 1. 데이터 조회
  const { projectData, assessmentScores, candidatesWithProfile, nameMap } =
    await fetchMatchingData(supabase, projectId);

  // 2. LLM 프롬프트 구성 및 호출
  const llmResponse = await callLLMForJSON<LLMMatchingResponse>(
    [
      { role: 'system', content: buildLLMSystemPrompt() },
      { role: 'user', content: buildLLMUserPrompt(projectData, assessmentScores, candidatesWithProfile) },
    ],
    { temperature: 0.3, maxTokens: 4000 }
  );

  // 3. LLM 응답 변환
  const scoredCandidates: LLMCandidateScore[] = llmResponse.recommendations
    .slice(0, topN)
    .map((rec) => ({
      userId: rec.userId,
      totalScore: Math.max(0, Math.min(100, rec.score)),
      rationale: {
        analysis: rec.analysis,
        strengths: rec.strengths.slice(0, LLM_LIMITS.MAX_STRENGTHS),
        considerations: rec.considerations.slice(0, LLM_LIMITS.MAX_CONSIDERATIONS),
      },
    }));

  // 4. 추천 저장
  await saveRecommendations(supabase, projectId, scoredCandidates);

  // 5. 프로젝트 상태 업데이트
  if (!preserveStatus) {
    await updateProjectStatusIfNeeded(supabase, projectId);
  }

  // 6. 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'MATCHING_EXECUTE',
    targetType: 'project',
    targetId: projectId,
    meta: {
      top_n: topN,
      candidates_count: scoredCandidates.length,
      top_candidate: scoredCandidates[0]?.userId,
      top_candidate_name: nameMap.get(scoredCandidates[0]?.userId) || '',
      is_recalculation: preserveStatus,
      matching_type: 'LLM',
    },
  });

  return scoredCandidates;
}

// ============================================================================
// LLM 매칭 헬퍼 함수
// ============================================================================

/** 매칭에 필요한 데이터 조회 */
async function fetchMatchingData(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string
) {
  // 프로젝트 정보 조회
  const { data: projectData } = await supabase
    .from('projects')
    .select('industry, sub_industries, company_size, company_name')
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
    .select('id, name')
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (!candidates || candidates.length === 0) {
    throw new Error('활성화된 컨설턴트가 없습니다. 컨설턴트를 먼저 등록해주세요.');
  }

  // 컨설턴트 프로필 조회
  const candidateIds = candidates.map((c) => c.id);
  const { data: profiles } = await supabase
    .from('consultant_profiles')
    .select('*')
    .in('user_id', candidateIds);

  if (!profiles || profiles.length === 0) {
    throw new Error('컨설턴트 프로필이 등록되지 않았습니다. 컨설턴트가 프로필을 먼저 작성해야 합니다.');
  }

  // 프로필 매핑
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const nameMap = new Map(candidates.map((c) => [c.id, c.name]));

  const candidatesWithProfile = candidates
    .filter((c) => profileMap.has(c.id))
    .map((c) => ({
      userId: c.id,
      name: c.name,
      profile: profileMap.get(c.id)!,
    }));

  if (candidatesWithProfile.length === 0) {
    throw new Error('컨설턴트 프로필이 등록되지 않았습니다. 컨설턴트가 프로필을 먼저 작성해야 합니다.');
  }

  return {
    projectData,
    assessmentScores: assessment.scores as SelfAssessmentScore,
    candidatesWithProfile,
    nameMap,
  };
}

/** 추천 결과 저장 */
async function saveRecommendations(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string,
  candidates: LLMCandidateScore[]
) {
  // 기존 추천 삭제
  await supabase.from('matching_recommendations').delete().eq('project_id', projectId);

  // 새 추천 저장
  const recommendations = candidates.map((candidate, index) => ({
    project_id: projectId,
    candidate_user_id: candidate.userId,
    total_score: candidate.totalScore,
    score_breakdown: [],
    rationale: candidate.rationale,
    rank: index + 1,
  }));

  const { error } = await supabase.from('matching_recommendations').insert(recommendations);

  if (error) {
    throw new Error(`매칭 추천 저장 실패: ${error.message}`);
  }
}

/** 프로젝트 상태 업데이트 (필요 시) */
async function updateProjectStatusIfNeeded(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string
) {
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if (project?.status === 'DIAGNOSED' || project?.status === 'NEW') {
    await supabase.from('projects').update({ status: 'MATCH_RECOMMENDED' }).eq('id', projectId);
  }
}

/** LLM 시스템 프롬프트 */
function buildLLMSystemPrompt(): string {
  return `당신은 기업 AI 교육 컨설턴트 매칭 전문가입니다.
기업의 현황과 요구사항을 분석하고, 가장 적합한 컨설턴트를 추천해야 합니다.

## 평가 기준
1. **업종 적합성**: 컨설턴트가 해당 업종 경험이 있는지
2. **전문분야 일치**: 기업이 필요로 하는 AI 역량과 컨설턴트 전문분야의 일치도
3. **역량 매칭**: 기업의 자가진단 결과에서 부족한 영역을 보완할 수 있는지
4. **강의 레벨**: 기업 수준에 맞는 교육이 가능한지
5. **경력 및 가용성**: 충분한 경력과 현재 투입 가능 여부

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "recommendations": [
    {
      "userId": "컨설턴트 ID",
      "score": 85,
      "analysis": "2-3문장의 종합 분석. 왜 이 컨설턴트가 적합한지 구체적으로 설명.",
      "strengths": ["강점1", "강점2", "강점3"],
      "considerations": ["고려사항1", "고려사항2"]
    }
  ]
}

## 주의사항
- 점수는 0-100 사이의 정수로 부여
- TOP 3만 선정하여 점수 순으로 정렬
- analysis는 자연스러운 한국어 문장으로 작성
- strengths는 2-3개, considerations는 1-2개로 제한
- 모든 텍스트는 한국어로 작성`;
}

/** LLM 사용자 프롬프트 */
function buildLLMUserPrompt(
  projectData: {
    industry: string;
    sub_industries: string[] | null;
    company_size: string;
    company_name: string;
  },
  assessmentScores: SelfAssessmentScore,
  candidates: {
    userId: string;
    name: string;
    profile: ConsultantProfile;
  }[]
): string {
  // 자가진단 결과 요약
  const dimensionSummary =
    assessmentScores.dimension_scores
      ?.map((d) => {
        const percentage = Math.round((d.score / d.max_score) * 100);
        const level = percentage >= 70 ? '우수' : percentage >= 50 ? '보통' : '부족';
        return `- ${d.dimension}: ${percentage}% (${level})`;
      })
      .join('\n') || '자가진단 상세 결과 없음';

  // 컨설턴트 정보 구성
  const consultantInfo = candidates
    .map((c) => {
      const p = c.profile;
      return `### 컨설턴트: ${c.name} (ID: ${c.userId})
- 업종 경험: ${p.available_industries?.join(', ') || '미지정'}
- 세부 업종: ${p.sub_industries?.join(', ') || '미지정'}
- 전문분야: ${p.expertise_domains?.join(', ') || '미지정'}
- 역량 태그: ${p.skill_tags?.join(', ') || '미지정'}
- 강의 레벨: ${p.teaching_levels?.map((l) => LEVEL_LABEL_MAP[l] || l).join(', ') || '미지정'}
- 경력: ${p.years_of_experience || 0}년
- 강점/제약: ${p.strengths_constraints || '없음'}`;
    })
    .join('\n\n');

  return `## 기업 정보
- 기업명: ${projectData.company_name}
- 업종: ${projectData.industry}
- 세부 업종: ${projectData.sub_industries?.join(', ') || '없음'}
- 기업 규모: ${projectData.company_size}

## 자가진단 결과
- 종합점수: ${assessmentScores.total_score || 0}점
${dimensionSummary}

## 후보 컨설턴트 목록

${consultantInfo}

---

위 정보를 바탕으로 가장 적합한 컨설턴트 TOP 3를 선정하고, 각각에 대해 점수와 분석을 제공해주세요.`;
}

// ============================================================================
// 레거시: 규칙 기반 매칭 (참고용 보존)
// ============================================================================

/** 레거시: 매칭 기준 */
interface MatchingCriteria {
  industry: string;
  subIndustries: string[];
  companySize: string;
  assessmentScores: SelfAssessmentScore;
}

/** 레거시: 점수 계산 결과 */
interface ScoreResult {
  score: number;
  explanation: string;
}

/** 레거시: 규칙 기반 점수 */
interface CandidateScore {
  userId: string;
  totalScore: number;
  breakdown: {
    criteria: string;
    score: number;
    maxScore: number;
    explanation: string;
  }[];
  rationale: MatchingRationale;
}

/** 레거시: 관련 업종 매핑 */
const RELATED_INDUSTRIES: Record<string, string[]> = {
  '제조업': ['유통/물류', 'IT/소프트웨어'],
  '서비스업': ['유통/물류', '금융/보험'],
  '유통/물류': ['제조업', '서비스업'],
  'IT/소프트웨어': ['제조업', '서비스업'],
};

/**
 * 레거시: 규칙 기반 매칭 추천 생성
 * @deprecated LLM 기반 매칭(generateLLMMatchingRecommendations) 사용 권장
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

  // 후보 컨설턴트 조회
  const { data: candidates } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (!candidates || candidates.length === 0) {
    throw new Error('활성화된 컨설턴트가 없습니다. 컨설턴트를 먼저 등록해주세요.');
  }

  // 컨설턴트 프로필 조회
  const candidateIds = candidates.map((c) => c.id);
  const { data: profiles } = await supabase
    .from('consultant_profiles')
    .select('*')
    .in('user_id', candidateIds);

  if (!profiles || profiles.length === 0) {
    throw new Error('컨설턴트 프로필이 등록되지 않았습니다.');
  }

  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

  const candidatesWithProfile = candidates
    .filter((c) => profileMap.has(c.id))
    .map((c) => ({
      ...c,
      consultant_profile: [profileMap.get(c.id)!],
    }));

  if (candidatesWithProfile.length === 0) {
    throw new Error('컨설턴트 프로필이 등록되지 않았습니다.');
  }

  const criteria: MatchingCriteria = {
    industry: projectData.industry,
    subIndustries: projectData.sub_industries || [],
    companySize: projectData.company_size,
    assessmentScores: assessment.scores,
  };

  // 점수 계산 및 정렬
  const scoredCandidates: CandidateScore[] = candidatesWithProfile
    .map((candidate) => {
      const profile = candidate.consultant_profile[0] as ConsultantProfile;
      return calculateMatchingScore(candidate.id, profile, criteria);
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topN);

  // 기존 추천 삭제 후 저장
  await supabase.from('matching_recommendations').delete().eq('project_id', projectId);

  const recommendations = scoredCandidates.map((candidate, index) => ({
    project_id: projectId,
    candidate_user_id: candidate.userId,
    total_score: candidate.totalScore,
    score_breakdown: candidate.breakdown,
    rationale: candidate.rationale,
    rank: index + 1,
  }));

  const { error: insertError } = await supabase.from('matching_recommendations').insert(recommendations);

  if (insertError) {
    throw new Error(`매칭 추천 저장 실패: ${insertError.message}`);
  }

  // 프로젝트 상태 업데이트
  if (!preserveStatus) {
    const { data: currentProject } = await supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .single();

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

/** 레거시: 매칭 점수 계산 */
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

  // 2. 세부 업종 적합성 (5점)
  const subIndustryScore = calculateSubIndustryScore(profile.sub_industries || [], criteria.subIndustries);
  breakdown.push({
    criteria: '세부 업종 적합성',
    score: subIndustryScore.score,
    maxScore: 5,
    explanation: subIndustryScore.explanation,
  });
  totalScore += subIndustryScore.score;

  // 3. 전문분야 일치도 (20점)
  const expertiseScore = calculateExpertiseScore(profile.expertise_domains);
  breakdown.push({
    criteria: '전문분야 일치도',
    score: expertiseScore.score,
    maxScore: 20,
    explanation: expertiseScore.explanation,
  });
  totalScore += expertiseScore.score;

  // 4. 역량 태그 매칭 (20점)
  const skillScore = calculateSkillScore(profile.skill_tags, criteria.assessmentScores);
  breakdown.push({
    criteria: '역량 매칭',
    score: skillScore.score,
    maxScore: 20,
    explanation: skillScore.explanation,
  });
  totalScore += skillScore.score;

  // 5. 강의 레벨 적합성 (15점)
  const levelScore = calculateLevelScore(profile.teaching_levels);
  breakdown.push({
    criteria: '강의 레벨 적합성',
    score: levelScore.score,
    maxScore: 15,
    explanation: levelScore.explanation,
  });
  totalScore += levelScore.score;

  // 6. 경력/가용성 (20점)
  const experienceScore = calculateExperienceScore(profile.years_of_experience);
  breakdown.push({
    criteria: '경력/가용성',
    score: experienceScore.score,
    maxScore: 20,
    explanation: experienceScore.explanation,
  });
  totalScore += experienceScore.score;

  const rationale = generateRationale(breakdown, profile);

  return {
    userId,
    totalScore: Math.round((totalScore / maxTotal) * 100) / 100,
    breakdown,
    rationale,
  };
}

function calculateIndustryScore(industries: string[], targetIndustry: string): number {
  if (industries.includes(targetIndustry)) return 20;
  const related = RELATED_INDUSTRIES[targetIndustry] || [];
  if (industries.some((i) => related.includes(i))) return 12;
  return 4;
}

function calculateSubIndustryScore(
  consultantSubIndustries: string[],
  projectSubIndustries: string[]
): ScoreResult {
  if (projectSubIndustries.length === 0) {
    return { score: 3, explanation: '기업 세부 업종 미지정' };
  }
  if (consultantSubIndustries.length === 0) {
    return { score: 1, explanation: '컨설턴트 세부 업종 미지정' };
  }

  const normalizedProject = projectSubIndustries.map((p) => p.toLowerCase());
  const exactMatches = consultantSubIndustries.filter((ci) =>
    normalizedProject.includes(ci.toLowerCase())
  );

  if (exactMatches.length > 0) {
    return { score: 5, explanation: `세부 업종 일치: ${exactMatches.join(', ')}` };
  }

  const partialMatches = consultantSubIndustries.filter((ci) => {
    const ciLower = ci.toLowerCase();
    return normalizedProject.some((pi) => pi.includes(ciLower) || ciLower.includes(pi));
  });

  if (partialMatches.length > 0) {
    return { score: 3, explanation: `세부 업종 유사: ${partialMatches.join(', ')}` };
  }

  return { score: 1, explanation: '세부 업종 일치 없음' };
}

function calculateExpertiseScore(domains: string[]): ScoreResult {
  const score = Math.min(20, domains.length * 4);
  const domainSummary = domains.length > 3 ? `${domains.slice(0, 3).join(', ')} 등` : domains.join(', ');
  return { score, explanation: `${domains.length}개 전문분야 보유 (${domainSummary})` };
}

function calculateSkillScore(skills: string[], assessmentScores: SelfAssessmentScore): ScoreResult {
  const lowScoreDimensions =
    assessmentScores.dimension_scores
      ?.filter((d) => d.score / d.max_score < 0.6)
      .map((d) => d.dimension) || [];

  const skillDimensionMap: Record<string, string[]> = {
    '생성형 AI 활용 (ChatGPT, Claude, Gemini 등)': ['AI 활용 현황'],
    '프롬프트 엔지니어링': ['AI 활용 현황'],
    'AI 코딩 도구 (클로드코드, 코덱스, 안티그래비티, 커서AI 등)': ['AI 활용 현황'],
    '협업 도구 AI 활용 (Notion AI, Copilot for M365, Slack AI 등)': ['AI 활용 현황', '업무 프로세스'],
    'AI 디자인 도구 활용 (Midjourney, Canva AI, Figma AI 등)': ['AI 활용 현황'],
    '데이터 수집/정제': ['데이터 활용'],
    '데이터 시각화': ['데이터 활용'],
    '업무 자동화 (RPA/노코드)': ['업무 프로세스'],
    '워크플로우 설계': ['업무 프로세스'],
    '프로세스 개선': ['업무 프로세스'],
    '문서/보고서 작성': ['업무 프로세스'],
    '품질/통계 분석': ['데이터 활용'],
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
  return { score, explanation: `${skills.length}개 역량 보유, 약점 영역 ${matchCount}개 매칭` };
}

function calculateLevelScore(levels: string[]): ScoreResult {
  const score = Math.min(15, levels.length * 4);
  const levelLabels = levels.map((l) => LEVEL_LABEL_MAP[l] || l);
  return { score, explanation: `${levelLabels.join(', ')} 레벨 강의 가능` };
}

function calculateExperienceScore(years: number): ScoreResult {
  if (years >= 10) return { score: 20, explanation: `${years}년 경력 (시니어급)` };
  if (years >= 5) return { score: 15, explanation: `${years}년 경력 (중급)` };
  if (years >= 2) return { score: 10, explanation: `${years}년 경력 (주니어급)` };
  return { score: 5, explanation: `${years}년 경력` };
}

function generateRationale(
  breakdown: CandidateScore['breakdown'],
  profile: ConsultantProfile
): MatchingRationale {
  const strengths = breakdown.filter((b) => b.score / b.maxScore >= 0.7).map((b) => b.criteria);
  const improvements = breakdown.filter((b) => b.score / b.maxScore < 0.5).map((b) => b.criteria);

  let consultantNote: string | undefined;
  if (profile.strengths_constraints) {
    consultantNote =
      profile.strengths_constraints.length > 100
        ? profile.strengths_constraints.substring(0, 100) + '...'
        : profile.strengths_constraints;
  }

  return { strengths, improvements, consultantNote };
}
