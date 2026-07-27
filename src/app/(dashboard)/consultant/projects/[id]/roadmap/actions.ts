'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  requireAuth,
  requireAuthWithRole,
  requireConsultantProjectAccess,
  requireConsultantRoadmapAccess,
  canAccessProjectArtifact,
} from '@/lib/actions/auth-helpers';
import { ROADMAP_ELIGIBLE_STATUSES, isOpsManager } from '@/lib/constants/status';
import {
  generateRoadmap,
  finalizeRoadmap,
  fetchRoadmapVersions as fetchRoadmapVersionsService,
  fetchRoadmapVersion as fetchRoadmapVersionService,
  updateRoadmapManually,
  fromRoadmapVersionColumns,
  toRoadmapVersionColumns,
  sanitizeRoadmapResult,
  type RoadmapOutcomeSummary,
  type RoadmapCourseSpec,
} from '@/lib/services/roadmap';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { createRoadmapInputSchema, editRoadmapUpdatesSchema } from '@/lib/schemas/roadmap';
import { buildRoadmapHwpxPayload, generateRoadmapHwpx } from '@/lib/services/export/hwpx';
import { createAuditLog } from '@/lib/services/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveHrdSignedUrl } from '@/lib/services/storage/hrd-signed-url';
import { fetchRoadmapInterviewV2, saveRoadmapInterviewV2 } from '../interview/actions';
import { createClient } from '@/lib/supabase/server';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type {
  RoadmapResultEditPayload,
  ResultInterviewSnapshot,
} from './_components/result-v2/types';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/** abort 레지스트리 키 생성 */
function abortKey(userId: string) {
  return `roadmap:${userId}`;
}

/**
 * raw row → RoadmapVersionUI 호환 형태로 변환.
 * legacy 컬럼(roadmap_matrix/pbl_course/courses)을 fromRoadmapVersionColumns로
 * 양식 v2 구조(setup_necessity/outcome_summary/course_specs)로 매핑.
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

      // 운영관리 페이지가 컨설턴트의 DRAFT 생성을 즉시 반영하도록 캐시 무효화
      revalidatePath('/ops/projects');
      revalidatePath(`/ops/projects/${parsed.data.projectId}`);

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
      await insertSystemActivityLog(access.projectId, user.id, '로드맵이 최종 확정되었습니다.');
    });

    // 운영관리 페이지가 FINAL 전환을 즉시 반영하도록 캐시 무효화
    revalidatePath('/ops/projects');
    revalidatePath(`/ops/projects/${access.projectId}`);

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
    } else if (!isOpsManager(role)) {
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
    } else if (!isOpsManager(role)) {
      return null;
    }

    return toRoadmapVersionUI(roadmap);
  } catch {
    return null;
  }
}

/**
 * roadmap_versions 행이 소유한 편집 가능 필드 (양식 v2).
 *
 * v1 대비 삭제: competencies · ncs_* · training_structure(+_method) · annual_plan
 * (신규 양식에서 해당 표가 전부 제거됨). `editRoadmapUpdatesSchema` 와 1:1 대응.
 */
type RoadmapEditableFields = {
  diagnosis_summary?: string;
  setup_necessity?: string;
  outcome_summary?: RoadmapOutcomeSummary;
  course_specs?: RoadmapCourseSpec[];
};

/**
 * 로드맵 수동 편집 (산인공 공식 양식 v2 구조)
 */
