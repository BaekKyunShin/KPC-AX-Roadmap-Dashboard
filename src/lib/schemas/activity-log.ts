import { z } from 'zod';

import {
  ACTIVITY_LOG_MAX_LENGTH,
  MANUAL_ACTIVITY_LOG_TYPES,
} from '@/lib/constants/activity-log';

// 활동 일지 생성 스키마
export const createActivityLogSchema = z.object({
  type: z.enum(MANUAL_ACTIVITY_LOG_TYPES, {
    errorMap: () => ({ message: '활동 유형을 선택하세요.' }),
  }),
  content: z
    .string()
    .min(1, '내용을 입력하세요.')
    .max(ACTIVITY_LOG_MAX_LENGTH, `내용은 ${ACTIVITY_LOG_MAX_LENGTH}자 이내로 입력하세요.`),
});

// 활동 일지 수정 스키마
export const updateActivityLogSchema = z.object({
  content: z
    .string()
    .min(1, '내용을 입력하세요.')
    .max(ACTIVITY_LOG_MAX_LENGTH, `내용은 ${ACTIVITY_LOG_MAX_LENGTH}자 이내로 입력하세요.`),
});

// 타입 추출
export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;
export type UpdateActivityLogInput = z.infer<typeof updateActivityLogSchema>;
