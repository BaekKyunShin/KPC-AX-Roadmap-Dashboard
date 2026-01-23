import { z } from 'zod';

// 사용자 역할
export const userRoleSchema = z.enum([
  'PUBLIC',
  'USER_PENDING',
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN',
]);

// 사용자 상태
export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

// 교육 레벨
export const educationLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

// 코칭 방식
export const coachingMethodSchema = z.enum(['PBL', 'WORKSHOP', 'MENTORING', 'LECTURE', 'HYBRID']);

// 회원가입 스키마
export const registerSchema = z
  .object({
    email: z.string().email('유효한 이메일 주소를 입력하세요.'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .regex(/[a-zA-Z]/, '비밀번호에 영문자가 포함되어야 합니다.')
      .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다.'),
    confirmPassword: z.string(),
    name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
    phone: z.string().optional(),
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
  expertise_domains: z
    .array(z.string())
    .min(1, '전문분야를 최소 1개 이상 선택하세요.'),
  available_industries: z
    .array(z.string())
    .min(1, '가능 업종을 최소 1개 이상 선택하세요.'),
  teaching_levels: z
    .array(educationLevelSchema)
    .min(1, '강의 가능 레벨을 최소 1개 이상 선택하세요.'),
  coaching_methods: z
    .array(coachingMethodSchema)
    .min(1, '코칭 방식을 최소 1개 이상 선택하세요.'),
  skill_tags: z
    .array(z.string())
    .min(1, '역량 태그를 최소 1개 이상 선택하세요.'),
  years_of_experience: z
    .number()
    .min(0, '경력 연수는 0 이상이어야 합니다.')
    .max(50, '경력 연수는 50년 이하여야 합니다.'),
  // 서술 데이터 (필수)
  representative_experience: z
    .string()
    .min(50, '대표 수행경험을 최소 50자 이상 작성하세요.')
    .max(2000, '대표 수행경험은 2000자 이하여야 합니다.'),
  portfolio: z
    .string()
    .min(30, '포트폴리오를 최소 30자 이상 작성하세요.')
    .max(2000, '포트폴리오는 2000자 이하여야 합니다.'),
  strengths_constraints: z
    .string()
    .min(20, '강점/제약을 최소 20자 이상 작성하세요.')
    .max(1000, '강점/제약은 1000자 이하여야 합니다.'),
});

// 사용자 승인 스키마
export const userApprovalSchema = z.object({
  userId: z.string().uuid('유효하지 않은 사용자 ID입니다.'),
  action: z.enum(['approve', 'suspend', 'reactivate']),
  reason: z.string().optional(),
});

// 타입 추출
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ConsultantProfileInput = z.infer<typeof consultantProfileSchema>;
export type UserApprovalInput = z.infer<typeof userApprovalSchema>;