export async function editRoadmapManually(
  roadmapId: string,
  updates: RoadmapEditableFields
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
export async function fetchProjectInfo(
  projectId: string
): Promise<ActionResult<{ companyName: string; track: 'ROADMAP' | 'PBL' }>> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase, role } = auth;

    if (!role) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const { data: project } = await supabase
      .from('projects')
      .select('company_name, assigned_consultant_id, track')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 접근 권한 확인
    if (!canAccessProjectArtifact(role, project.assigned_consultant_id, user.id)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    return {
      success: true,
      data: {
        companyName: project.company_name,
        track: project.track === 'PBL' ? 'PBL' : 'ROADMAP',
      },
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
  roadmapId: string
): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  try {
    // 1) 인증 + 역할 — 컨설턴트 + 운영·시스템관리자
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'], {
      roleError: '로드맵 HWPX를 내보낼 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, role, supabase } = auth;

    // 2) 입력 검증
    if (!roadmapId || typeof roadmapId !== 'string') {
      return { success: false, error: '로드맵 ID가 올바르지 않습니다.' };
    }

    // 3) 접근 권한 확인 — 컨설턴트만 배정 체크, OPS/시스템관리자는 전체 열람 가능
    let projectId: string;
    if (role === 'CONSULTANT_APPROVED') {
      const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
      if ('error' in access) return { success: false, error: access.error };
      projectId = access.projectId;
    } else {
      // OPS_ADMIN / SYSTEM_ADMIN — 프로젝트 id 만 조회
      const { data: row } = await supabase
        .from('roadmap_versions')
        .select('project_id')
        .eq('id', roadmapId)
        .single();
      if (!row) return { success: false, error: '로드맵을 찾을 수 없습니다.' };
      projectId = row.project_id;
    }
    const access = { projectId };

    // 4) 데이터 조회
    const roadmapRow = await fetchRoadmapVersionService(roadmapId);
    if (!roadmapRow) {
      return { success: false, error: '로드맵을 찾을 수 없습니다.' };
    }

    // 정책 이전 (2026-05-18) — 내보내기 직전 1회 sanitize.
    // DRAFT 편집 중 sanitize 가 해제되어 DB 에 빈 행이 남을 수 있어 보호.
    const sanitizedResult = sanitizeRoadmapResult(
      fromRoadmapVersionColumns({
        diagnosis_summary: roadmapRow.diagnosis_summary as string | null | undefined,
        roadmap_matrix: roadmapRow.roadmap_matrix,
        pbl_course: roadmapRow.pbl_course,
        courses: roadmapRow.courses,
      })
    );
    const sanitizedCols = toRoadmapVersionColumns(sanitizedResult);
    const sanitizedRoadmapRow = {
      ...roadmapRow,
      diagnosis_summary: sanitizedCols.diagnosis_summary,
      roadmap_matrix: sanitizedCols.roadmap_matrix,
      pbl_course: sanitizedCols.pbl_course,
      courses: sanitizedCols.courses,
    };

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
      roadmap: sanitizedRoadmapRow as unknown as Parameters<
        typeof buildRoadmapHwpxPayload
      >[0]['roadmap'],
      project: projectRow as unknown as Parameters<typeof buildRoadmapHwpxPayload>[0]['project'],
      interview: (interviewRow ?? null) as unknown as Parameters<
        typeof buildRoadmapHwpxPayload
      >[0]['interview'],
    });

    // 요청 host에서 현재 deployment URL 추출 — 같은 배포의 Python 함수를 찌른다.
    // 이렇게 해야 Preview/Production/로컬 어느 환경에서든 자기 자신의 함수를 호출.
    const reqHeaders = await headers();
    const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    let buffer: Buffer;
    try {
      buffer = await generateRoadmapHwpx(payload, { baseUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[exportRoadmapAsHwpxAction generateRoadmapHwpx Error]', {
        baseUrl,
        error: message,
      });
      // hwpx-client.ts의 로컬 dev fallback 메시지(`Vercel Python 런타임` 키워드
      // 포함)는 사용자에게 구체적 해결 옵션을 안내하므로 그대로 전달한다.
      // 그 외 에러는 상세 원인을 숨기고 범용 실패 메시지로 치환.
      const isLocalDevFallback = message.includes('Vercel Python 런타임');
      return {
        success: false,
        error: isLocalDevFallback
          ? message
          : 'HWPX 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 6) Buffer → base64 (Next.js 직렬화 제약)
    const contentBase64 = buffer.toString('base64');
    console.log('[exportRoadmapAsHwpxAction] payload ready', {
      bufferLength: buffer.length,
      base64Length: contentBase64.length,
      firstMagic: buffer.subarray(0, 4).toString('hex'), // ZIP: 504b0304
    });

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

// ============================================================================
// Task 2.8 — 로드맵 결과 V2 Server Action (5종)
// ----------------------------------------------------------------------------
// V2 Client 가 props 외주 패턴 (onSelectVersion / onEdit / onGenerate /
// onDownload) 으로 상위에 위임하므로, 상위 page.tsx 가 호출할 V2 래퍼 Action.
// Legacy Action 은 삭제 금지 (Task 2.11 cleanup 예정).
//
// 설계 원칙:
//   - 5단계 패턴 (세션 → 역할 → 배정 → 비즈니스 → ActionResult)
//   - Legacy Action 재사용 (createRoadmap / confirmFinalRoadmap /
//     editRoadmapManually / exportRoadmapAsHwpxAction)
//   - camelCase payload 수용 후 Legacy snake_case 시그니처로 변환
//   - fetchRoadmapPageDataV2 는 page.tsx 초기 데이터 일괄 조회 (버전 목록 +
//     선택 버전 + 인터뷰 snapshot + HRD PDF signed URL 주입)
// ============================================================================

/** HRD 첨부 버킷 (interview/page.tsx 의 HRD_BUCKET 과 동일). */
const HRD_BUCKET_V2 = 'interview-attachments';

/**
 * HRD PDF url 을 항상 새 signed URL 로 정규화 (storage_path / 만료 signed URL 모두 처리).
 *
 * 공통 헬퍼 `resolveHrdSignedUrl` 위임 — 회귀 수정 (2026-05-18):
 * 이전 구현은 `url.startsWith('http')` 면 재발급을 건너뛰어 만료된 JWT 로
 * iframe.src 에 InvalidJWT JSON 이 노출되는 버그가 있었다.
 */
async function hydrateRoadmapHrdSignedUrl(
  interview: Partial<RoadmapInterviewStrict>
): Promise<Partial<RoadmapInterviewStrict>> {
  const hrd = interview.hrdReportPdf;
  if (!hrd || !hrd.url) return interview;
  const fresh = await resolveHrdSignedUrl(hrd.url, HRD_BUCKET_V2);
  if (!fresh || fresh === hrd.url) return interview;
  return {
    ...interview,
    hrdReportPdf: { ...hrd, url: fresh },
  };
}

/**
 * camelCase `RoadmapResultEditPayload` 중에서 `editRoadmapManually` 가 수용하는
 * Roadmap 소유 필드만 추려낸다 (payload 키와 1:1 대응하는 것만).
 *
 * ⚠️ 여기서 키가 빠지면 클라이언트가 보낸 편집이 서버까지 도달하지 못하고
 *    **조용히 유실**된다 (2026-05-18 회귀 이력: Ⅲ 표의 "행 추가" 미저장).
 *    양식 v2 의 Roadmap 소유 편집 필드는 Ⅰ-1 `setup_necessity` ·
 *    Ⅰ-3 `main_content` · Ⅲ `course_specs` 3종이며, `main_content` 만
 *    outcome_summary 병합이 필요해 `hydrateOutcomeSummary` 가 따로 처리한다.
 *
 * interview 원본 편집 필드(company_requirements / task_analysis* / target_task)는
 * `extractInterviewFieldsFromPayload` 가 담당한다.
 */
function extractRoadmapFieldsFromPayload(patch: RoadmapResultEditPayload): RoadmapEditableFields {
  const out: RoadmapEditableFields = {};
  if (patch.setup_necessity !== undefined) out.setup_necessity = patch.setup_necessity;
  // Ⅲ 훈련실시 계획 제안 — 누락 시 명세서 편집(6개 과정) 이 통째로 사라진다
  if (patch.course_specs !== undefined) out.course_specs = patch.course_specs;
  return out;
}

/**
 * Ⅰ-3 요약(`main_content`) → `outcome_summary` 완전체로 승격.
 *
 * `updateRoadmapManually` 는 outcome_summary 를 통째로 교체하므로, 현재 값을 읽어
 * main_content 만 갈아끼운 3필드 객체를 만들어야 나머지 두 필드(기업 AI 역량 수준·
 * 선정 과업) 가 초기화되지 않는다.
 *
 * 읽기는 세션 클라이언트(RLS 적용) 로 수행하고, 실제 쓰기 권한은 위임 대상인
 * `editRoadmapManually` 가 다시 검증한다.
 */
async function hydrateOutcomeSummary(
  versionId: string,
  mainContent: string
): Promise<RoadmapOutcomeSummary | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('roadmap_versions')
    .select('pbl_course')
    .eq('id', versionId)
    .maybeSingle();
  if (error || !row) return null;

  const current = fromRoadmapVersionColumns(row as { pbl_course?: unknown });
  return { ...current.outcome_summary, main_content: mainContent };
}

/**
 * 로드맵 결과 페이지 V2 — 새 버전 생성 (LLM 호출).
 *
 * 5단계 패턴 유지: Legacy `createRoadmap` 을 그대로 위임. 상위 page.tsx 가
 * LoadingOverlay cancel 을 위해 `cancelRoadmapGeneration` 과 함께 사용한다.
 */
export async function createRoadmapV2(
  projectId: string,
  revisionPrompt?: string
): Promise<ActionResult<Record<string, unknown>>> {
  return createRoadmap(projectId, revisionPrompt);
}

/**
 * 로드맵 결과 페이지 V2 — DRAFT 를 FINAL 로 확정.
 *
 * 5단계 패턴 유지: Legacy `confirmFinalRoadmap` 위임.
 */
export async function confirmFinalRoadmapV2(versionId: string): Promise<SimpleActionResult> {
  return confirmFinalRoadmap(versionId);
}

/**
 * `RoadmapResultEditPayload` 중 interview 원본 편집 슬라이스(camelCase 매핑) 추출.
 *
 * 결과 페이지에서 편집된 Ⅱ-2(기업 요구분석) · Ⅱ-3 과업 분석표 · Ⅱ-4 AI 적용 대상
 * 과업은 모두 `interviews` 행에 저장된다. snake_case 키 → camelCase 키 매핑 후
 * `saveRoadmapInterviewV2(autoSave: true)` 가 deepMerge 로 patch 적용.
 * (v2: 분석내용(task_analysis_note) 은 양식에서 삭제되어 편집 대상에서 제외.)
 */
function extractInterviewFieldsFromPayload(
  patch: RoadmapResultEditPayload
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.company_requirements !== undefined) {
    out.companyRequirements = patch.company_requirements;
  }
  if (patch.task_analysis !== undefined) {
    out.taskAnalysis = patch.task_analysis;
  }
  if (patch.target_task !== undefined) {
    out.targetTask = patch.target_task;
  }
  return out;
}

