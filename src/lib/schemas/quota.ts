import { z } from 'zod';

/** 쿼터 한도 범위 상수 */
const MIN_LIMIT = 1;
const MAX_DAILY_LIMIT = 500;
const MAX_MONTHLY_LIMIT = 10000;

/** 쿼터 수정 스키마 */
export const updateQuotaSchema = z
  .object({
    userId: z.string().uuid('유효하지 않은 사용자 ID입니다.'),
    dailyLimit: z
      .number()
      .int('일별 한도는 정수여야 합니다.')
      .min(MIN_LIMIT, `일별 한도는 최소 ${MIN_LIMIT} 이상이어야 합니다.`)
      .max(MAX_DAILY_LIMIT, `일별 한도는 최대 ${MAX_DAILY_LIMIT} 이하여야 합니다.`)
      .optional(),
    monthlyLimit: z
      .number()
      .int('월별 한도는 정수여야 합니다.')
      .min(MIN_LIMIT, `월별 한도는 최소 ${MIN_LIMIT} 이상이어야 합니다.`)
      .max(MAX_MONTHLY_LIMIT, `월별 한도는 최대 ${MAX_MONTHLY_LIMIT} 이하여야 합니다.`)
      .optional(),
  })
  .refine((data) => data.dailyLimit !== undefined || data.monthlyLimit !== undefined, {
    message: '일별 한도 또는 월별 한도 중 하나 이상을 입력해야 합니다.',
  });
