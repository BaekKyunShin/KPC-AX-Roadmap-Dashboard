import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SelfAssessmentScore } from '@/types/database';
import { validateStatusTransition } from '@/lib/constants/status';
import type { LLMValidatorResult } from '../llm';

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

/**
 * LLM 매칭 응답 런타임 검증 스키마 (ISSUE-06).
 * strengths·considerations 는 LLM 이 누락해도 빈 배열 기본값으로 보완한다 —
 * 최상위 recommendations 배열이 누락된 경우만 실패로 처리.
 */
export const llmMatchingResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      userId: z.string(),
      // 0~100 범위 — 후속 clamp 는 그대로 유지하되 validator 단계에서 1차 차단
      score: z.number().min(0).max(100),
      analysis: z.string(),
      strengths: z.array(z.string()).default([]),
      considerations: z.array(z.string()).default([]),
    })
  ),
});

/** callLLMForJSON validator 로 그대로 전달할 수 있는 어댑터 */
export function validateLlmMatchingResponse(raw: unknown): LLMValidatorResult<LLMMatchingResponse> {
  const result = llmMatchingResponseSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
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
    throw new Error(
      '컨설턴트 프로필이 등록되지 않았습니다. 컨설턴트가 프로필을 먼저 작성해야 합니다.'
    );
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
    throw new Error(
      '컨설턴트 프로필이 등록되지 않았습니다. 컨설턴트가 프로필을 먼저 작성해야 합니다.'
    );
  }

  return {
    projectData,
    assessmentScores: assessment.scores as SelfAssessmentScore,
    candidatesWithProfile,
    nameMap,
  };
}

/** save_matching_recommendations RPC 반환 타입 (판별 유니온) */
type SaveMatchingRecommendationsRpcResult =
  | { success: true; inserted_count: number }
  | { success: false; error: string };

/**
 * 추천 결과 저장 + (필요 시) 상태 전이 — 단일 트랜잭션 RPC (마이그 081).
 *
 * 예전에는 기존 추천 DELETE → 신규 INSERT → status UPDATE 가 각각 별도 쿼리였다.
 * 그래서 (1) INSERT 가 실패하면 기존 추천이 사라진 채로 남고 (2) status 전이만
 * 실패하면 "추천은 저장됐는데 목록 상태는 그대로"인 desync 가 생겼다. 원자화로 둘 다 차단한다.
 *
 * @param transitionToStatus 전이할 목표 상태. null 이면 상태를 건드리지 않는다
 *   (재계산 경로). 전이 가능 여부 판정은 resolveMatchRecommendedTransition 이 담당한다.
 */
export async function saveRecommendations(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string,
  candidates: LLMCandidateScore[],
  transitionToStatus: 'MATCH_RECOMMENDED' | null = null
) {
  const recommendations = candidates.map((candidate, index) => ({
    project_id: projectId,
    candidate_user_id: candidate.userId,
    total_score: candidate.totalScore,
    score_breakdown: [],
    rationale: candidate.rationale,
    rank: index + 1,
  }));

  const { data, error } = await supabase.rpc('save_matching_recommendations', {
    p_project_id: projectId,
    p_recommendations: recommendations,
    p_transition_to_status: transitionToStatus,
  });

  const result = (data ?? null) as SaveMatchingRecommendationsRpcResult | null;
  if (error || !result?.success) {
    const detail = error?.message ?? (result && !result.success ? result.error : 'unknown');
    throw new Error(`매칭 추천 저장 실패: ${detail}`);
  }
}

/**
 * 추천 저장과 함께 반영할 상태 전이를 판정한다 (전이 불가면 null).
 * 전이 규칙의 단일 출처는 validateStatusTransition 이며, 실제 반영은
 * saveRecommendations 의 RPC 안에서 추천 저장과 원자적으로 이루어진다.
 */
export async function resolveMatchRecommendedTransition(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string
): Promise<'MATCH_RECOMMENDED' | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if (project?.status && validateStatusTransition(project.status, 'MATCH_RECOMMENDED')) {
    return 'MATCH_RECOMMENDED';
  }
  return null;
}
