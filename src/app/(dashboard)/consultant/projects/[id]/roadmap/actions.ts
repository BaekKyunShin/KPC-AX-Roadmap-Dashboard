'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { requireAuth, requireAuthWithRole, requireConsultantRoadmapAccess } from '@/lib/actions/auth-helpers';
import { ROADMAP_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import {
  generateRoadmap,
  finalizeRoadmap,
  fetchRoadmapVersions as fetchRoadmapVersionsService,
  fetchRoadmapVersion as fetchRoadmapVersionService,
  updateRoadmapManually,
  fromRoadmapVersionColumns,
  type RoadmapCompetency,
  type RoadmapOutcomeSummary,
  type RoadmapTrainingStructureItem,
  type RoadmapAnnualPlan,
  type RoadmapCourseSpec,
} from '@/lib/services/roadmap';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { createRoadmapInputSchema, editRoadmapUpdatesSchema } from '@/lib/schemas/roadmap';
import { buildRoadmapHwpxPayload, generateHwpx } from '@/lib/services/export/hwpx';
import { createAuditLog } from '@/lib/services/audit';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/** abort 레지스트리 키 생성 */
function abortKey(userId: string) { return `roadmap:${userId}`; }

/**
 * raw row → RoadmapVersionUI 호환 형태로 변환.
 * legacy 컬럼(roadmap_matrix/pbl_course/courses)을 fromRoadmapVersionColumns로
 * 신규 4섹션 구조(competencies/training_structure/annual_plan/course_specs)로 매핑.
 */
function toRoadmapVersionUI<
  R extends {
    id: string;
    version_number: number;
    status: string;
    diagnosis_summary?: string | null;
    roadmap_matrix?: unknown;
    pbl_course?: unknown;
    courses?: unknown;
    revision_prompt: string | null;
    is_shared: boolean;
    created_at: string;
    finalized_at: string | null;
  },
>(row: R) {
  return {
    id: row.id,
    version_number: row.version_number,
    status: row.status,
    revision_prompt: row.revision_prompt,
    is_shared: row.is_shared,
    created_at: row.created_at,
    finalized_at: row.finalized_at,
    ...fromRoadmapVersionColumns(row),
  };
}

/**
 * 로드맵 생성
 */
export async function createRoadmap(
  projectId: string,
  revisionPrompt?: string
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 생성할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // Zod 입력 검증 (인증 이후에 실행 — 미인증 사용자에게 검증 에러 노출 방지)
    const parsed = createRoadmapInputSchema.safeParse({ projectId, revisionPrompt });
    if (!parsed.success) {
      return { success: false, error: '입력 데이터가 올바르지 않습니다.' };
    }

    // 프로젝트 접근 권한 확인
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id, status')
      .eq('id', parsed.data.projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }

    if (!ROADMAP_ELIGIBLE_STATUSES.includes(projectData.status)) {
      return { success: false, error: '인터뷰가 완료된 프로젝트만 로드맵을 생성할 수 있습니다.' };
    }

    // 취소 가능하도록 AbortController 등록
    const abortController = registerAbort(abortKey(user.id));

    try {
      // 로드맵 생성 (검증된 데이터 사용)
      const { roadmapId, result, validation } = await generateRoadmap(
        parsed.data.projectId,
        user.id,
        parsed.data.revisionPrompt,
        false,
        abortController.signal
      );

      // 활동 일지 자동 기록 (응답 차단 방지를 위해 after()로 지연)
      const logContent = parsed.data.revisionPrompt
        ? '새 로드맵 버전이 생성되었습니다.'
        : '로드맵이 생성되었습니다.';
      after(async () => {
        await insertSystemActivityLog(parsed.data.projectId, user.id, logContent);
      });

      return {
        success: true,
        data: {
          roadmapId,
          result,
          validation,
        },
      };
    } finally {
      cleanupAbort(abortKey(user.id));
    }
  } catch (error) {
    console.error('[createRoadmap Error]', error);
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  }
}

/**
 * 로드맵 최종 확정
 */
export async function confirmFinalRoadmap(roadmapId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 확정할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
    if ('error' in access) return { success: false, error: access.error };

    await finalizeRoadmap(roadmapId, user.id);

    // 활동 일지 자동 기록 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await insertSystemActivityLog(
        access.projectId,
        user.id,
        '로드맵이 최종 확정되었습니다.',
      );
    });

    return { success: true };
  } catch (error) {
    console.error('[confirmFinalRoadmap Error]', error);
    return {
      success: false,
      error: '최종 확정에 실패했습니다.',
    };
  }
}

/**
 * 로드맵 버전 목록 조회 (신규 4섹션 구조로 변환된 RoadmapVersionUI 호환 형태)
 */
export async function fetchRoadmapVersions(projectId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return [];
    const { user, supabase, role } = auth;

    if (!role) return [];

    // 접근 권한 확인 (컨설턴트 또는 OPS_ADMIN)
    if (role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', projectId)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return [];
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return [];
    }

    const rawVersions = await fetchRoadmapVersionsService(projectId);
    return rawVersions.map(toRoadmapVersionUI);
  } catch {
    return [];
  }
}

/**
 * 특정 로드맵 버전 조회 (신규 4섹션 구조로 변환)
 */
export async function fetchRoadmapVersion(roadmapId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase, role } = auth;

    if (!role) return null;

    const roadmap = await fetchRoadmapVersionService(roadmapId);
    if (!roadmap) return null;

    // 접근 권한 확인
    if (role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', roadmap.project_id)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return null;
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return null;
    }

    return toRoadmapVersionUI(roadmap);
  } catch {
    return null;
  }
}

/**
 * 로드맵 수동 편집 (산인공 4섹션 신규 구조)
 */
