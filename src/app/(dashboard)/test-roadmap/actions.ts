'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { requireAuthWithRole, type SupabaseServerClient } from '@/lib/actions/auth-helpers';
import {
  generateTestRoadmap,
  reviseTestRoadmap as reviseTestRoadmapService,
  type RoadmapResult,
  type ValidationResult,
  type TestRoadmapInput,
} from '@/lib/services/roadmap';
import { toRoadmapVersionColumns } from '@/lib/services/roadmap/roadmap-storage-mapper';
import { mapRoadmapInterviewToDb } from '@/lib/services/interview/converters';
import { createAuditLog } from '@/lib/services/audit';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import {
  RoadmapInterviewStrictSchema,
  type RoadmapInterviewStrict,
} from '@/lib/schemas/interview-roadmap';
import type { Interview, Project, RoadmapVersion } from '@/types/database';
import { buildRoadmapHwpxPayload, generateRoadmapHwpx } from '@/lib/services/export/hwpx';

// =============================================================================
// 상수
// =============================================================================

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

function abortKey(userId: string) {
  return `test-roadmap:${userId}`;
}

// =============================================================================
// 테스트 Action 입력 (V2 camelCase 인터뷰 + 테스트 전용 기업 메타)
// =============================================================================

export interface TestRoadmapActionInput {
  /** V2 양식 1 인터뷰 (Strict 통과 필요) */
  interview: RoadmapInterviewStrict;
  /** 테스트 대상 기업 메타 (프로젝트 레코드 없이 LLM 프롬프트에만 사용) */
  companyName: string;
  industry: string;
  companySize: string;
}

// =============================================================================
// 헬퍼 — V2 인터뷰 → TestRoadmapInput (서비스 계층 snake_case) 어댑터
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
 * V2 Strict 인터뷰(camelCase) 를 LLM 서비스의 `TestRoadmapInput` (snake_case) 로 변환.
 *
 * 서비스 계층(`generateTestRoadmap`) 은 아직 기존 프롬프트 빌더(snake_case interview)
 * 를 사용한다. V2 인터뷰와 1:1 필드 매핑이 가능하므로 어댑터 한 번으로 재사용한다.
 */
function toLegacyTestInput(
  interview: RoadmapInterviewStrict,
  meta: { companyName: string; industry: string; companySize: string },
): TestRoadmapInput {
  // Ⅰ-2 첫 차수에서 날짜/시간/방법 추출 (legacy 헤더 매핑용)
  const first = interview.performanceActivities[0];
  const method =
    first && ['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER'].includes(first.method)
      ? (first.method as 'ONSITE' | 'VIDEO' | 'WORKSHOP' | 'OTHER')
      : 'ONSITE';

  return {
    company_name: meta.companyName,
    industry: meta.industry,
    company_size: meta.companySize,
    customer_requirements: '',
    overview: {
      establishment_necessity: interview.establishmentNecessity,
      ai_competency_level: interview.aiLevel,
      selected_tasks_summary: interview.selectedTask,
      roadmap_summary: '',
    },
    interview_date: first?.date ?? new Date().toISOString().slice(0, 10),
    interview_round: first?.round ?? 1,
    interview_time: first?.timeRange ?? '',
    interview_method: method,
    participants: [
      {
        id: 'test-pm',
        name: first?.pmName ?? 'PM',
        position: 'PM',
      },
      ...(first?.expertName
        ? [{ id: 'test-expert', name: first.expertName, position: '전문가' }]
        : []),
    ],
    company_requirements: {
      company_status: interview.companyRequirements.status,
      main_problems: interview.companyRequirements.problem,
      push_willingness: interview.companyRequirements.will,
      expected_outcomes: interview.companyRequirements.outcomes,
    },
    task_workflow_items: interview.taskAnalysis.map((t, i) => ({
      id: `test-t-${i}`,
      job: t.domain,
      task_name: t.task,
      as_is: t.asIs,
      problems: t.problem,
      data_availability: t.dataTiming,
      ai_necessity: t.aiScore,
    })),
    training_targets: [
      {
        id: 'test-tt-1',
        task_name: interview.targetTask.name,
        selection_reason: interview.targetTask.reason,
        as_is: interview.targetTask.expectedAsIs,
        to_be: interview.targetTask.expectedToBe,
      },
    ],
    analysis_notes: {
      text: interview.taskAnalysisNote,
      attachment_files: [],
    },
    competency_models: interview.competencies.map((c, i) => ({
      id: `test-c-${i}`,
      competency_name: c.name,
      competency_definition: c.definition,
      knowledge: c.knowledge,
      skill: c.skill,
      attitude: c.attitude,
    })),
    ncs_usage: interview.ncsUsed
      ? {
          uses_ncs: true,
          ncs_usage_method: interview.ncsMethodology ?? '',
        }
      : {
          uses_ncs: false,
          competency_derivation_method: interview.ncsDerivationMethod ?? '',
        },
    notes: '',
  };
}

