'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import { createAuditLog } from '@/lib/services/audit';
import { deleteProjectSchema, type DeleteProjectInput } from '@/lib/schemas/project';
import type { SimpleActionResult } from '@/lib/types/action-result';

/**
 * 프로젝트 + 연관 데이터 영구 삭제 (OPS_ADMIN, SYSTEM_ADMIN).
 *
 * 동작:
 * 1. 인증 + 역할 가드
 * 2. Zod 검증
 * 3. 프로젝트 존재 + 회사명 추출
 * 4. 확인 문구(`{회사명} 삭제`) 일치 검증
 * 5. Storage 정리 (best-effort, 실패해도 DB 삭제 진행)
 * 6. DB delete — 9개 자식 테이블은 ON DELETE CASCADE 로 자동 정리
 * 7. 감사로그 + revalidate
 */
export async function deleteProject(input: DeleteProjectInput): Promise<SimpleActionResult> {
  // 1. 인증 + 역할 가드
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 2. Zod 검증
  const validation = deleteProjectSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }
  const { project_id, confirm_text } = validation.data;

  const adminSupabase = createAdminClient();

  // 3. 프로젝트 조회 (회사명 추출)
  const { data: project, error: fetchError } = await adminSupabase
    .from('projects')
    .select('company_name')
    .eq('id', project_id)
    .maybeSingle();

  if (fetchError) {
    console.error('[deleteProject] 프로젝트 조회 실패:', fetchError.message);
    return { success: false, error: '프로젝트 조회에 실패했습니다.' };
  }
  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
  }

  const companyName = project.company_name;

  // 4. 확인 문구 검증
  const expectedConfirmText = `${companyName} 삭제`;
  if (confirm_text !== expectedConfirmText) {
    return {
      success: false,
      error: `확인 문구가 일치하지 않습니다. "${expectedConfirmText}" 를 정확히 입력하세요.`,
    };
  }

  // 5. Storage 정리 (best-effort)
  try {
    const bucket = adminSupabase.storage.from('interview-attachments');
    const { data: files } = await bucket.list(project_id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${project_id}/${f.name}`);
      await bucket.remove(paths);
    }
  } catch (e) {
    console.error(
      '[deleteProject] Storage 정리 실패 (DB 삭제는 진행):',
      e instanceof Error ? e.message : String(e)
    );
  }

  // 6. DB 삭제 (CASCADE)
  const { error: deleteError } = await adminSupabase.from('projects').delete().eq('id', project_id);

  if (deleteError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_DELETE',
      targetType: 'project',
      targetId: project_id,
      meta: { company_name: companyName },
      success: false,
      errorMessage: deleteError.message,
    });
    console.error('[deleteProject] DB 삭제 실패:', deleteError.message);
    return { success: false, error: '프로젝트 삭제에 실패했습니다.' };
  }

  // 7. 감사로그 + revalidate
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_DELETE',
      targetType: 'project',
      targetId: project_id,
      meta: { company_name: companyName },
    });
  });

  revalidatePath('/ops/projects');

  return { success: true };
}
