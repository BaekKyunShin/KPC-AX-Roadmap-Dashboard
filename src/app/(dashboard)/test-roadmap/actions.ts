'use server';

import { after } from 'next/server';
import { requireAuthWithRole, type SupabaseServerClient } from '@/lib/actions/auth-helpers';
import { testInputSchema, type TestInputData } from '@/lib/schemas/test-roadmap';
import {
  generateTestRoadmap,
  reviseTestRoadmap as reviseTestRoadmapService,
  type RoadmapResult,
  type ValidationResult,
} from '@/lib/services/roadmap';
import { createAuditLog } from '@/lib/services/audit';
import { extractInsightsFromStt, validateSttTextSize } from '@/lib/services/stt';
import type { SttInsights } from '@/lib/schemas/interview';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

// =============================================================================
// 상수
// =============================================================================

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/** abort 레지스트리 키 생성 */
function abortKey(userId: string) { return `test-roadmap:${userId}`; }

// =============================================================================
// 헬퍼 함수
// =============================================================================

/**
 * 컨설턴트 프로필 조회
 */
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
 * TestInputData를 roadmap 서비스용 데이터로 변환
 */
function convertToRoadmapInput(input: TestInputData) {
  return {
    company_name: input.company_name,
    industry: input.industry,
    sub_industries: input.sub_industries,
    company_size: input.company_size,
    // 인터뷰 데이터
    interview_date: input.interview_date,
    participants: input.participants,
    company_details: input.company_details,
    job_tasks: input.job_tasks.map((task, index) => ({
      id: task.id || `test-task-${index}`,
      task_name: task.task_name,
      task_description: task.task_description,
    })),
    pain_points: input.pain_points.map((point, index) => ({
      id: point.id || `test-pain-${index}`,
      description: point.description,
      severity: point.severity,
      related_task_ids: point.related_task_ids || [],
    })),
    constraints: input.constraints?.map((constraint, index) => ({
      id: constraint.id || `test-constraint-${index}`,
      type: constraint.type,
      description: constraint.description,
      severity: constraint.severity,
      workaround: constraint.workaround || '',
    })) || [],
    improvement_goals: input.improvement_goals.map((goal, index) => ({
      id: goal.id || `test-goal-${index}`,
      goal_description: goal.goal_description,
      kpi: goal.kpi || '',
      measurement_method: goal.measurement_method || '',
      target_value: goal.target_value || '',
      before_value: goal.before_value || '',
      related_task_ids: goal.related_task_ids || [],
    })),
    notes: input.notes || '',
    customer_requirements: input.customer_requirements || '',
  };
}

// =============================================================================
// Server Action
// =============================================================================

/**
 * 테스트 로드맵 생성 (DB 저장 없이 LLM 결과만 반환)
 */
export async function createTestRoadmap(
  input: TestInputData
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  // 1. 사용자 인증/역할 검증
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) {
    return { success: false, error: auth.error };
  }

  // 2. 입력 검증
  const inputValidation = testInputSchema.safeParse(input);
  if (!inputValidation.success) {
    return { success: false, error: inputValidation.error.errors[0].message };
  }

  // 취소 가능하도록 AbortController 등록
  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    // 3. 컨설턴트 프로필 조회
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);

    // 4. STT 인사이트 추출 (텍스트가 있는 경우)
    let sttInsights: SttInsights | undefined;
    if (input.stt_text) {
      const sizeValidation = validateSttTextSize(input.stt_text);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }
      sttInsights = await extractInsightsFromStt(input.stt_text);
    }

    // 5. 데이터 변환 및 로드맵 생성
    const roadmapInput = convertToRoadmapInput(input);
    const roadmapResult = await generateTestRoadmap(
      roadmapInput,
      auth.user.id,
      consultantProfile,
      sttInsights,
      abortController.signal
    );

    // 6. 감사로그 (응답 차단 방지를 위해 after()로 지연)
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
          has_stt_insights: !!sttInsights,
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
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  } finally {
    cleanupAbort(abortKey(auth.user.id));
  }
}

/**
 * 테스트 로드맵 수정 요청 (DB 저장 없이 LLM 결과만 반환)
 */
export async function reviseTestRoadmap(
  input: TestInputData,
  previousResult: RoadmapResult,
  revisionPrompt: string
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  // 1. 사용자 인증/역할 검증
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) {
    return { success: false, error: auth.error };
  }

  // 2. 수정 요청 검증
  if (!revisionPrompt || revisionPrompt.trim() === '') {
    return { success: false, error: '수정 요청 내용을 입력해주세요.' };
  }

  // 취소 가능하도록 AbortController 등록
  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    // 3. 컨설턴트 프로필 조회
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);

    // 4. 데이터 변환 및 로드맵 수정 요청
    const roadmapInput = convertToRoadmapInput(input);
    const roadmapResult = await reviseTestRoadmapService(
      roadmapInput,
      previousResult,
      revisionPrompt,
      auth.user.id,
      consultantProfile,
      abortController.signal
    );

    // 5. 감사로그 (응답 차단 방지를 위해 after()로 지연)
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
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  } finally {
    cleanupAbort(abortKey(auth.user.id));
  }
}

/**
 * 진행 중인 테스트 로드맵 생성 취소
 */
export async function cancelTestRoadmapGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}
