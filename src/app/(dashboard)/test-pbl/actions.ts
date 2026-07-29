'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { generatePBLContent, PBLGenerationError } from '@/lib/services/pbl/pbl-generator';
import { checkAndRecordLLMUsage } from '@/lib/services/quota';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import { PBLInterviewStrictSchema, type PBLInterviewStrict } from '@/lib/schemas/interview-pbl';
import type { ConsultantProfile } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import { buildPBLHwpxPayloadFromInputs, generatePBLHwpx } from '@/lib/services/export/hwpx';

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

function abortKey(userId: string) {
  return `test-pbl:${userId}`;
}

// =============================================================================
// 테스트 Action 입력 (V2 camelCase 인터뷰 + 테스트 전용 기업 메타)
// =============================================================================

export interface TestPBLActionInput {
  /** V2 양식 2 인터뷰 (Strict 통과 필요) */
  interview: PBLInterviewStrict;
  /** 테스트 대상 기업 메타 (프로젝트 레코드 없이 LLM 프롬프트에만 사용) */
  companyName: string;
  industry: string;
  companySize: string;
}

export interface TestPBLResult {
  /** LLM 이 생성한 Ⅳ·Ⅴ 콘텐츠 (in-memory — DB 저장 없음) */
  content: PBLContent;
  /** 결과 렌더에 필요한 원본 인터뷰(camelCase V2). */
  interview: PBLInterviewStrict;
}

function parseInterview(
  input: TestPBLActionInput
): { ok: true; data: PBLInterviewStrict } | { ok: false; error: string } {
  if (!input.companyName || input.companyName.trim().length < 2) {
    return { ok: false, error: '회사명을 2자 이상 입력하세요.' };
  }
  if (!input.industry) return { ok: false, error: '업종을 선택하세요.' };
  if (!input.companySize) return { ok: false, error: '기업 규모를 선택하세요.' };

  const parsed = PBLInterviewStrictSchema.safeParse(input.interview);
  if (!parsed.success) {
    return {
      ok: false,
      error: `PBL 인터뷰 검증 실패: ${parsed.error.errors[0]?.message ?? '알 수 없는 오류'}`,
    };
  }
  return { ok: true, data: parsed.data };
}

// =============================================================================
// Server Action — generateTestPBL (V2 인터뷰 수용, DB 저장 없음)
// =============================================================================

/**
 * /test-pbl 에서 호출되는 PBL 생성 액션 (Task 2.11-e 재작성).
 *
 * 흐름:
 *  1. V2 Strict 인터뷰 검증
 *  2. V2 → V1 prompt shape 어댑팅 (pbl-prompts.ts 가 기대하는 shape 과 정합)
 *  3. generatePBLContent 호출 → PBLContent (Ⅳ·Ⅴ) LLM 생성
 *  4. in-memory 결과 반환 — DB 저장 없음, 페이지 이탈 시 휘발.
 */
export async function generateTestPBL(
  input: TestPBLActionInput
): Promise<ActionResult<TestPBLResult>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const parsed = parseInterview(input);
  if (!parsed.ok) return { success: false, error: parsed.error };
  const validatedInput = parsed.data;

  const { user } = auth;

  // LLM 호출 쿼터 확인 — 테스트 로드맵(generateTestRoadmap)과 동일하게 적용한다.
  // 확인과 동시에 사용량이 증가하므로 입력 검증 뒤, DB 조회 앞에 둔다.
  const quotaCheck = await checkAndRecordLLMUsage(user.id);
  if (quotaCheck.exceeded) {
    return { success: false, error: quotaCheck.message || 'LLM 호출 한도를 초과했습니다.' };
  }

  const adminSupabase = createAdminClient();

  let consultantProfile: ConsultantProfile | null = null;
  const { data: profile } = await adminSupabase
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (profile) consultantProfile = profile as ConsultantProfile;

  const diagnosisSummary = [
    `[테스트] ${input.companyName || '샘플기업'} 대상`,
    validatedInput.trainingTarget ? `${validatedInput.trainingTarget} 직무의` : '',
    `AI 기반 PBL 과정(${validatedInput.courseName})`,
  ]
    .filter(Boolean)
    .join(' ');

  const abortController = registerAbort(abortKey(user.id));

  try {
    const { content } = await generatePBLContent({
      // V2 flat camelCase 인터뷰를 그대로 전달 — 실제 PBL 생성 경로
      // (pbl/actions.ts) 와 동일. 프롬프트 빌더가 V2 정본을 직접 읽는다.
      interview: validatedInput as unknown as Record<string, unknown>,
      project: {
        company_name: input.companyName,
        industry: input.industry,
        company_size: input.companySize,
        sub_industries: [],
        customer_comment: '',
      },
      consultantProfile,
      diagnosisSummary,
      signal: abortController.signal,
    });

    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEST_PROJECT_CREATE',
        targetType: 'pbl',
        targetId: 'test-mode',
        meta: {
          company_name: input.companyName,
          industry: input.industry,
          is_test_mode: true,
          no_db_save: true,
          track: 'PBL',
          source: '/test-pbl',
        },
      });
    });

    return {
      success: true,
      data: { content, interview: validatedInput },
    };
  } catch (error) {
    console.error('[generateTestPBL Error]', error);
    if (error instanceof PBLGenerationError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: getLLMUserFriendlyError(error) };
  } finally {
    cleanupAbort(abortKey(user.id));
  }
}

