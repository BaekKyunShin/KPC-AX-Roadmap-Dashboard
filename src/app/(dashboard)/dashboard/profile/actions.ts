'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/actions/auth-helpers';
import { EMAIL_NOTIFY_ROLES } from '@/lib/constants/message';
import type { SimpleActionResult } from '@/lib/types/action-result';

/**
 * 이메일 알림 설정 변경
 * - EMAIL_NOTIFY_ROLES(관리자 + 컨설턴트)만 가능
 * - users.email_notify_enabled 업데이트
 */
export async function updateEmailNotifySetting(
  enabled: boolean,
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const adminSupabase = createAdminClient();

    // 역할 확인
    const { data: userData } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !EMAIL_NOTIFY_ROLES.includes(userData.role)) {
      return { success: false, error: '이 기능을 사용할 수 없는 역할입니다.' };
    }

    const { error } = await adminSupabase
      .from('users')
      .update({ email_notify_enabled: enabled })
      .eq('id', user.id);

    if (error) {
      console.error('[updateEmailNotifySetting Error]', error);
      return { success: false, error: '설정 변경에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateEmailNotifySetting Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
