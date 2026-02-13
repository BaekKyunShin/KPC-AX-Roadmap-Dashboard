'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import type { Notification } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import { NOTIFICATION_PAGE_SIZE, NOTIFICATION_TYPES } from '@/lib/constants/notification';

/**
 * 현재 로그인한 사용자의 알림 목록 조회
 * - RLS가 user_id 기준 필터링을 보장
 * - 최신순 정렬, 페이지네이션 지원
 * - filter가 있으면 해당 type만 조회, 없으면 message 제외 전체
 */
export async function fetchNotifications(
  page: number = 1,
  filter?: string,
): Promise<ActionResult<{ notifications: Notification[]; hasMore: boolean }>> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const offset = (page - 1) * NOTIFICATION_PAGE_SIZE;

    // N+1 fetch: PAGE_SIZE+1건을 요청하여 다음 페이지 존재 여부를 판단
    // Supabase .range(from, to)는 inclusive이므로 +1이 자동으로 적용됨
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (filter) {
      // 허용된 타입만 필터링 (message 제외)
      const allowedTypes = NOTIFICATION_TYPES.filter((t) => t !== 'message');
      if (!allowedTypes.includes(filter as (typeof allowedTypes)[number])) {
        return { success: false, error: '유효하지 않은 필터입니다.' };
      }
      query = query.eq('type', filter);
    } else {
      // 메시지 알림은 벨에서 표시하지 않음 (MessageIcon이 별도 처리)
      query = query.neq('type', 'message');
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + NOTIFICATION_PAGE_SIZE);

    if (error) {
      console.error('[fetchNotifications Error]', error);
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
  } catch (error) {
    console.error('[fetchNotifications Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 안읽음 알림 카운트 조회 (레이아웃용)
 * - 메시지 알림은 제외 (MessageIcon이 별도 처리)
 * - 에러 시 0 반환 (UI 영향 최소화)
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return 0;
    const { user, supabase } = auth;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .neq('type', 'message');

    if (error) {
      console.error('[fetchUnreadCount Error]', error);
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
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[markNotificationRead Error]', error);
      return { success: false, error: '알림 읽음 처리에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[markNotificationRead Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 모든 알림 읽음 처리
 * - 메시지 알림은 제외 (MessageIcon이 별도 처리)
 * - RLS가 본인 알림만 업데이트하도록 보장
 */
export async function markAllNotificationsRead(): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .neq('type', 'message');

    if (error) {
      console.error('[markAllNotificationsRead Error]', error);
      return { success: false, error: '모두 읽음 처리에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[markAllNotificationsRead Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
