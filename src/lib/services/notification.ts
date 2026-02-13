import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationSchema } from '@/lib/schemas/notification';
import type { NotificationType } from '@/types/database';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * 알림 생성 (서버 사이드 전용)
 * Server Action이나 서비스에서 호출하여 알림을 INSERT한다.
 * admin 클라이언트(service_role)를 사용하여 RLS를 우회한다.
 * 실패해도 메인 로직에 영향을 주지 않도록 에러를 로깅만 한다.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const validation = createNotificationSchema.safeParse({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    });

    if (!validation.success) {
      console.error('[createNotification Error] 검증 실패:', validation.error.errors);
      return;
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from('notifications').insert({
      user_id: validation.data.user_id,
      type: validation.data.type,
      title: validation.data.title,
      message: validation.data.message,
      link: validation.data.link,
    });

    if (error) {
      console.error('[createNotification Error]', error);
    }
  } catch (error) {
    console.error('[createNotification Error]', error);
  }
}

interface AdminNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * 모든 운영관리자 + 시스템관리자에게 알림 생성
 * 프로젝트 진행 상태 알림에 사용한다.
 * 실패해도 메인 로직에 영향을 주지 않도록 에러를 로깅만 한다.
 */
export async function createNotificationForAdmins(
  params: AdminNotificationParams,
): Promise<void> {
  try {
    const adminSupabase = createAdminClient();
    const { data: admins, error } = await adminSupabase
      .from('users')
      .select('id')
      .in('role', ['OPS_ADMIN', 'SYSTEM_ADMIN'])
      .eq('status', 'ACTIVE');

    if (error || !admins || admins.length === 0) {
      if (error) console.error('[createNotificationForAdmins Error] 관리자 조회:', error);
      return;
    }

    // Bulk INSERT로 한 번에 처리
    const rows = admins.map((admin) => ({
      user_id: admin.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    }));

    const { error: insertError } = await adminSupabase
      .from('notifications')
      .insert(rows);

    if (insertError) {
      console.error('[createNotificationForAdmins Error]', insertError);
    }
  } catch (error) {
    console.error('[createNotificationForAdmins Error]', error);
  }
}
