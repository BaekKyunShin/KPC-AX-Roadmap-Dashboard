'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SimpleActionResult, ActionResult } from '@/lib/types/action-result';

const EMAIL_NOTIFY_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN', 'CONSULTANT_APPROVED'];

/**
 * 현재 사용자의 이메일 알림 설정 조회
 * - 관리자(OPS_ADMIN, SYSTEM_ADMIN)만 사용 가능
 * - 관리자가 아니면 error 반환 (UI에서 조건부 렌더링에 활용)
 */
export async function fetchEmailNotifySetting(): Promise<
  ActionResult<{ enabled: boolean }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('users')
      .select('role, email_notify_enabled')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: '설정을 불러올 수 없습니다.' };
    }

    if (!EMAIL_NOTIFY_ROLES.includes(data.role)) {
      return { success: false, error: '이 기능을 사용할 수 없는 역할입니다.' };
    }

    return { success: true, data: { enabled: data.email_notify_enabled } };
  } catch (err) {
    console.error('[fetchEmailNotifySetting] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 이메일 알림 설정 변경
 * - 관리자만 가능
 * - users.email_notify_enabled 업데이트
 */
export async function updateEmailNotifySetting(
  enabled: boolean,
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

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
      console.error('[updateEmailNotifySetting]', error);
      return { success: false, error: '설정 변경에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[updateEmailNotifySetting] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
