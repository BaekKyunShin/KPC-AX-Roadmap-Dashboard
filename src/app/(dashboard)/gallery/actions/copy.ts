'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import { copyRoadmapSchema } from '@/lib/schemas/gallery';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';

// =============================================================================
// 로드맵 복제 (가져다 쓰기)
// =============================================================================

/** sourceResult 쿼리 행 타입 (.returns<> 용) */
interface SourceRoadmapRow {
  diagnosis_summary: string;
  roadmap_matrix: unknown;
  pbl_course: unknown;
  courses: unknown;
  projects: { company_name: string };
}

export async function copyRoadmapToProject(params: {
  sourceRoadmapVersionId: string;
  targetProjectId: string;
}): Promise<ActionResult<{ newVersionId: string; versionNumber: number }>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, supabase, role } = auth;

  const parsed = copyRoadmapSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
  }

  if (role !== 'CONSULTANT_APPROVED') {
    return errorResult('컨설턴트만 로드맵을 가져올 수 있습니다.');
  }

  const adminClient = createAdminClient();

  // 대상 프로젝트 배정 확인 + 원본 로드맵 조회 (독립적이므로 병렬 실행)
  const [projectResult, sourceResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, assigned_consultant_id, company_name')
      .eq('id', params.targetProjectId)
      .single(),
    adminClient
      .from('roadmap_versions')
      .select(`
        diagnosis_summary,
        roadmap_matrix,
        pbl_course,
        courses,
        projects!inner (company_name)
      `)
      .eq('id', params.sourceRoadmapVersionId)
      .returns<SourceRoadmapRow[]>()
      .single(),
  ]);

  const { data: projectData, error: projectError } = projectResult;
  const { data: source, error: sourceError } = sourceResult;

  if (projectError || !projectData || projectData.assigned_consultant_id !== user.id) {
    return errorResult('배정되지 않은 프로젝트입니다.');
  }

  if (sourceError || !source) {
    return errorResult('원본 로드맵을 찾을 수 없습니다.');
  }

  // 대상 프로젝트의 다음 버전 번호 계산
  const { data: existingVersions } = await adminClient
    .from('roadmap_versions')
    .select('version_number')
    .eq('project_id', params.targetProjectId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersionNumber = existingVersions && existingVersions.length > 0
    ? existingVersions[0].version_number + 1
    : 1;

  const sourceProject = source.projects;

  // 새 DRAFT 버전 생성
  const { data: newVersion, error } = await adminClient
    .from('roadmap_versions')
    .insert({
      project_id: params.targetProjectId,
      version_number: nextVersionNumber,
      status: 'DRAFT',
      diagnosis_summary: source.diagnosis_summary,
      roadmap_matrix: source.roadmap_matrix,
      pbl_course: source.pbl_course,
      courses: source.courses,
      revision_prompt: `갤러리에서 가져옴 (원본: ${sourceProject.company_name} 로드맵)`,
      created_by: user.id,
    })
    .select('id, version_number')
    .single();

  if (error || !newVersion) {
    console.error('[copyRoadmapToProject Error]', error);
    return errorResult('로드맵 복제 중 오류가 발생했습니다.');
  }

  // 감사로그
  await createAuditLog({
    actorUserId: user.id,
    action: 'ROADMAP_COPY',
    targetType: 'roadmap_version',
    targetId: newVersion.id,
    meta: {
      sourceRoadmapVersionId: params.sourceRoadmapVersionId,
      sourceCompany: sourceProject.company_name,
      targetProjectId: params.targetProjectId,
      targetCompany: projectData.company_name,
      newVersionNumber: nextVersionNumber,
    },
  });

  revalidatePath(`/consultant/projects/${params.targetProjectId}/roadmap`);
  revalidatePath('/gallery');

  return successResult({
    newVersionId: newVersion.id,
    versionNumber: newVersion.version_number,
  });
}
