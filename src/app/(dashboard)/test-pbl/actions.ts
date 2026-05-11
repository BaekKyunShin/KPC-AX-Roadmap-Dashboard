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
import type { ConsultantProfile, Interview, Project } from '@/types/database';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import { buildPBLHwpxPayload, generatePBLHwpx } from '@/lib/services/export/hwpx';

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
 * 실제 PBL은 `exportPBLAsHwpxAction(pblId)` 로 DB 의 pbl_reports row 를 조회해
 * payload 를 만들지만, 테스트 모드는 DB 저장이 없으므로 client 가 보낸
 * in-memory content/interview/companyName 으로 **가짜 row 객체**를 만들어
 * 동일한 `buildPBLHwpxPayload` + `generatePBLHwpx` 파이프라인을 사용한다.
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
  const { user } = auth;

  // 인터뷰 검증 — Strict 통과해야 인터뷰 데이터가 payload 변환에 안전.
  const parsedInterview = PBLInterviewStrictSchema.safeParse(input.interview);
  if (!parsedInterview.success) {
    return {
      success: false,
      error: '테스트 인터뷰 데이터 검증에 실패했습니다.',
    };
  }
  const companyName = (input.companyName ?? '').trim() || '테스트기업';

  // ── 가짜 row 객체 구성 ──────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const fakePblRow: PBLReportRow = {
    id: 'test-mode',
    project_id: 'test-mode',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    pbl_content: input.content,
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: user.id,
    finalized_by: null,
    finalized_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Project — buildPBLHwpxPayload 가 참조하는 핵심 필드만 채움. raw row 캐스팅.
  const fakeProject = {
    id: 'test-mode',
    company_name: companyName,
    track: 'PBL',
    is_test_mode: true,
    created_by: user.id,
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as Project;

  // Interview — V2 pbl_data JSONB 컬럼에 인터뷰 본체를 그대로 주입. raw row 캐스팅.
  const fakeInterview = {
    id: 'test-mode',
    project_id: 'test-mode',
    interviewer_id: user.id,
    pbl_data: parsedInterview.data,
    interview_date: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as Interview;

  // ── payload 변환 + Python 호출 ──────────────────────────────────────────
  const payload = buildPBLHwpxPayload({
    pbl: fakePblRow,
    project: fakeProject,
    interview: fakeInterview,
  });

  const reqHeaders = await headers();
  const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : undefined;

  let buffer: Buffer;
  try {
    buffer = await generatePBLHwpx(payload, { baseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[exportTestPBLHwpx generatePBLHwpx Error]', {
      baseUrl,
      error: message,
    });
    const isLocalDevFallback = message.includes('Vercel Python 런타임');
    return {
      success: false,
      error: isLocalDevFallback
        ? message
        : 'HWPX 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  return {
    success: true,
    data: {
      fileName: payload.fileName,
      contentBase64: buffer.toString('base64'),
      mimeType: 'application/vnd.hancom.hwpx',
    },
  };
}
