import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  consultantProfileSchema,
  userApprovalSchema,
  userRoleSchema,
  userStatusSchema,
} from './user';

describe('userRoleSchema', () => {
  it('유효한 역할을 허용한다', () => {
    const validRoles = ['PUBLIC', 'USER_PENDING', 'CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'];
    validRoles.forEach((role) => {
      expect(userRoleSchema.safeParse(role).success).toBe(true);
    });
  });

  it('잘못된 역할을 거부한다', () => {
    expect(userRoleSchema.safeParse('INVALID').success).toBe(false);
    expect(userRoleSchema.safeParse('admin').success).toBe(false);
  });
});

describe('userStatusSchema', () => {
  it('유효한 상태를 허용한다', () => {
    expect(userStatusSchema.safeParse('ACTIVE').success).toBe(true);
    expect(userStatusSchema.safeParse('SUSPENDED').success).toBe(true);
  });

  it('잘못된 상태를 거부한다', () => {
    expect(userStatusSchema.safeParse('INACTIVE').success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validData = {
    email: 'test@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
    name: '홍길동',
    registerType: 'CONSULTANT' as const,
    agreeToTerms: true as const,
  };

  it('유효한 회원가입 데이터를 허용한다', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = registerSchema.safeParse({ ...validData, email: 'invalid-email' });
    expect(result.success).toBe(false);
  });

  it('짧은 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'Pass1',
      confirmPassword: 'Pass1',
    });
    expect(result.success).toBe(false);
  });

  it('숫자 없는 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'PasswordOnly',
      confirmPassword: 'PasswordOnly',
    });
    expect(result.success).toBe(false);
  });

  it('영문 없는 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: '12345678',
      confirmPassword: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('불일치하는 비밀번호를 거부한다', () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: 'DifferentPassword123',
    });
    expect(result.success).toBe(false);
  });

  it('짧은 이름을 거부한다', () => {
    const result = registerSchema.safeParse({ ...validData, name: '김' });
    expect(result.success).toBe(false);
  });

  it('약관 미동의를 거부한다', () => {
    const result = registerSchema.safeParse({ ...validData, agreeToTerms: false });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('유효한 로그인 데이터를 허용한다', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'invalid',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('빈 비밀번호를 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('consultantProfileSchema', () => {
  const validProfile = {
    expertise_domains: ['AI/ML', '데이터분석'],
    available_industries: ['제조업', '서비스업'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'] as const,
    coaching_methods: ['PBL', 'WORKSHOP'] as const,
    skill_tags: ['Python', '데이터 전처리'],
    years_of_experience: 5,
    affiliation: 'ABC컨설팅',
    representative_experience:
      '대기업 제조사에서 AI 기반 품질관리 시스템 구축 프로젝트를 수행했습니다. 데이터 수집부터 모델 배포까지 전 과정을 담당했습니다.',
    portfolio:
      '삼성전자, LG전자 등 대기업 교육 다수 진행. 중소기업 AI 도입 컨설팅 10건 이상 수행.',
    strengths_constraints: '제조업 도메인 전문성이 강점입니다. 특히 품질관리와 생산 프로세스 개선에 강합니다. 금융권 경험은 제한적임.',
  };

  it('유효한 컨설턴트 프로필을 허용한다', () => {
    const result = consultantProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('빈 전문 분야를 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      expertise_domains: [],
    });
    expect(result.success).toBe(false);
  });

  it('빈 교육 수준을 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      teaching_levels: [],
    });
    expect(result.success).toBe(false);
  });

  it('음수 경력 연차를 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      years_of_experience: -1,
    });
    expect(result.success).toBe(false);
  });

  it('50년 초과 경력 연차를 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      years_of_experience: 51,
    });
    expect(result.success).toBe(false);
  });

  it('짧은 대표 경험을 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      representative_experience: '짧은 경험',
    });
    expect(result.success).toBe(false);
  });

  it('빈 소속을 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      affiliation: '',
    });
    expect(result.success).toBe(false);
  });

  it('50자 초과 소속을 거부한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      affiliation: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('50자 소속을 허용한다', () => {
    const result = consultantProfileSchema.safeParse({
      ...validProfile,
      affiliation: 'A'.repeat(50),
    });
    expect(result.success).toBe(true);
  });
});

describe('userApprovalSchema', () => {
  it('유효한 승인 데이터를 허용한다', () => {
    const result = userApprovalSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'approve',
    });
    expect(result.success).toBe(true);
  });

  it('모든 유효한 액션을 허용한다', () => {
    const actions = ['approve', 'suspend', 'reactivate'] as const;
    actions.forEach((action) => {
      const result = userApprovalSchema.safeParse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        action,
      });
      expect(result.success).toBe(true);
    });
  });

  it('잘못된 UUID를 거부한다', () => {
    const result = userApprovalSchema.safeParse({
      userId: 'invalid-uuid',
      action: 'approve',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 액션을 거부한다', () => {
    const result = userApprovalSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
