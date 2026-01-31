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

// =============================================================================
// 타입 정의
// =============================================================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

type TestRoadmapRole = 'CONSULTANT_APPROVED' | 'OPS_ADMIN' | 'SYSTEM_ADMIN';

// =============================================================================
// 상수
// =============================================================================

/** 테스트 로드맵 기능에 접근 가능한 역할 목록 */
const ALLOWED_ROLES: readonly TestRoadmapRole[] = [
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN',
];

// =============================================================================
// 헬퍼 함수
// =============================================================================

/**
 * 역할이 테스트 로드맵 기능에 접근 가능한지 확인
 */
function isAllowedRole(role: string): role is TestRoadmapRole {
  return ALLOWED_ROLES.includes(role as TestRoadmapRole);
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
  const supabase = await createClient();

  // 1. 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 2. 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || !isAllowedRole(profile.role) || profile.status !== 'ACTIVE') {
    return {
      success: false,
      error: '승인된 컨설턴트 또는 운영관리자만 테스트 로드맵을 생성할 수 있습니다.',
    };
  }

  // 3. 입력 검증
  const inputValidation = testInputSchema.safeParse(input);
  if (!inputValidation.success) {
    return { success: false, error: inputValidation.error.errors[0].message };
  }

  try {
    // 4. 컨설턴트 프로필 조회
    const { data: consultantProfile } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 5. STT 인사이트 추출 (텍스트가 있는 경우)
    let sttInsights: SttInsights | undefined;
    if (input.stt_text) {
      const sizeValidation = validateSttTextSize(input.stt_text);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }
      sttInsights = await extractInsightsFromStt(input.stt_text);
    }

    // 6. 로드맵 생성
    const roadmapResult = await generateTestRoadmap(
      input,
      user.id,
      consultantProfile,
      sttInsights
    );

    // 7. 감사 로그
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
      error: error instanceof Error ? error.message : '로드맵 생성 중 오류가 발생했습니다.',
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
  const supabase = await createClient();

  // 1. 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 2. 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || !isAllowedRole(profile.role) || profile.status !== 'ACTIVE') {
    return {
      success: false,
      error: '승인된 컨설턴트 또는 운영관리자만 테스트 로드맵을 수정할 수 있습니다.',
    };
  }

  // 3. 수정 요청 검증
  if (!revisionPrompt || revisionPrompt.trim() === '') {
    return { success: false, error: '수정 요청 내용을 입력해주세요.' };
  }

  try {
    // 4. 컨설턴트 프로필 조회
    const { data: consultantProfile } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 5. 로드맵 수정 요청
    const roadmapResult = await reviseTestRoadmapService(
      input,
      previousResult,
      revisionPrompt,
      user.id,
      consultantProfile
    );

    // 6. 감사 로그
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
        revision_prompt: revisionPrompt.substring(0, 200), // 로그에는 앞부분만
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
      error: error instanceof Error ? error.message : '로드맵 수정 중 오류가 발생했습니다.',
    };
  }
}
