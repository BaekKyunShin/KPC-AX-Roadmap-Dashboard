'use server';

import { createClient } from '@/lib/supabase/server';
import type { Notification } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import { NOTIFICATION_PAGE_SIZE } from '@/lib/constants/notification';

/**
 * 현재 로그인한 사용자의 알림 목록 조회
 * - RLS가 user_id 기준 필터링을 보장
 * - 최신순 정렬, 페이지네이션 지원
 */
export async function fetchNotifications(
  page: number = 1,
): Promise<ActionResult<{ notifications: Notification[]; hasMore: boolean }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const offset = (page - 1) * NOTIFICATION_PAGE_SIZE;

    // N+1 fetch: PAGE_SIZE+1건을 요청하여 다음 페이지 존재 여부를 판단
    // Supabase .range(from, to)는 inclusive이므로 +1이 자동으로 적용됨
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + NOTIFICATION_PAGE_SIZE);

    if (error) {
      console.error('[fetchNotifications]', error);
      return { success: false, error: '알림 조회에 실패했습니다.' };
    }

    const fetched = data || [];
    const hasMore = fetched.length > NOTIFICATION_PAGE_SIZE;

    return {
      success: true,
      data: {
        notifications: hasMore ? fetched.slice(0, NOTIFICATION_PAGE_SIZE) : fetched,
        hasMore,
      },
    };
  } catch (err) {
    console.error('[fetchNotifications] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 안읽음 알림 카운트 조회 (레이아웃용)
 * - 에러 시 0 반환 (UI 영향 최소화)
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[fetchUnreadCount]', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * 단일 알림 읽음 처리
 * - RLS가 본인 알림만 업데이트하도록 보장
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[markNotificationRead]', error);
      return { success: false, error: '알림 읽음 처리에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[markNotificationRead] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 모든 알림 읽음 처리
 * - RLS가 본인 알림만 업데이트하도록 보장
 */
export async function markAllNotificationsRead(): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[markAllNotificationsRead]', error);
      return { success: false, error: '모두 읽음 처리에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[markAllNotificationsRead] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
