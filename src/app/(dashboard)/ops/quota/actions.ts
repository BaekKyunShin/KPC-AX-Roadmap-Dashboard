'use server';

import { createClient } from '@/lib/supabase/server';
import { getAllUsersUsage, updateUserQuota, getUserUsage } from '@/lib/services/quota';

export interface UsageStats {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  monthlyUsage: number;
  tokensIn: number;
  tokensOut: number;
  dailyLimit: number;
  monthlyLimit: number;
  usagePercent: number;
}

/**
 * 전체 사용량 통계 조회
 */
export async function fetchUsageStats(options: {
  page?: number;
  limit?: number;
  month?: string;
}) {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { users: [], total: 0, page: 1, limit: 20, totalPages: 0, month: '' };
  }

  // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    return { users: [], total: 0, page: 1, limit: 20, totalPages: 0, month: '' };
  }

  return await getAllUsersUsage(options);
}

/**
 * 사용자 쿼터 수정
 */
export async function updateQuota(
  userId: string,
  dailyLimit?: number,
  monthlyLimit?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  return await getUserUsage(user.id);
}