/**
 * 로드맵 결과 페이지 V2 — 인라인 편집 patch 반영.
 *
 * `RoadmapResultEditPayload` (camelCase + Ⅰ·Ⅱ·Ⅲ 혼재) 를 두 슬라이스로 분리해
 * 처리한다.
 *  - Roadmap 소유 필드 → `editRoadmapManually` (versions 행 편집)
 *  - Interview 원본 필드 → `saveRoadmapInterviewV2(autoSave: true)`
 *      (interviews 행 partial deepMerge 저장)
 *
 * 두 슬라이스가 동시에 포함될 수 있으며, 그 경우 interview 저장이 먼저 수행된다.
 */
export async function editRoadmapV2(
  versionId: string,
  patch: RoadmapResultEditPayload
): Promise<ActionResult<Record<string, unknown>>> {
  const roadmapFields = extractRoadmapFieldsFromPayload(patch);
  const interviewFields = extractInterviewFieldsFromPayload(patch);

  // Ⅰ-3 요약은 outcome_summary 하위 필드 — 현재 값과 병합해야 나머지 필드가 보존된다
  if (patch.main_content !== undefined) {
    const outcomeSummary = await hydrateOutcomeSummary(versionId, patch.main_content);
    if (!outcomeSummary) {
      return { success: false, error: '로드맵 버전을 찾을 수 없습니다.' };
    }
    roadmapFields.outcome_summary = outcomeSummary;
  }

  const hasRoadmap = Object.keys(roadmapFields).length > 0;
  const hasInterview = Object.keys(interviewFields).length > 0;

  if (!hasRoadmap && !hasInterview) {
    return { success: true, data: {} };
  }

  // Interview 원본 patch — versionId 로부터 projectId 조회 후 위임
  if (hasInterview) {
    const supabase = await createClient();
    const { data: version, error: versionErr } = await supabase
      .from('roadmap_versions')
      .select('project_id')
      .eq('id', versionId)
      .maybeSingle();
    if (versionErr || !version) {
      return { success: false, error: '로드맵 버전을 찾을 수 없습니다.' };
    }
    const projectId = (version as { project_id: string }).project_id;
    const interviewResult = await saveRoadmapInterviewV2(projectId, interviewFields, {
      autoSave: true,
    });
    if (!interviewResult.success) {
      return interviewResult as ActionResult<Record<string, unknown>>;
    }
  }

  // Roadmap 소유 patch
  if (hasRoadmap) {
    return editRoadmapManually(versionId, roadmapFields);
  }

  return { success: true, data: {} };
}

