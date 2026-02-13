'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAllUsersUsage, updateUserQuota, getUserUsage } from '@/lib/services/quota';
import { canManageUser } from '@/lib/constants/status';
import type { UserRole } from '@/types/database';
import { requireAuth, requireAuthWithRole } from '@/lib/actions/auth-helpers';

export interface UsageStats {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  monthlyUsage: number;
  dailyLimit: number;
  monthlyLimit: number;
  usagePercent: number;
}

/**
 * 전체 사용량 통계 조회
 * - SYSTEM_ADMIN: 운영관리자 + 컨설턴트 조회 가능
 * - OPS_ADMIN: 컨설턴트만 조회 가능
 */
export async function fetchUsageStats(options: {
  page?: number;
  limit?: number;
  month?: string;
}) {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
  if ('error' in auth) return { users: [], total: 0, page: 1, limit: 20, totalPages: 0, month: '' };

  return await getAllUsersUsage({
    ...options,
    currentUserRole: auth.role,
  });
}

/**
 * 사용자 쿼터 수정
 * - SYSTEM_ADMIN: 운영관리자 + 컨설턴트 쿼터 수정 가능
 * - OPS_ADMIN: 컨설턴트 쿼터만 수정 가능
 */
export async function updateQuota(
  userId: string,
  dailyLimit?: number,
  monthlyLimit?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };

    // 대상 사용자의 역할 확인
    const adminSupabase = createAdminClient();
    const { data: targetUser } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return { success: false, error: '대상 사용자를 찾을 수 없습니다.' };
    }

    // 현재 사용자가 대상 사용자의 쿼터를 수정할 권한이 있는지 확인
    if (!canManageUser(auth.role, targetUser.role as UserRole)) {
      return { success: false, error: '해당 사용자의 쿼터를 수정할 권한이 없습니다.' };
    }

    await updateUserQuota(userId, dailyLimit, monthlyLimit);
    return { success: true };
  } catch (error) {
    console.error('[updateQuota Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '쿼터 수정에 실패했습니다.',
    };
  }
}

/**
 * 내 사용량 조회
 */
export async function fetchMyUsage() {
  const auth = await requireAuth();
  if ('error' in auth) return null;

  return await getUserUsage(auth.user.id);
}
