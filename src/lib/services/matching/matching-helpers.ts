import { createAdminClient } from '@/lib/supabase/admin';
import type { SelfAssessmentScore } from '@/types/database';

/** LLM 매칭 후보 점수 */
export interface LLMCandidateScore {
  userId: string;
  totalScore: number;
  rationale: LLMMatchingRationale;
}

/** LLM 기반 매칭 추천 근거 */
export interface LLMMatchingRationale {
  analysis: string;
  strengths: string[];
  considerations: string[];
}

/** 매칭 옵션 */
export interface MatchingOptions {
  topN?: number;
  preserveStatus?: boolean;
}

/** LLM 응답 타입 */
export interface LLMMatchingResponse {
  recommendations: {
    userId: string;
    score: number;
    analysis: string;
    strengths: string[];
    considerations: string[];
  }[];
}

/** LLM 응답 제한 */
export const LLM_LIMITS = {
  MAX_STRENGTHS: 3,
  MAX_CONSIDERATIONS: 2,
} as const;

/** 교육 레벨 라벨 매핑 */
export const LEVEL_LABEL_MAP: Record<string, string> = {
  BEGINNER: '입문',
  INTERMEDIATE: '실무',
  ADVANCED: '심화',
  LEADER: '리더',
};

/** LLM 응답에서 유효한 후보 ID만 필터링 (hallucinated ID 방지) */
export function filterValidRecommendations(
  recommendations: LLMMatchingResponse['recommendations'],
  validCandidateIds: string[]
): LLMMatchingResponse['recommendations'] {
  const validIdSet = new Set(validCandidateIds);
  return recommendations.filter((rec) => validIdSet.has(rec.userId));
}

/** 매칭에 필요한 데이터 조회 */
export async function fetchMatchingData(
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
export async function saveRecommendations(
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
export async function updateProjectStatusIfNeeded(
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