/**
 * 로드맵 결과 페이지 V2 — HWPX 다운로드.
 *
 * 5단계 패턴 유지: Legacy `exportRoadmapAsHwpxAction` 위임.
 */
export async function exportRoadmapHwpxV2(
  versionId: string
): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  return exportRoadmapAsHwpxAction(versionId);
}

/**
 * 로드맵 결과 페이지 V2 — 초기 데이터 일괄 조회.
 *
 * page.tsx 서버 컴포넌트에서 호출. 상위가 `versions` / `selectedVersion` /
 * `interview` 를 V2 Client 의 props 로 주입한다.
 *
 * - `versions`: 최신순. 빈 배열이면 "아직 생성된 로드맵이 없습니다".
 * - `selectedVersion`: versionId 지정 시 해당 버전, 아니면 FINAL → 없으면
 *   가장 최신 DRAFT → 없으면 첫 번째.
 * - `interview`: `fetchRoadmapInterviewV2` 재사용 + HRD PDF signed URL 주입.
 */
export interface RoadmapPageDataV2 {
  versions: RoadmapVersionUI[];
  selectedVersion: RoadmapVersionUI | null;
  interview: Partial<ResultInterviewSnapshot>;
  /**
   * #013 fix — EmptyState 가드 강화용. server-side 에서 자가진단 row 존재 여부와
   * 프로젝트 status 를 함께 fetch 해 클라이언트 가드에 prop drill 한다.
   */
  selfAssessmentExists: boolean;
  projectStatus: string;
}

