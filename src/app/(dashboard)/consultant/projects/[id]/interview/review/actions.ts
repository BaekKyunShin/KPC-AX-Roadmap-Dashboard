'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAuditLog } from '@/lib/services/audit';
import { saveRoadmapInterviewV2, savePBLInterviewV2 } from '../actions';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/**
 * PR5 (R6 spec) — 인터뷰 검토 페이지 (`/consultant/projects/[id]/interview/review`)
 * 의 직접 수정 / 결과 재생성 트리거 Server Actions.
 *
 * - editInterviewFieldRoadmap / editInterviewFieldPbl
 *     `saveRoadmapInterviewV2(.., autoSave: true)` / `savePBLInterviewV2(.., autoSave: true)`
 *     를 위임 호출 (status 전이 없는 partial 저장). 저장 성공 후 별도로
 *     `INTERVIEW_FIELD_EDITED` 감사로그를 남긴다.
 *
 * - triggerResultRegenerationFromReview
 *     검토 페이지의 stale 배너 [재생성] 버튼에서 호출. 실제 LLM 트리거는
 *     클라이언트가 결과 페이지(`/roadmap` or `/pbl-report`) 로 navigate 한 뒤
 *     기존 generate 액션을 호출하므로, 본 액션은 감사로그
 *     `RESULT_REGENERATED_FROM_REVIEW` 만 기록한다.
 */

interface ResultMeta {
  /** 최신 결과 created_at (ISO 문자열). 결과가 없으면 null. */
  createdAt: string | null;
  /** 최신 결과 status (DRAFT/FINAL/ARCHIVED). 결과가 없으면 null. */
  status: 'DRAFT' | 'FINAL' | 'ARCHIVED' | null;
  /** 최신 결과 ID (재생성 트리거 메타용). */
  versionId: string | null;
}

/**
 * 인터뷰 검토 페이지의 stale 배너 비교용 — 최신 결과(version)의 created_at·status 만 select.
 *
 * 결과가 없으면 모든 필드 null 반환 (배너 미노출).
 */
export async function fetchLatestResultMeta(
  projectId: string,
  track: 'ROADMAP' | 'PBL',
): Promise<ResultMeta> {
  const supabase = await createClient();
  if (track === 'ROADMAP') {
    const { data } = await supabase
      .from('roadmap_versions')
      .select('id, created_at, status')
      .eq('project_id', projectId)
      .neq('status', 'ARCHIVED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { createdAt: null, status: null, versionId: null };
    return {
      createdAt: data.created_at as string,
      status: data.status as ResultMeta['status'],
      versionId: data.id as string,
    };
  }
  const { data } = await supabase
    .from('pbl_reports')
    .select('id, created_at, status')
    .eq('project_id', projectId)
    .neq('status', 'ARCHIVED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { createdAt: null, status: null, versionId: null };
  return {
    createdAt: data.created_at as string,
    status: data.status as ResultMeta['status'],
    versionId: data.id as string,
  };
}

/**
 * 검토 페이지에서 인터뷰 단일/일부 필드 수정 (로드맵).
 *
 * `saveRoadmapInterviewV2(autoSave: true)` 위임 — status 전이 없이 jsonb partial 저장.
 * 본 액션 고유의 감사로그(`INTERVIEW_FIELD_EDITED`, source='REVIEW_PAGE`) 만 추가.
 */
export async function editInterviewFieldRoadmap(
  projectId: string,
  patch: Record<string, unknown>,
): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 인터뷰를 수정할 수 있습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // saveRoadmapInterviewV2 자체가 RLS·assignment 검증 + 저장을 수행
  const result = await saveRoadmapInterviewV2(projectId, patch, { autoSave: true });
  if (!result.success) return result;

  after(async () => {
    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'INTERVIEW_FIELD_EDITED',
        targetType: 'project',
        targetId: projectId,
        meta: {
          project_id: projectId,
          track: 'ROADMAP',
          field_paths: Object.keys(patch),
          source: 'REVIEW_PAGE',
        },
      });
    } catch (e) {
      console.error('[editInterviewFieldRoadmap] 감사로그 실패:', e);
    }
  });

  return { success: true };
}

/**
 * 검토 페이지에서 인터뷰 단일/일부 필드 수정 (PBL). 동일 패턴.
 */
export async function editInterviewFieldPbl(
  projectId: string,
  patch: Record<string, unknown>,
): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 인터뷰를 수정할 수 있습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  const result = await savePBLInterviewV2(projectId, patch, { autoSave: true });
  if (!result.success) return result;

  after(async () => {
    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'INTERVIEW_FIELD_EDITED',
        targetType: 'project',
        targetId: projectId,
        meta: {
          project_id: projectId,
          track: 'PBL',
          field_paths: Object.keys(patch),
          source: 'REVIEW_PAGE',
        },
      });
    } catch (e) {
      console.error('[editInterviewFieldPbl] 감사로그 실패:', e);
    }
  });

  return { success: true };
}

/**
 * 검토 페이지의 stale 배너 [재생성] 클릭 시 호출.
 *
 * 실제 LLM 트리거는 결과 페이지에서 수행되므로 본 액션은 감사로그만 남긴다.
 * 호출부는 success 후 결과 페이지로 navigate.
 */
export async function triggerResultRegenerationFromReview(
  projectId: string,
  track: 'ROADMAP' | 'PBL',
): Promise<ActionResult<{ resultPath: string }>> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 결과 재생성을 트리거할 수 있습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 배정 검증 + 최신 result meta (감사로그 메타용)
  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, assigned_consultant_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
  if (project.assigned_consultant_id !== user.id) {
    return { success: false, error: '배정된 컨설턴트만 결과 재생성을 트리거할 수 있습니다.' };
  }

  const meta = await fetchLatestResultMeta(projectId, track);

  await createAuditLog({
    actorUserId: user.id,
    action: 'RESULT_REGENERATED_FROM_REVIEW',
    targetType: track === 'ROADMAP' ? 'roadmap' : 'pbl_report',
    targetId: meta.versionId ?? projectId,
    meta: {
      project_id: projectId,
      track,
      triggered_from: 'REVIEW_BANNER',
      previous_version_id: meta.versionId,
      previous_version_status: meta.status,
    },
  });

  return {
    success: true,
    data: {
      resultPath:
        track === 'ROADMAP'
          ? `/consultant/projects/${projectId}/roadmap`
          : `/consultant/projects/${projectId}/pbl`,
    },
  };
}
