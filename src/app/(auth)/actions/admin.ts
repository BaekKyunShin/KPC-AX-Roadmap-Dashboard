'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import type { ActionResult } from './auth';

/**
 * 사용자 승인/정지 (OPS_ADMIN/SYSTEM_ADMIN 전용)
 * - USER_PENDING → CONSULTANT_APPROVED (컨설턴트 승인, OPS_ADMIN/SYSTEM_ADMIN 가능)
 * - OPS_ADMIN_PENDING → OPS_ADMIN (운영관리자 승인, SYSTEM_ADMIN만 가능)
 */
export async function updateUserStatus(
  targetUserId: string,
  action: 'approve' | 'suspend' | 'reactivate',
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: '인증되지 않은 사용자입니다.',
    };
  }

  // 현재 사용자 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return {
      success: false,
      error: '권한이 없습니다.',
    };
  }

  // admin 클라이언트로 상태 변경
  const adminSupabase = createAdminClient();

  // 대상 사용자 정보 조회
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('role')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) {
    return {
      success: false,
      error: '대상 사용자를 찾을 수 없습니다.',
    };
  }

  let updateData: { role?: string; status?: string } = {};
  let auditAction: 'USER_APPROVE' | 'USER_SUSPEND' | 'USER_REACTIVATE';

  switch (action) {
    case 'approve':
      // 운영관리자 승인은 SYSTEM_ADMIN만 가능
      if (targetUser.role === 'OPS_ADMIN_PENDING') {
        if (currentUser.role !== 'SYSTEM_ADMIN') {
          return {
            success: false,
            error: '운영관리자 승인은 시스템 관리자만 가능합니다.',
          };
        }
        updateData = { role: 'OPS_ADMIN' };
      } else if (targetUser.role === 'USER_PENDING') {
        updateData = { role: 'CONSULTANT_APPROVED' };
      } else {
        return {
          success: false,
          error: '승인할 수 없는 사용자입니다.',
        };
      }
      auditAction = 'USER_APPROVE';
      break;
    case 'suspend':
      updateData = { status: 'SUSPENDED' };
      auditAction = 'USER_SUSPEND';
      break;
    case 'reactivate':
      updateData = { status: 'ACTIVE' };
      auditAction = 'USER_REACTIVATE';
      break;
  }

  const { error } = await adminSupabase
    .from('users')
    .update(updateData)
    .eq('id', targetUserId);

  if (error) {
    await createAuditLog({
      actorUserId: user.id,
      action: auditAction,
      targetType: 'user',
      targetId: targetUserId,
      meta: { reason },
      success: false,
      errorMessage: error.message,
    });

    return {
      success: false,
      error: `상태 변경 실패: ${error.message}`,
    };
  }

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: auditAction,
    targetType: 'user',
    targetId: targetUserId,
    meta: { reason },
  });

  return {
    success: true,
  };
}
