'use server';

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
      performance_activities: v2.activities.map((a, i) => ({
        id: `act-${i}`,
        round: a.round,
        date: a.date,
        content: a.content,
        method: a.method,
        operation_mode: '대면',
        participants: { pm: a.participants, external_expert: '', internal_expert: '', jurisdiction_manager: '' },
      })),
    },
    problemDefinition: {
      problem_definition: {
        background: v2.problems.map((p) => p.description).join('\n'),
        core_problem: v2.problems[0]?.title ?? '',
        scope: v2.target.scope,
        constraints: '',
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
          as_is: v2.target.details.find((d) => d.title === 'As-Is')?.description ?? '',
          to_be: v2.target.details.find((d) => d.title === 'To-Be')?.description ?? '',
          required_knowledge:
            v2.target.details.find((d) => d.title === '요구 지식')?.description ?? '',
          required_skill:
            v2.target.details.find((d) => d.title === '요구 기술')?.description ?? '',
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
