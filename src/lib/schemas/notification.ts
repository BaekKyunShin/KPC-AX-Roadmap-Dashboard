import { z } from 'zod';
import { NOTIFICATION_TYPES } from '@/lib/constants/notification';

export const createNotificationSchema = z.object({
  user_id: z.string().uuid('유효한 사용자 ID가 필요합니다.'),
  type: z.enum(NOTIFICATION_TYPES, {
    errorMap: () => ({ message: '유효한 알림 유형이 필요합니다.' }),
  }),
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이내로 입력하세요.'),
  message: z.string().min(1, '내용을 입력하세요.').max(500, '내용은 500자 이내로 입력하세요.'),
  link: z.string().max(500).optional(),
});
