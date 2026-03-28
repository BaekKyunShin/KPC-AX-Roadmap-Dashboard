/**
 * auth.ts 테스트
 *
 * registerUser:
 *   - Zod 검증 실패 (이메일 형식, 비밀번호 규칙, 비밀번호 불일치, 약관 미동의)
 *   - createAdminClient 예외 → 서버 설정 오류
 *   - 중복 이메일 (already been registered)
 *   - 중복 이메일 (already exists)
 *   - Auth 에러 번역 (기타 에러)
 *   - authData.user null → 사용자 생성 실패
 *   - 프로필 생성 실패: PG_UNIQUE_VIOLATION → 롤백
 *   - 프로필 생성 실패: PG_TABLE_NOT_FOUND → 롤백
 *   - 프로필 생성 실패: FK 위반 → 롤백
 *   - 프로필 생성 실패: 기타 → 롤백
 *   - 자동 로그인 실패 → needsLogin: true
 *   - 역할 결정: OPS_ADMIN → OPS_ADMIN_PENDING
 *   - 역할 결정: CONSULTANT → USER_PENDING
 *   - 전체 성공
 *
 * loginUser:
 *   - Zod 검증 실패
 *   - 로그인 실패 (잘못된 자격증명)
 *   - 로그인 성공
 *
 * logoutUser:
 *   - signOut + redirect 호출
 *
 * fetchCurrentUser:
 *   - 미인증 → null
 *   - 프로필 정상 조회
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// ─── Mock 설정 (모듈 호이스팅 필요) ───────────────────────────────────────

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockFromChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      getUser: () => mockGetUser(),
    },
    from: () => mockFromChain,
  }),
}));

const mockAdminCreateUser = vi.fn();
const mockAdminDeleteUser = vi.fn();
const mockAdminInsertChain = {
  insert: vi.fn(),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: (...args: unknown[]) => mockAdminCreateUser(...args),
        deleteUser: (...args: unknown[]) => mockAdminDeleteUser(...args),
      },
    },
    from: () => mockAdminInsertChain,
  })),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

// ─── Import (mock 설정 후) ────────────────────────────────────────────────

import { registerUser, loginUser, logoutUser, fetchCurrentUser } from './auth';
import { PG_UNIQUE_VIOLATION, PG_TABLE_NOT_FOUND } from '@/lib/constants/database';

// ─── 테스트 상수 ──────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function createRegisterFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set('email', overrides.email ?? 'test@example.com');
  fd.set('password', overrides.password ?? 'Password1');
  fd.set('confirmPassword', overrides.confirmPassword ?? 'Password1');
  fd.set('name', overrides.name ?? '테스트유저');
  fd.set('phone', overrides.phone ?? '010-1234-5678');
  fd.set('registerType', overrides.registerType ?? 'CONSULTANT');
  fd.set('agreeToTerms', overrides.agreeToTerms ?? 'true');
  return fd;
}

function createLoginFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set('email', overrides.email ?? 'test@example.com');
  fd.set('password', overrides.password ?? 'Password1');
  return fd;
}

// ─── 테스트 ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── registerUser ─────────────────────────────────────────────────────────

describe('registerUser', () => {
  it('Zod 검증 실패: 잘못된 이메일 형식', async () => {
    const fd = createRegisterFormData({ email: 'not-an-email' });
    const result = await registerUser(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('이메일');
    }
  });

  it('Zod 검증 실패: 비밀번호 너무 짧음', async () => {
    const fd = createRegisterFormData({ password: 'Ab1', confirmPassword: 'Ab1' });
    const result = await registerUser(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('비밀번호');
    }
  });

  it('Zod 검증 실패: 비밀번호 불일치', async () => {
    const fd = createRegisterFormData({ confirmPassword: 'Different1' });
    const result = await registerUser(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('비밀번호가 일치하지');
    }
  });

  it('Zod 검증 실패: 약관 미동의', async () => {
    const fd = createRegisterFormData({ agreeToTerms: 'false' });
    const result = await registerUser(fd);

    expect(result.success).toBe(false);
  });

  it('createAdminClient 예외 → 서버 설정 오류', async () => {
    // createAdminClient가 throw하도록 설정
    const { createAdminClient } = await import('@/lib/supabase/admin');
    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error('Missing service role key');
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의해주세요.',
    });
  });

  it('중복 이메일: "already been registered"', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
    });
  });

  it('중복 이메일: "already exists"', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already exists' },
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
    });
  });

  it('Auth 에러 번역 (기타 에러)', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Signup requires a valid password' },
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '유효한 비밀번호를 입력하세요.',
    });
  });

  it('authData.user null → 사용자 생성 실패', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '사용자 생성에 실패했습니다. 다시 시도해주세요.',
    });
  });

  it('프로필 생성 실패: PG_UNIQUE_VIOLATION → 롤백', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: { code: PG_UNIQUE_VIOLATION, message: 'duplicate key' } })),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
    });
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    consoleSpy.mockRestore();
  });

  it('프로필 생성 실패: PG_TABLE_NOT_FOUND → 롤백', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: { code: PG_TABLE_NOT_FOUND, message: 'relation does not exist' } })),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '데이터베이스 테이블이 생성되지 않았습니다. 관리자에게 문의해주세요.',
    });
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    consoleSpy.mockRestore();
  });

  it('프로필 생성 실패: FK 위반 → 롤백', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: { code: '23503', message: 'violates foreign key constraint' } })),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '회원 인증 정보 연결에 실패했습니다. 다시 시도해주세요.',
    });
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    consoleSpy.mockRestore();
  });

  it('프로필 생성 실패: 기타 에러 → 롤백', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: { code: '99999', message: 'unknown error' } })),
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: false,
      error: '회원 정보 저장에 실패했습니다. 다시 시도해주세요.',
    });
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    consoleSpy.mockRestore();
  });

  it('자동 로그인 실패 → needsLogin: true', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: null })),
    });
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: true,
      data: { userId: TEST_USER_ID, registerType: 'CONSULTANT', needsLogin: true },
    });
  });

  it('역할 결정: OPS_ADMIN → OPS_ADMIN_PENDING', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: null })),
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = createRegisterFormData({ registerType: 'OPS_ADMIN' });
    const result = await registerUser(fd);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registerType).toBe('OPS_ADMIN');
    }
    // admin insert에 OPS_ADMIN_PENDING 역할로 삽입되었는지 확인
    expect(mockAdminInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'OPS_ADMIN_PENDING' }),
    );
  });

  it('역할 결정: CONSULTANT → USER_PENDING', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: null })),
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = createRegisterFormData({ registerType: 'CONSULTANT' });
    const result = await registerUser(fd);

    expect(result.success).toBe(true);
    expect(mockAdminInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'USER_PENDING' }),
    );
  });

  it('전체 성공 (회원가입 + 자동 로그인)', async () => {
    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockAdminInsertChain.insert.mockReturnValue({
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ error: null })),
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const fd = createRegisterFormData();
    const result = await registerUser(fd);

    expect(result).toEqual({
      success: true,
      data: { userId: TEST_USER_ID, registerType: 'CONSULTANT' },
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password1',
    });
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────

describe('loginUser', () => {
  it('Zod 검증 실패: 빈 비밀번호', async () => {
    const fd = createLoginFormData({ password: '' });
    const result = await loginUser(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('비밀번호');
    }
  });

  it('Zod 검증 실패: 잘못된 이메일 형식', async () => {
    const fd = createLoginFormData({ email: 'invalid' });
    const result = await loginUser(fd);

    expect(result.success).toBe(false);
  });

  it('로그인 실패 (잘못된 자격증명)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const fd = createLoginFormData();
    const result = await loginUser(fd);

    expect(result).toEqual({
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    });
  });

  it('로그인 성공 → 역할 기반 기본 경로 반환', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockFromChain.single.mockReturnValue({
      data: { role: 'OPS_ADMIN' },
    });

    const fd = createLoginFormData();
    const result = await loginUser(fd);

    expect(result).toEqual({
      success: true,
      data: { defaultRoute: '/ops/projects' },
    });
  });

  it('로그인 성공 + 프로필 없음 → /dashboard 폴백', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mockFromChain.single.mockReturnValue({
      data: null,
    });

    const fd = createLoginFormData();
    const result = await loginUser(fd);

    expect(result).toEqual({
      success: true,
      data: { defaultRoute: '/dashboard' },
    });
  });
});

// ─── logoutUser ───────────────────────────────────────────────────────────

describe('logoutUser', () => {
  it('signOut + redirect("/login") 호출', async () => {
    mockSignOut.mockResolvedValue(undefined);

    await expect(logoutUser()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});

// ─── fetchCurrentUser ─────────────────────────────────────────────────────

describe('fetchCurrentUser', () => {
  it('미인증 → null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await fetchCurrentUser();

    expect(result).toBeNull();
  });

  it('프로필 정상 조회', async () => {
    const profile = { id: TEST_USER_ID, name: '테스트', role: 'CONSULTANT_APPROVED' };
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } } });
    mockFromChain.single.mockReturnValue({ data: profile });

    const result = await fetchCurrentUser();

    expect(result).toEqual(profile);
  });
});
