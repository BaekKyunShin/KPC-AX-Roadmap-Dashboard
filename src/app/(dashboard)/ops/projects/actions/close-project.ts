'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import { createAuditLog } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notification';
import {
  closeProjectSchema,
  reopenProjectSchema,
  type CloseProjectInput,
  type ReopenProjectInput,
} from '@/lib/schemas/project';
import type { SimpleActionResult } from '@/lib/types/action-result';

/** close_project_administratively / reopen_project RPC 반환 (판별 유니온) */
type ClosureRpcResult =
  | {
      success: true;
      previous_status?: string;
      restored_status?: string;
      assigned_consultant_id: string | null;
    }
  | { success: false; error: string };

/** 종결/해제 공통 캐시 무효화 — ops 2경로 + 컨설턴트 상세·홈 */
function revalidateClosurePaths(projectId: string) {
  revalidatePath('/ops/projects');
  revalidatePath(`/ops/projects/${projectId}`);
  revalidatePath(`/consultant/projects/${projectId}`);
  revalidatePath('/consultant/home');
}

/**
 * 배정 컨설턴트에게 종결/해제 알림 발송 (best-effort).
 * 테스트 모드 프로젝트는 발송하지 않는다 (finalizeRoadmap 알림 가드와 동일).
 */
async function notifyAssignedConsultant(
  adminSupabase: ReturnType<typeof createAdminClient>,
  projectId: string,
  consultantId: string,
  build: (companyName: string) => { title: string; message: string }
) {
  const { data: projectInfo } = await adminSupabase
    .from('projects')
    .select('company_name, is_test_mode')
    .eq('id', projectId)
    .maybeSingle();

  if (projectInfo?.is_test_mode) return;

  const { title, message } = build(projectInfo?.company_name || '(알 수 없는 기업)');
  await createNotification({
    userId: consultantId,
    type: 'status_change',
    title,
    message,
    link: `/consultant/projects/${projectId}`,
  });
}

/**
 * 프로젝트 행정 종결 (OPS_ADMIN, SYSTEM_ADMIN).
 *
 * 초안 유무와 무관하게 status→FINALIZED + 종결 메타 4필드를 기록한다.
 * 로드맵/PBL 버전 데이터는 건드리지 않는다 (DRAFT 승격 금지).
 * 상태 검증(이미 종결/정식 확정 거부)은 RPC가 FOR UPDATE로 원자적으로 수행.
 */
export async function closeProject(input: CloseProjectInput): Promise<SimpleActionResult> {
  // 1. 인증 + 역할 가드
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 2. Zod 검증
  const validation = closeProjectSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }
  const { project_id, reason } = validation.data;

  // 3. 원자적 종결 RPC
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.rpc('close_project_administratively', {
    p_project_id: project_id,
    p_closed_by: user.id,
    p_reason: reason,
  });

  if (error || !data) {
    console.error('[closeProject] RPC 실패:', error?.message);
    return { success: false, error: '프로젝트 종결에 실패했습니다.' };
  }

  const result = data as ClosureRpcResult;

  if (!result.success) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_ADMIN_CLOSED',
      targetType: 'project',
      targetId: project_id,
      meta: { reason },
      success: false,
      errorMessage: result.error,
    });
    return { success: false, error: result.error };
  }

  const { previous_status, assigned_consultant_id } = result;

  // 4. 감사로그 + 컨설턴트 알림 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_ADMIN_CLOSED',
      targetType: 'project',
      targetId: project_id,
      meta: { reason, previous_status },
    });

    if (assigned_consultant_id) {
      await notifyAssignedConsultant(
        adminSupabase,
        project_id,
        assigned_consultant_id,
        (companyName) => ({
          title: '프로젝트 종결',
          message: `${companyName} 프로젝트가 운영관리자에 의해 종결 처리되었습니다. 산출물 열람과 내보내기는 계속 가능합니다.`,
        })
      );
    }
  });

  // 5. 캐시 무효화
  revalidateClosurePaths(project_id);

  return { success: true };
}

/**
 * 행정 종결 해제 (OPS_ADMIN, SYSTEM_ADMIN).
 *
 * closed_from_status로 status를 복원하고 종결 메타 4필드를 초기화한다.
 * 정식 확정(FINALIZED + 메타 NULL) 프로젝트는 RPC가 거부한다.
 */
export async function reopenProject(input: ReopenProjectInput): Promise<SimpleActionResult> {
  // 1. 인증 + 역할 가드
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 2. Zod 검증
  const validation = reopenProjectSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }
  const { project_id } = validation.data;

  // 3. 원자적 해제 RPC
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.rpc('reopen_project', {
    p_project_id: project_id,
  });

  if (error || !data) {
    console.error('[reopenProject] RPC 실패:', error?.message);
    return { success: false, error: '종결 해제에 실패했습니다.' };
  }

  const result = data as ClosureRpcResult;

  if (!result.success) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_REOPENED',
      targetType: 'project',
      targetId: project_id,
      success: false,
      errorMessage: result.error,
    });
    return { success: false, error: result.error };
  }

  const { restored_status, assigned_consultant_id } = result;

  // 4. 감사로그 + 컨설턴트 알림 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_REOPENED',
      targetType: 'project',
      targetId: project_id,
      meta: { restored_status },
    });

    if (assigned_consultant_id) {
      await notifyAssignedConsultant(
        adminSupabase,
        project_id,
        assigned_consultant_id,
        (companyName) => ({
          title: '프로젝트 종결 해제',
          message: `${companyName} 프로젝트의 종결이 해제되어 이전 상태로 복원되었습니다.`,
        })
      );
    }
  });

  // 5. 캐시 무효화
  revalidateClosurePaths(project_id);

  return { success: true };
}