export async function fetchRoadmapPageDataV2(
  projectId: string,
  versionId?: string
): Promise<ActionResult<RoadmapPageDataV2>> {
  try {
    // (1)+(2) 세션 + 역할 — 컨설턴트 + 운영·시스템관리자 (결과 열람 권한)
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'], {
      roleError: '로드맵 결과를 조회할 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, role, supabase } = auth;

    // (3) 프로젝트 배정 검증 — 컨설턴트만. OPS/시스템관리자는 전체 열람.
    if (role === 'CONSULTANT_APPROVED') {
      const access = await requireConsultantProjectAccess(
        supabase,
        user.id,
        projectId,
        '해당 프로젝트에 대한 접근 권한이 없습니다.'
      );
      if (access !== true) return { success: false, error: access.error };
    }

    // (4) 비즈니스 — 버전 목록
    const rawVersions = await fetchRoadmapVersionsService(projectId);
    // toRoadmapVersionUI 는 legacy raw row → UI 형태로 변환하되 `status` 를
    // 넓은 `string` 타입으로 반환. 런타임 값은 RoadmapVersionStatus 열거값만
    // 가능하므로 구조적 호환을 위해 단언.
    const versions = rawVersions.map(toRoadmapVersionUI) as unknown as RoadmapVersionUI[];

    // 선택 버전 결정: versionId > 최신(version_number DESC)
    // fetchRoadmapVersionsService 는 version_number DESC 정렬로 반환하므로
    // versions[0] 이 최신 버전. 컨설턴트가 작업 중인 DRAFT 를 우선 표출하는
    // 기존 V1 정책을 유지한다 (DRAFT 가 FINAL 보다 최신이면 DRAFT 선택).
    let selectedVersion: RoadmapVersionUI | null = null;
    if (versionId) {
      selectedVersion = versions.find((v) => v.id === versionId) ?? null;
    }
    if (!selectedVersion) {
      selectedVersion = versions[0] ?? null;
    }

    // 인터뷰 snapshot — fetchRoadmapInterviewV2 재사용 + HRD signed URL 주입.
    // fetchRoadmapInterviewV2 는 내부에서 역할/배정/트랙 을 재확인한다.
    // OPS_ADMIN / SYSTEM_ADMIN 은 해당 Action 이 null 을 반환하므로, admin
    // 경로는 interviews 를 직접 읽어 보강한다.
    let interviewSnapshot: Partial<ResultInterviewSnapshot> = {};
    if (role === 'CONSULTANT_APPROVED') {
      const interview = await fetchRoadmapInterviewV2(projectId);
      if (interview) {
        const hydrated = await hydrateRoadmapHrdSignedUrl(interview);
        interviewSnapshot = hydrated as Partial<ResultInterviewSnapshot>;
      }
    } else {
      // 관리자 경로 — 직접 interviews 테이블을 읽고 converter 로 변환
      const { mapDbToRoadmapInterview } = await import('@/lib/services/interview/converters');
      const admin = createAdminClient();
      const { data: row } = await admin
        .from('interviews')
        .select('company_details, job_tasks, improvement_goals')
        .eq('project_id', projectId)
        .maybeSingle();
      if (row) {
        const interview = mapDbToRoadmapInterview(row);
        const hydrated = await hydrateRoadmapHrdSignedUrl(interview);
        interviewSnapshot = hydrated as Partial<ResultInterviewSnapshot>;
      }
    }

    // #013 fix — 자가진단 존재 여부 + 프로젝트 status 를 클라이언트 EmptyState
    // 가드에 prop drill. 사전 차단으로 server-side 검증 fail 후 silent fail 방지.
    const admin = createAdminClient();
    const [{ data: selfAssessmentRow }, { data: projectRow }] = await Promise.all([
      admin.from('self_assessments').select('id').eq('project_id', projectId).maybeSingle(),
      admin.from('projects').select('status').eq('id', projectId).maybeSingle(),
    ]);

    return {
      success: true,
      data: {
        versions,
        selectedVersion,
        interview: interviewSnapshot,
        selfAssessmentExists: Boolean(selfAssessmentRow?.id),
        projectStatus: projectRow?.status ?? '',
      },
    };
  } catch (error) {
    console.error('[fetchRoadmapPageDataV2 Error]', error);
    return { success: false, error: '로드맵 결과 데이터 조회에 실패했습니다.' };
  }
}