function parseInterview(input: TestRoadmapActionInput):
  | { ok: true; data: RoadmapInterviewStrict }
  | { ok: false; error: string } {
  if (!input.companyName || input.companyName.trim().length < 2) {
    return { ok: false, error: '회사명을 2자 이상 입력하세요.' };
  }
  if (!input.industry) return { ok: false, error: '업종을 선택하세요.' };
  if (!input.companySize) return { ok: false, error: '기업 규모를 선택하세요.' };

  const parsed = RoadmapInterviewStrictSchema.safeParse(input.interview);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.errors[0]?.message ??
        '인터뷰 입력 검증에 실패했습니다. 필수 항목을 확인하세요.',
    };
  }
  return { ok: true, data: parsed.data };
}

// =============================================================================
// Server Action — createTestRoadmap (V2 인터뷰 수용, DB 저장 없음)
// =============================================================================

export async function createTestRoadmap(
  input: TestRoadmapActionInput,
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const parsed = parseInterview(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const legacyInput = toLegacyTestInput(parsed.data, {
    companyName: input.companyName,
    industry: input.industry,
    companySize: input.companySize,
  });

  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);
    const roadmapResult = await generateTestRoadmap(
      legacyInput,
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
          company_name: input.companyName,
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
// Server Action — reviseTestRoadmap (V2 인터뷰 수용, DB 저장 없음)
// =============================================================================

export async function reviseTestRoadmap(
  input: TestRoadmapActionInput,
  previousResult: RoadmapResult,
  revisionPrompt: string,
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  if (!revisionPrompt || revisionPrompt.trim() === '') {
    return { success: false, error: '수정 요청 내용을 입력해주세요.' };
  }

  const parsed = parseInterview(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const legacyInput = toLegacyTestInput(parsed.data, {
    companyName: input.companyName,
    industry: input.industry,
    companySize: input.companySize,
  });

  const abortController = registerAbort(abortKey(auth.user.id));

  try {
    const consultantProfile = await fetchConsultantProfile(auth.supabase, auth.user.id);
    const roadmapResult = await reviseTestRoadmapService(
      legacyInput,
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
          company_name: input.companyName,
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

// =============================================================================
// Server Action — exportTestRoadmapHwpx (in-memory HWPX 생성)
// =============================================================================

/**
 * 테스트 로드맵 결과(in-memory) → HWPX 다운로드.
 *
 * 실제 로드맵은 `exportRoadmapAsHwpxAction(roadmapId)` 로 DB roadmap_versions row 를
 * 조회해 payload 를 만들지만, 테스트 모드는 DB 저장이 없으므로 client 가 보낸
 * in-memory result/interview/companyName 으로 **가짜 row 객체**를 만들어
 * 동일한 `buildRoadmapHwpxPayload` + `generateRoadmapHwpx` 파이프라인을 사용한다.
 */
export async function exportTestRoadmapHwpx(input: {
  result: RoadmapResult;
  interview: RoadmapInterviewStrict;
  companyName: string;
}): Promise<
  ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>
> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  const parsedInterview = RoadmapInterviewStrictSchema.safeParse(input.interview);
  if (!parsedInterview.success) {
    return {
      success: false,
      error: '테스트 인터뷰 데이터 검증에 실패했습니다.',
    };
  }
  const companyName = (input.companyName ?? '').trim() || '테스트기업';

  // RoadmapResult(4섹션) → legacy DB columns 매핑
  const columns = toRoadmapVersionColumns(input.result);

  const nowIso = new Date().toISOString();
  const fakeRoadmapRow = {
    id: 'test-mode',
    project_id: 'test-mode',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: columns.diagnosis_summary,
    roadmap_matrix: columns.roadmap_matrix,
    pbl_course: columns.pbl_course,
    courses: columns.courses,
    free_tool_validated: true,
    time_limit_validated: true,
    created_by: user.id,
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as RoadmapVersion;

  const fakeProject = {
    id: 'test-mode',
    company_name: companyName,
    track: 'ROADMAP',
    is_test_mode: true,
    created_by: user.id,
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as Project;

  // V2 인터뷰 → DB nested shape 변환 (company_details.roadmap_overview / job_tasks /
  // improvement_goals). buildRoadmapHwpxPayload 가 이 shape 의 raw row 를 직접 읽으므로
  // mapRoadmapInterviewToDb 의 결과를 그대로 펼쳐 넣지 않으면 모든 필드가 빈 값이 되어
  // Python HWPX 함수에서 처리가 실패한다.
  const interviewDbShape = mapRoadmapInterviewToDb(parsedInterview.data);
  const fakeInterview = {
    id: 'test-mode',
    project_id: 'test-mode',
    interviewer_id: user.id,
    interview_date: nowIso,
    ...interviewDbShape,
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as Interview;

  const payload = buildRoadmapHwpxPayload({
    roadmap: fakeRoadmapRow,
    project: fakeProject,
    interview: fakeInterview,
  });

  const reqHeaders = await headers();
  const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : undefined;

  let buffer: Buffer;
  try {
    buffer = await generateRoadmapHwpx(payload, { baseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[exportTestRoadmapHwpx generateRoadmapHwpx Error]', {
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
