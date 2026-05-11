'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { generatePBLContent, PBLGenerationError } from '@/lib/services/pbl/pbl-generator';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import {
  PBLInterviewStrictSchema,
  type PBLInterviewStrict,
  PBL_AI_LEVEL_LABEL,
} from '@/lib/schemas/interview-pbl';
import type { ConsultantProfile } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import {
  buildPBLHwpxPayloadFromInputs,
  generatePBLHwpx,
} from '@/lib/services/export/hwpx';

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

// =============================================================================
// 헬퍼 — V2 인터뷰 → V1 prompt-expected shape (pbl-prompts.ts 와 정합)
// =============================================================================

function toLegacyPromptShape(v2: PBLInterviewStrict): Record<string, unknown> {
  return {
    courseOverview: {
      company_name: v2.companyName,
      course_name: v2.courseName,
      ncs_code: v2.ncsCode ?? '',
      training_hours: v2.trainingHours,
      trainee_count: 0,
      training_job: v2.trainingTarget,
      ai_level: PBL_AI_LEVEL_LABEL[v2.currentAiLevel.level],
      training_goals: [],
      industry_main: '',
    },
    companyStatus: {
      business_issues: v2.businessIssues,
      organization: v2.organization.orgTree.map((node, i) => ({
        id: `org-${i}`,
        department_name: node.name,
        tasks: node.children.map((c) => c.name),
      })),
    },
    trainingEnvironment: {
      proper_training_hours: v2.trainingHours,
      training_place: {},
      internal_instructor: {},
      target_count: 0,
      target_characteristics: {},
      ai_infrastructure: {},
      training_needs_analysis: v2.trainingEnv,
      expectation: { as_is: '', to_be: '' },
    },
    hrdNecessity: {
      course_development_necessity: v2.courseNecessity,
      training_history: [],
      recommendations: [],
      hrd_report_attachment: v2.hrdReportPdf
        ? {
            storage_path: v2.hrdReportPdf.url,
            file_name: v2.hrdReportPdf.fileName,
            extracted_text: v2.hrdReportPdf.extractedText,
            parse_error: v2.hrdReportPdf.parseError,
          }
        : undefined,
    },
    performanceActivities: {
      // R8 PBL-자체-03 — 평면 4행을 차수별로 그룹핑해 V1 row 형태로 변환.
      performance_activities: (() => {
        const byRound = new Map<number, typeof v2.activities>();
        v2.activities.forEach((a) => {
          const list = byRound.get(a.round) ?? [];
          list.push(a);
          byRound.set(a.round, list);
        });
        return Array.from(byRound.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, rows], i) => {
            const find = (role: typeof rows[number]['role']) =>
              rows.find((r) => r.role === role)?.personName ?? '';
            const first = rows[0];
            return {
              id: `act-${i}`,
              round,
              date: first?.date ?? '',
              content: first?.content ?? '',
              method: first?.method ?? '',
              operation_mode: '대면',
              participants: {
                pm: find('PM'),
                external_expert: find('EXTERNAL_EXPERT'),
                internal_expert: find('INTERNAL_EXPERT'),
                jurisdiction_manager: find('JURISDICTION_MANAGER'),
              },
            };
          });
      })(),
    },
    problemDefinition: {
      problem_definition: {
        background: v2.problemDefinitionSheet?.background ?? '',
        core_problem: v2.problemDefinitionSheet?.core ?? '',
        scope: v2.problemDefinitionSheet?.scope ?? v2.target.scope,
        constraints: v2.problemDefinitionSheet?.constraints ?? '',
      },
      problem_priorities: v2.priority.items.map((it, i) => ({
        id: `pri-${i}`,
        problem_name: it.problem,
        priority: it.score,
        selected: it.rank === 1,
      })),
    },
    targetTasks: {
      target_tasks: [
        {
          id: 'target-1',
          task_name: v2.target.name,
          necessity: 5,
          selected: true,
        },
      ],
      selection_reason: v2.target.necessity,
      target_task_details: [
        {
          id: 'target-detail-1',
          task_name: v2.target.name,
          // V2 PR #7: details[] 5 필드 schema → 첫 번째 row 의 4 필드 그대로 사용
          as_is: v2.target.details[0]?.as_is ?? '',
          to_be: v2.target.details[0]?.to_be ?? '',
          required_knowledge: v2.target.details[0]?.required_knowledge ?? '',
          required_skill: v2.target.details[0]?.required_skill ?? '',
        },
      ],
    },
    aiLevelDiagnosis: {
      current_ai_level: PBL_AI_LEVEL_LABEL[v2.currentAiLevel.level],
      expected_ai_level: PBL_AI_LEVEL_LABEL[v2.expectedAiLevel.level],
      improvement_reason: v2.expectedAiLevel.note,
    },
  };
}

function parseInterview(input: TestPBLActionInput):
  | { ok: true; data: PBLInterviewStrict }
  | { ok: false; error: string } {
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
  input: TestPBLActionInput,
): Promise<ActionResult<TestPBLResult>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const parsed = parseInterview(input);
  if (!parsed.ok) return { success: false, error: parsed.error };
  const validatedInput = parsed.data;

  const { user } = auth;
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
      interview: toLegacyPromptShape(validatedInput),
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
}): Promise<
  ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>
> {
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
