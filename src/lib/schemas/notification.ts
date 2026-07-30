import { z } from 'zod';
import { NOTIFICATION_TYPES } from '@/lib/constants/notification';

export const createNotificationSchema = z.object({
  user_id: z.string().uuid('유효한 사용자 ID가 필요합니다.'),
  type: z.enum(NOTIFICATION_TYPES, {
    errorMap: () => ({ message: '유효한 알림 유형이 필요합니다.' }),
  }),
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이내로 입력하세요.'),
  message: z.string().min(1, '내용을 입력하세요.').max(500, '내용은 500자 이내로 입력하세요.'),
  // #012 — **필수**. link 가 없는 알림은 클릭해도 목록만 닫히고 아무 화면도 열리지 않아
  // 사용자가 "클릭이 안 먹었나?" 하게 된다. 현재 앱의 알림 생성 10곳은 모두 link 를 담지만,
  // 새 알림 유형을 추가하며 빠뜨리는 것을 **생성 시점에** 막는다.
  // (UI 쪽에도 방어가 있다 — `NotificationBell` 은 link 가 없으면 전체 알림 목록으로 보낸다.)
  link: z.string().min(1, '이동 대상 링크가 필요합니다.').max(500),
});