export async function editRoadmapManually(
  roadmapId: string,
  updates: {
    diagnosis_summary?: string;
    setup_necessity?: string;
    outcome_summary?: RoadmapOutcomeSummary;
    competencies?: RoadmapCompetency[];
    ncs_used?: boolean;
    ncs_methodology?: string;
    ncs_derivation_method?: string;
    training_structure?: RoadmapTrainingStructureItem[];
    training_structure_method?: string;
    annual_plan?: RoadmapAnnualPlan;
    course_specs?: RoadmapCourseSpec[];
  }
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 편집할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // Zod 입력 검증
    const parsed = editRoadmapUpdatesSchema.safeParse(updates);
    if (!parsed.success) {
      console.warn('[editRoadmapManually] Zod validation failed:', parsed.error.flatten());
      return { success: false, error: '입력 데이터가 올바르지 않습니다.' };
    }

    const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
    if ('error' in access) return { success: false, error: access.error };

    const result = await updateRoadmapManually(roadmapId, user.id, parsed.data);

    if (!result.success) {
      return { success: false, error: result.error || '로드맵 편집에 실패했습니다.' };
    }

    return {
      success: true,
      data: {
        validation: result.validation,
      },
    };
  } catch (error) {
    console.error('[editRoadmapManually Error]', error);
    return {
      success: false,
      error: '로드맵 편집에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 기본 정보 조회 (회사명 등)
 */
export async function fetchProjectInfo(projectId: string): Promise<ActionResult<{ companyName: string }>> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase, role } = auth;

    if (!role) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const { data: project } = await supabase
      .from('projects')
      .select('company_name, assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 접근 권한 확인
    if (role === 'CONSULTANT_APPROVED') {
      if (project.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    return {
      success: true,
      data: { companyName: project.company_name },
    };
  } catch (error) {
    console.error('[fetchProjectInfo Error]', error);
    return {
      success: false,
      error: '프로젝트 정보 조회에 실패했습니다.',
    };
  }
}

/**
 * 진행 중인 로드맵 생성 취소
 */
export async function cancelRoadmapGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuth();
  if ('error' in auth) return { success: false, error: auth.error };

  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}

/**
 * 로드맵 HWPX 내보내기 (Step 7).
 *
 * 5단계 패턴:
 *   1. 세션 + 역할 (CONSULTANT_APPROVED)
 *   2. 로드맵 접근 권한 (프로젝트 배정)
 *   3. 입력 검증(roadmapId만)
 *   4. 데이터 조회 → payload 변환 → Python 함수 호출 → base64
 *   5. 감사로그 + ActionResult 반환
 *
 * 반환값이 Buffer가 아닌 base64 문자열인 이유:
 *   Server Action 반환값은 JSON 직렬화 대상이므로 Buffer/Blob 직접 반환 불가.
 *   클라이언트(useHwpxDownload 훅)가 atob로 복원 후 Blob → a.download 처리.
 */
export async function exportRoadmapAsHwpxAction(
  roadmapId: string,
): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  try {
    // 1) 인증 + 역할
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 HWPX를 내보낼 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // 2) 입력 검증
    if (!roadmapId || typeof roadmapId !== 'string') {
      return { success: false, error: '로드맵 ID가 올바르지 않습니다.' };
    }

    // 3) 접근 권한 확인 (프로젝트 배정)
    const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
    if ('error' in access) return { success: false, error: access.error };

    // 4) 데이터 조회
    const roadmapRow = await fetchRoadmapVersionService(roadmapId);
    if (!roadmapRow) {
      return { success: false, error: '로드맵을 찾을 수 없습니다.' };
    }

    const { data: projectRow } = await supabase
      .from('projects')
      .select('id, company_name')
      .eq('id', access.projectId)
      .single();
    if (!projectRow) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    const { data: interviewRow } = await supabase
      .from('interviews')
      .select('*')
      .eq('project_id', access.projectId)
      .maybeSingle();

    // 5) payload 변환 + Python 함수 호출
    const payload = buildRoadmapHwpxPayload({
      // TypeScript 타입 호환: roadmapRow는 raw DB row이므로 RoadmapVersion으로 단언
      roadmap: roadmapRow as unknown as Parameters<typeof buildRoadmapHwpxPayload>[0]['roadmap'],
      project: projectRow as unknown as Parameters<typeof buildRoadmapHwpxPayload>[0]['project'],
      interview: (interviewRow ?? null) as unknown as Parameters<typeof buildRoadmapHwpxPayload>[0]['interview'],
    });

    // 요청 host에서 현재 deployment URL 추출 — 같은 배포의 Python 함수를 찌른다.
    // 이렇게 해야 Preview/Production/로컬 어느 환경에서든 자기 자신의 함수를 호출.
    const reqHeaders = await headers();
    const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    let buffer: Buffer;
    try {
      buffer = await generateHwpx(payload, { baseUrl });
    } catch (error) {
      console.error('[exportRoadmapAsHwpxAction generateHwpx Error]', {
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: 'HWPX 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 6) Buffer → base64 (Next.js 직렬화 제약)
    const contentBase64 = buffer.toString('base64');

    // 7) 감사로그
    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'ROADMAP_HWPX_EXPORTED',
        targetType: 'roadmap_version',
        targetId: roadmapId,
        meta: {
          projectId: access.projectId,
          versionNumber: roadmapRow.version_number,
          fileSize: buffer.length,
        },
      });
    });

    return {
      success: true,
      data: {
        fileName: payload.fileName,
        contentBase64,
        mimeType: 'application/vnd.hancom.hwpx',
      },
    };
  } catch (error) {
    console.error('[exportRoadmapAsHwpxAction Error]', error);
    return { success: false, error: 'HWPX 내보내기에 실패했습니다.' };
  }
}
