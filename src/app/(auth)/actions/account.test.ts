/**
 * account.ts 테스트
 *
 * changePassword (getVerifiedUser 간접 테스트 포함):
 *   - Zod 검증 실패: 빈 현재 비밀번호
 *   - Zod 검증 실패: 새 비밀번호 규칙 미충족
 *   - Zod 검증 실패: 비밀번호 불일치
 *   - Zod 검증 실패: 현재 비밀번호와 새 비밀번호 동일
 *   - 세션 만료 (getUser → null)
 *   - 현재 비밀번호 틀림 (signInWithPassword 실패)
 *   - updateUser 실패 → 에러 번역
 *   - 전체 성공
 *
 * deleteAccount (getVerifiedUser 간접 테스트 포함):
 *   - Zod 검증 실패: 빈 비밀번호
 *   - Zod 검증 실패: confirmText 불일치
 *   - 세션 만료
 *   - 비밀번호 틀림
 *   - 익명화 실패 → 에러 반환
 *   - Auth 차단 실패해도 계속 진행 (signOut + redirect)
 *   - 전체 성공 (감사로그 + 익명화 + ban + signOut + redirect)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// ─── Mock 설정 ────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signOut: () => mockSignOut(),
    },
  }),
}));

const mockAdminUpdate = vi.fn();
const mockAdminEq = vi.fn();
const mockAdminUpdateUserById = vi.fn();
let adminUpdateReturnValue: { error: unknown } = { error: null };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (...args: unknown[]) => {
        mockAdminUpdate(...args);
        return { eq: (...eqArgs: unknown[]) => {
          mockAdminEq(...eqArgs);
          return adminUpdateReturnValue;
        }};
      },
    }),
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => mockAdminUpdateUserById(...args),
      },
    },
  }),
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

// ─── Import ───────────────────────────────────────────────────────────────

import { changePassword, deleteAccount } from './account';

// ─── 상수 ─────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_EMAIL = 'test@example.com';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
  });
}

function setupPasswordVerified() {
  setupAuthenticatedUser();
  mockSignInWithPassword.mockResolvedValue({ error: null });
}

// ─── 테스트 ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // 기본 반환값 설정 (개별 테스트에서 오버라이드 가능)
  adminUpdateReturnValue = { error: null };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── changePassword ───────────────────────────────────────────────────────

describe('changePassword', () => {
  it('Zod 검증 실패: 빈 현재 비밀번호', async () => {
    const result = await changePassword('', 'NewPass1!', 'NewPass1!');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('비밀번호');
    }
  });

  it('Zod 검증 실패: 새 비밀번호 규칙 미충족 (숫자 없음)', async () => {
    const result = await changePassword('OldPass1', 'newpassword', 'newpassword');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('숫자');
    }
  });

  it('Zod 검증 실패: 비밀번호 불일치', async () => {
    const result = await changePassword('OldPass1', 'NewPass1!', 'Different1!');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('일치');
    }
  });

  it('Zod 검증 실패: 현재 비밀번호와 새 비밀번호 동일', async () => {
    const result = await changePassword('SamePass1', 'SamePass1', 'SamePass1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('달라야');
    }
  });

  it('세션 만료 (getUser → null)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await changePassword('OldPass1', 'NewPass1!', 'NewPass1!');

    expect(result).toEqual({
      success: false,
      error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    });
  });

  it('현재 비밀번호 틀림', async () => {
    setupAuthenticatedUser();
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const result = await changePassword('WrongPass1', 'NewPass1!', 'NewPass1!');

    expect(result).toEqual({
      success: false,
      error: '비밀번호가 올바르지 않습니다.',
    });
  });

  it('updateUser 실패 → 에러 번역', async () => {
    setupPasswordVerified();
    mockUpdateUser.mockResolvedValue({
      error: { message: 'New password should be different from the old password' },
    });

    const result = await changePassword('OldPass1!', 'NewPass1!', 'NewPass1!');

    expect(result).toEqual({
      success: false,
      error: '새 비밀번호는 기존 비밀번호와 달라야 합니다.',
    });
  });

  it('전체 성공', async () => {
    setupPasswordVerified();
    mockUpdateUser.mockResolvedValue({ error: null });

    const result = await changePassword('OldPass1!', 'NewPass1!', 'NewPass1!');

    expect(result).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPass1!' });
  });
});

// ─── deleteAccount ────────────────────────────────────────────────────────

describe('deleteAccount', () => {
  it('Zod 검증 실패: 빈 비밀번호', async () => {
    const result = await deleteAccount('', '회원탈퇴');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('비밀번호');
    }
  });

  it('Zod 검증 실패: confirmText 불일치', async () => {
    const result = await deleteAccount('Password1', '탈퇴합니다');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('회원탈퇴');
    }
  });

  it('세션 만료', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await deleteAccount('Password1', '회원탈퇴');

    expect(result).toEqual({
      success: false,
      error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    });
  });

  it('비밀번호 틀림', async () => {
    setupAuthenticatedUser();
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const result = await deleteAccount('WrongPass', '회원탈퇴');

    expect(result).toEqual({
      success: false,
      error: '비밀번호가 올바르지 않습니다.',
    });
  });

  it('익명화 실패 → 에러 반환', async () => {
    setupPasswordVerified();
    adminUpdateReturnValue = { error: { message: 'update failed' } };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await deleteAccount('Password1', '회원탈퇴');

    expect(result).toEqual({
      success: false,
      error: '계정 삭제 처리 중 오류가 발생했습니다. 관리자에게 문의해주세요.',
    });
    consoleSpy.mockRestore();
  });

  it('Auth 차단 실패해도 계속 진행 (signOut + redirect)', async () => {
    setupPasswordVerified();
    adminUpdateReturnValue = { error: null };
    mockAdminUpdateUserById.mockResolvedValue({
      error: { message: 'ban failed' },
    });
    mockSignOut.mockResolvedValue(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(deleteAccount('Password1', '회원탈퇴')).rejects.toThrow('NEXT_REDIRECT');

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'USER_WITHDRAW',
        targetType: 'user',
        targetId: TEST_USER_ID,
        meta: { email: TEST_EMAIL },
      }),
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
    consoleSpy.mockRestore();
  });

  it('전체 성공 (감사로그 + 익명화 + ban + signOut + redirect)', async () => {
    setupPasswordVerified();
    adminUpdateReturnValue = { error: null };
    mockAdminUpdateUserById.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue(undefined);

    await expect(deleteAccount('Password1', '회원탈퇴')).rejects.toThrow('NEXT_REDIRECT');

    // 감사로그 기록 확인
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'USER_WITHDRAW',
        targetType: 'user',
        targetId: TEST_USER_ID,
      }),
    );

    // 익명화 데이터 확인
    expect(mockAdminUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '탈퇴한 사용자',
        email: expect.stringContaining('withdrawn_'),
        phone: null,
        status: 'WITHDRAWN',
      }),
    );
    expect(mockAdminEq).toHaveBeenCalledWith('id', TEST_USER_ID);

    // Auth ban 확인
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({
        email: expect.stringContaining('withdrawn_'),
        email_confirm: true,
        ban_duration: '876600h',
      }),
    );

    // 이메일 형식 확인
    const updateCall = mockAdminUpdate.mock.calls[0][0];
    expect(updateCall.email).toMatch(/^withdrawn_[a-f0-9]{8}@deleted\.local$/);

    // signOut + redirect
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
