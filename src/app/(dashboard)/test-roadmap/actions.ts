'use server';

import { after } from 'next/server';
import { requireAuthWithRole, type SupabaseServerClient } from '@/lib/actions/auth-helpers';
import {
  generateTestRoadmap,
  reviseTestRoadmap as reviseTestRoadmapService,
  type RoadmapResult,
  type ValidationResult,
  type TestRoadmapInput,
} from '@/lib/services/roadmap';
import { createAuditLog } from '@/lib/services/audit';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

// =============================================================================
// 상수
// =============================================================================

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/** abort 레지스트리 키 생성 */
function abortKey(userId: string) {
  return `test-roadmap:${userId}`;
}

// =============================================================================
// 헬퍼 함수
// =============================================================================

async function fetchConsultantProfile(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data } = await supabase
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

/**
 * 입력 검증 (OFA-11: 산인공 양식 1번 신규 스키마 직접 사용 — legacy 변환 제거)
 */
function validateInput(input: TestRoadmapInput): string | null {
  if (!input.company_name || input.company_name.trim().length < 2) {
    return '회사명을 2자 이상 입력하세요.';
  }
  if (!input.industry) return '업종을 선택하세요.';
  if (!input.company_size) return '기업 규모를 선택하세요.';
  if (!input.interview_date) return '인터뷰 날짜를 입력하세요.';
  if (!input.participants?.length) return '최소 1명 이상의 참석자를 입력하세요.';
  if (input.participants.some((p) => !p.name || p.name.trim() === '')) {
    return '참석자 이름을 입력하세요.';
  }
  if (
    !input.company_requirements?.company_status ||
    !input.company_requirements.main_problems ||
    !input.company_requirements.push_willingness ||
    !input.company_requirements.expected_outcomes
  ) {
    return '기업 요구분석 4필드를 모두 입력하세요.';
  }
  if (!input.task_workflow_items?.length) {
    return '최소 1개 이상의 과업·워크플로우 항목을 입력하세요.';
  }
  if (!input.training_targets?.length) {
    return '최소 1개 이상의 훈련대상 과업을 입력하세요.';
  }
  return null;
}

// =============================================================================
// Server Action — createTestRoadmap
// =============================================================================

/**
 * 로드맵 테스트 생성 (DB 저장 없이 LLM 결과만 반환)
 *
 * OFA-11 재작성: TestRoadmapInput(산인공 양식 1번 신규 스키마) 직접 수용.
 * 이전에는 legacy `TestInputData` → `convertToRoadmapInput` 변환이 있었으나 제거됨.
 */
export async function createTestRoadmap(
  input: TestRoadmapInput,
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const validationError = validateInput(input);
  if (validationError) return { success: false, error: validationError };

  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);
    const roadmapResult = await generateTestRoadmap(
      input,
      auth.user.id,
      consultantProfile,
      undefined,
      abortController.signal,
    );

    after(async () => {
      await createAuditLog({
        actorUserId: auth.user.id,
        action: 'TEST_ROADMAP_CREATE',
        targetType: 'roadmap',
        targetId: 'test-mode',
        meta: {
          company_name: input.company_name,
          industry: input.industry,
          is_test_mode: true,
          no_db_save: true,
        },
      });
    });

    return {
      success: true,
      data: {
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[createTestRoadmap Error]', error);
    return { success: false, error: getLLMUserFriendlyError(error) };
  } finally {
    cleanupAbort(abortKey(auth.user.id));
  }
}

// =============================================================================
// Server Action — reviseTestRoadmap
// =============================================================================

export async function reviseTestRoadmap(
  input: TestRoadmapInput,
  previousResult: RoadmapResult,
  revisionPrompt: string,
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  if (!revisionPrompt || revisionPrompt.trim() === '') {
    return { success: false, error: '수정 요청 내용을 입력해주세요.' };
  }

  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);
    const roadmapResult = await reviseTestRoadmapService(
      input,
      previousResult,
      revisionPrompt,
      auth.user.id,
      consultantProfile,
      abortController.signal,
    );

    after(async () => {
      await createAuditLog({
        actorUserId: auth.user.id,
        action: 'TEST_ROADMAP_REVISE',
        targetType: 'roadmap',
        targetId: 'test-mode',
        meta: {
          company_name: input.company_name,
          industry: input.industry,
          is_test_mode: true,
          no_db_save: true,
          revision_prompt: revisionPrompt.substring(0, 200),
        },
      });
    });

    return {
      success: true,
      data: {
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[reviseTestRoadmap Error]', error);
    return { success: false, error: getLLMUserFriendlyError(error) };
  } finally {
    cleanupAbort(abortKey(auth.user.id));
  }
}

// =============================================================================
// Server Action — cancel
// =============================================================================

export async function cancelTestRoadmapGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}
