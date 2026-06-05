import { z } from 'zod';

import { selfAssessmentAnswerSchema } from './project';

// 토큰 생성 스키마 (OPS_ADMIN용)
export const createAssessmentTokenSchema = z.object({
  project_id: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
  expires_in_days: z.coerce
    .number()
    .int()
    .min(1, '만료일은 최소 1일입니다.')
    .max(60, '만료일은 최대 60일입니다.')
    .default(14),
});

// 공개 자가진단 제출 스키마
export const publicSelfAssessmentSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다.'),
  submitted_by_name: z
    .string()
    .min(2, '이름을 2자 이상 입력하세요.')
    .max(50, '이름은 50자 이하로 입력하세요.'),
  submitted_by_title: z
    .string()
    .min(1, '직책을 입력하세요.')
    .max(50, '직책은 50자 이하로 입력하세요.'),
  submitted_by_email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  template_id: z.string().uuid('유효하지 않은 템플릿 ID입니다.'),
  answers: z.array(selfAssessmentAnswerSchema).min(1, '최소 1개 이상의 응답이 필요합니다.'),
});