export async function cancelTestPBLGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };
  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}

// =============================================================================
// Server Action — exportTestPBLHwpx (in-memory HWPX 생성)
// =============================================================================

/**
 * 테스트 PBL 결과(in-memory) → HWPX 다운로드.
 *
 * 실제 PBL은 `exportPBLAsHwpxAction(pblId)` 가 DB 의 pbl_reports 행을 조회해
 * payload 를 만들지만, 테스트 모드는 DB 저장이 없으므로 in-memory 입력만으로
 * `buildPBLHwpxPayloadFromInputs` 를 직접 호출한다 (가짜 row 캐스팅 indirection
 * 제거).
 *
 * 보안: 테스트 모드 허용 역할(CONSULTANT_APPROVED / OPS_ADMIN / SYSTEM_ADMIN)만.
 */
export async function exportTestPBLHwpx(input: {
  content: PBLContent;
  interview: PBLInterviewStrict;
  companyName: string;
}): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  // 인터뷰 검증 — Strict 통과해야 인터뷰 데이터가 payload 변환에 안전.
  const parsedInterview = PBLInterviewStrictSchema.safeParse(input.interview);
  if (!parsedInterview.success) {
    return {
      success: false,
      error: '테스트 인터뷰 데이터 검증에 실패했습니다.',
    };
  }

  const payload = buildPBLHwpxPayloadFromInputs({
    content: input.content,
    interview: parsedInterview.data,
    companyName: input.companyName,
  });

  const reqHeaders = await headers();
  const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : undefined;

  // 사용자가 토스트 메시지를 보고 Vercel 로그에서 즉시 트레이스 할 수 있도록
  // 짧은 requestId 부여 + 양쪽 로그 동일 prefix.
  const requestId = `tpbl-hwpx-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[exportTestPBLHwpx ${requestId}] start`, {
    baseUrl,
    fileName: payload.fileName,
    track: payload.track,
  });

  let buffer: Buffer;
  try {
    buffer = await generatePBLHwpx(payload, { baseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[exportTestPBLHwpx ${requestId}] FAILED`, {
      baseUrl,
      error: message,
    });
    const isLocalDevFallback = message.includes('Vercel Python 런타임');
    if (isLocalDevFallback) {
      return { success: false, error: message };
    }
    // 사용자에게 cause + requestId 노출 — Vercel 로그에서 동일 ID 로 추적 가능.
    const detail = message.length > 250 ? `${message.slice(0, 250)}…` : message;
    return {
      success: false,
      error: `HWPX 생성에 실패했습니다. (요청 ID: ${requestId})\n원인: ${detail}`,
    };
  }

  console.log(`[exportTestPBLHwpx ${requestId}] OK`, { bytes: buffer.length });
  return {
    success: true,
    data: {
      fileName: payload.fileName,
      contentBase64: buffer.toString('base64'),
      mimeType: 'application/vnd.hancom.hwpx',
    },
  };
}
