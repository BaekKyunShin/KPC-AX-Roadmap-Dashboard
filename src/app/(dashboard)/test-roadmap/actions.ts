'use server';

import { createClient } from '@/lib/supabase/server';
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
import type { SupabaseClient, User } from '@supabase/supabase-js';

// =============================================================================
// 타입 정의
// =============================================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

type TestRoadmapRole = 'CONSULTANT_APPROVED' | 'OPS_ADMIN' | 'SYSTEM_ADMIN';

interface UserAccessResult {
  success: true;
  user: User;
  supabase: SupabaseClient;
}

interface UserAccessError {
  success: false;
  error: string;
}

type ValidateUserAccessResult = UserAccessResult | UserAccessError;

// =============================================================================
// 상수
// =============================================================================

/** 테스트 로드맵 기능에 접근 가능한 역할 목록 */
const ALLOWED_ROLES: readonly TestRoadmapRole[] = [
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN',
];

const ERROR_MESSAGES = {
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  PERMISSION_DENIED: '승인된 컨설턴트 또는 운영관리자만 테스트 로드맵을 생성/수정할 수 있습니다.',
  REVISION_PROMPT_REQUIRED: '수정 요청 내용을 입력해주세요.',
  CREATE_FAILED: '로드맵 생성 중 오류가 발생했습니다.',
  REVISE_FAILED: '로드맵 수정 중 오류가 발생했습니다.',
} as const;

// =============================================================================
// 헬퍼 함수
// =============================================================================

/**
 * 역할이 테스트 로드맵 기능에 접근 가능한지 확인
 */
function isAllowedRole(role: string): role is TestRoadmapRole {
  return ALLOWED_ROLES.includes(role as TestRoadmapRole);
}

/**
 * 사용자 인증 및 역할 검증 (공통 로직)
 */
async function validateUserAccess(): Promise<ValidateUserAccessResult> {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: ERROR_MESSAGES.LOGIN_REQUIRED };
  }

  // 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || !isAllowedRole(profile.role) || profile.status !== 'ACTIVE') {
    return { success: false, error: ERROR_MESSAGES.PERMISSION_DENIED };
  }

  return { success: true, user, supabase };
}

/**
 * 컨설턴트 프로필 조회
 */
async function getConsultantProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

/**
 * 에러 메시지 포맷팅
 */
function formatError(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage;
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
  const accessResult = await validateUserAccess();
  if (!accessResult.success) {
    return { success: false, error: accessResult.error };
  }
  const { user, supabase } = accessResult;

  // 2. 입력 검증
  const inputValidation = testInputSchema.safeParse(input);
  if (!inputValidation.success) {
    return { success: false, error: inputValidation.error.errors[0].message };
  }

  try {
    // 3. 컨설턴트 프로필 조회
    const consultantProfile = await getConsultantProfile(supabase, user.id);

    // 4. STT 인사이트 추출 (텍스트가 있는 경우)
    let sttInsights: SttInsights | undefined;
    if (input.stt_text) {
      const sizeValidation = validateSttTextSize(input.stt_text);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }
      sttInsights = await extractInsightsFromStt(input.stt_text);
    }

    // 5. 로드맵 생성
    const roadmapResult = await generateTestRoadmap(
      input,
      user.id,
      consultantProfile,
      sttInsights
    );

    // 6. 감사 로그
    await createAuditLog({
      actorUserId: user.id,
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

    return {
      success: true,
      data: {
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[createTestRoadmap] Error:', error);
    return {
      success: false,
      error: formatError(error, ERROR_MESSAGES.CREATE_FAILED),
    };
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
  const accessResult = await validateUserAccess();
  if (!accessResult.success) {
    return { success: false, error: accessResult.error };
  }
  const { user, supabase } = accessResult;

  // 2. 수정 요청 검증
  if (!revisionPrompt || revisionPrompt.trim() === '') {
    return { success: false, error: ERROR_MESSAGES.REVISION_PROMPT_REQUIRED };
  }

  try {
    // 3. 컨설턴트 프로필 조회
    const consultantProfile = await getConsultantProfile(supabase, user.id);

    // 4. 로드맵 수정 요청
    const roadmapResult = await reviseTestRoadmapService(
      input,
      previousResult,
      revisionPrompt,
      user.id,
      consultantProfile
    );

    // 5. 감사 로그
    await createAuditLog({
      actorUserId: user.id,
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

    return {
      success: true,
      data: {
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[reviseTestRoadmap] Error:', error);
    return {
      success: false,
      error: formatError(error, ERROR_MESSAGES.REVISE_FAILED),
    };
  }
}
