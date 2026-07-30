import { createAdminClient } from '@/lib/supabase/admin';
import { createNotificationSchema } from '@/lib/schemas/notification';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import type { NotificationType } from '@/types/database';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /**
   * 클릭 시 이동할 경로 — **필수**(#012).
   *
   * 알림을 눌렀을 때 갈 곳이 없으면 목록만 닫히고 아무 일도 일어나지 않아 사용자가
   * 클릭 실패로 오해한다. optional 이던 시절에도 실제 호출처 10곳은 모두 값을 넣었으므로
   * 필수로 바꿔 **새 알림 유형에서 빠뜨리면 컴파일이 막게** 한다.
   */
  link: string;
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
  /** 클릭 시 이동할 경로 — **필수**. 근거는 `CreateNotificationParams.link` 참조(#012). */
  link: string;
}

/**
 * 모든 운영관리자 + 시스템관리자에게 알림 생성
 * 프로젝트 진행 상태 알림에 사용한다.
 * 실패해도 메인 로직에 영향을 주지 않도록 에러를 로깅만 한다.
 *
 * ⚠️ `createNotification` 과 달리 이 함수는 **Zod 검증을 거치지 않는다**(bulk insert 경로).
 * 따라서 `link` 누락은 위 `AdminNotificationParams` 가 필수로 선언해 **컴파일 시점에** 막는다 —
 * 런타임 방어를 기대하지 말 것(#012).
 */
export async function createNotificationForAdmins(params: AdminNotificationParams): Promise<void> {
  try {
    const adminSupabase = createAdminClient();
    const { data: admins, error } = await adminSupabase
      .from('users')
      .select('id')
      .in('role', [...OPS_MANAGER_ROLES])
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

    const { error: insertError } = await adminSupabase.from('notifications').insert(rows);

    if (insertError) {
      console.error('[createNotificationForAdmins Error]', insertError);
    }
  } catch (error) {
    console.error('[createNotificationForAdmins Error]', error);
  }
}
