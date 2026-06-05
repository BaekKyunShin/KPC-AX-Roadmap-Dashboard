import { z } from 'zod';

import { SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_LETTER_REGEX,
  PASSWORD_NUMBER_REGEX,
} from '@/lib/utils/password-policy';

// 사용자 역할
export const userRoleSchema = z.enum([
  'PUBLIC',
  'USER_PENDING',
  'OPS_ADMIN_PENDING',
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN',
]);

// 사용자 상태
export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'WITHDRAWN']);

// 교육 레벨
export const educationLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'LEADER']);

// 코칭 방식
export const coachingMethodSchema = z.enum(['PBL', 'WORKSHOP', 'MENTORING', 'LECTURE', 'HYBRID']);

// 가입 유형 스키마
export const registerTypeSchema = z.enum(['CONSULTANT', 'OPS_ADMIN']);

// 비밀번호 공통 규칙 (회원가입, 비밀번호 변경에서 공유)
// 정규식·길이는 src/lib/utils/password-policy.ts 단일 출처에서 import (#5).
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, '비밀번호는 최소 8자 이상이어야 합니다.')
  .regex(PASSWORD_LETTER_REGEX, '비밀번호에 영문자가 포함되어야 합니다.')
  .regex(PASSWORD_NUMBER_REGEX, '비밀번호에 숫자가 포함되어야 합니다.');

// 회원가입 스키마
export const registerSchema = z
  .object({
    email: z.string().email('유효한 이메일 주소를 입력하세요.'),
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
    phone: z.string().optional(),
    registerType: registerTypeSchema,
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: '개인정보 수집·이용에 동의해야 합니다.' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

// 로그인 스키마
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
});

// 컨설턴트 프로필 스키마
export const consultantProfileSchema = z.object({
  // 정형 데이터 (필수)
  expertise_domains: z.array(z.string()).min(1, 'AI 적용 가능 업무를 최소 1개 이상 선택하세요.'),
  available_industries: z.array(z.string()).min(1, 'AI 훈련 가능 산업을 최소 1개 이상 선택하세요.'),
  sub_industries: z
    .array(z.string().max(SUB_INDUSTRY_CONSTRAINTS.maxLength))
    .max(SUB_INDUSTRY_CONSTRAINTS.maxTags)
    .optional(),
  teaching_levels: z
    .array(educationLevelSchema)
    .min(1, '교육 대상 수준을 최소 1개 이상 선택하세요.'),
  coaching_methods: z
    .array(coachingMethodSchema)
    .min(1, '선호 교육 방식을 최소 1개 이상 선택하세요.'),
  skill_tags: z.array(z.string()).min(1, '보유 역량을 최소 1개 이상 선택하세요.'),
  years_of_experience: z
    .number()
    .min(0, '경력 연수는 0 이상이어야 합니다.')
    .max(50, '경력 연수는 50년 이하여야 합니다.'),
  affiliation: z.string().min(1, '소속을 입력하세요.').max(50, '소속은 50자 이하여야 합니다.'),
  // 서술 데이터 (필수)
  representative_experience: z
    .string()
    .min(50, '경력 사항을 최소 50자 이상 작성하세요.')
    .max(2000, '경력 사항은 2000자 이하여야 합니다.'),
  portfolio: z
    .string()
    .min(50, '강의/컨설팅 포트폴리오를 최소 50자 이상 작성하세요.')
    .max(2000, '강의/컨설팅 포트폴리오는 2000자 이하여야 합니다.'),
  strengths_constraints: z
    .string()
    .min(50, '강점/제약을 최소 50자 이상 작성하세요.')
    .max(2000, '강점/제약은 2000자 이하여야 합니다.'),
});

// 사용자 승인 스키마
export const userApprovalSchema = z.object({
  userId: z.string().uuid('유효하지 않은 사용자 ID입니다.'),
  action: z.enum(['approve', 'suspend', 'reactivate']),
  reason: z.string().optional(),
});

// 비밀번호 변경 스키마
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
    path: ['newPassword'],
  });

// 회원탈퇴 스키마
export const deleteAccountSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
  confirmText: z.literal('회원탈퇴', {
    errorMap: () => ({ message: '"회원탈퇴"를 정확히 입력해주세요.' }),
  }),
});

// 비밀번호 재설정 메일 요청 스키마
export const requestPasswordResetSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
});

// 메일 링크 클릭 후 새 비밀번호 설정 스키마
export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });
