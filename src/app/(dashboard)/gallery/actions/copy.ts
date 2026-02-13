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

export async function copyRoadmapToProject(params: {
  sourceRoadmapVersionId: string;
  targetProjectId: string;
}): Promise<ActionResult<{ newVersionId: string; versionNumber: number }>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, supabase } = auth;

  const parsed = copyRoadmapSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
  }

  // 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    return errorResult('컨설턴트만 로드맵을 가져올 수 있습니다.');
  }

  // 대상 프로젝트 배정 확인
  const { data: projectData } = await supabase
    .from('projects')
    .select('id, assigned_consultant_id, company_name')
    .eq('id', params.targetProjectId)
    .single();

  if (!projectData || projectData.assigned_consultant_id !== user.id) {
    return errorResult('배정되지 않은 프로젝트입니다.');
  }

  const adminClient = createAdminClient();

  // 원본 로드맵 조회
  const { data: source } = await adminClient
    .from('roadmap_versions')
    .select(`
      diagnosis_summary,
      roadmap_matrix,
      pbl_course,
      courses,
      projects!inner (company_name)
    `)
    .eq('id', params.sourceRoadmapVersionId)
    .single();

  if (!source) {
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

  const sourceProject = source.projects as unknown as { company_name: string };

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

  // 감사 로그
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
