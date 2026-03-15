/**
 * ops/quota/actions.ts 테스트
 *
 * fetchUsageStats:
 *   - 인증 실패 → 빈 결과, 정상(role 전달 확인), options 전달
 *
 * updateQuota:
 *   - 인증 실패, Zod 실패(둘 다 없음), Zod 실패(범위 초과),
 *     사용자 미존재, 권한 부족(canManageUser false),
 *     성공 + after() 감사로그, 예외
 *
 * fetchMyUsage:
 *   - 인증 실패 → null, 정상
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchUsageStats,
  updateQuota,
  fetchMyUsage,
} from './actions';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();
const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

const mockFetchAllUsersUsage = vi.fn();
const mockUpdateUserQuota = vi.fn();
const mockFetchUserUsage = vi.fn();

vi.mock('@/lib/services/quota', () => ({
  fetchAllUsersUsage: (...args: unknown[]) => mockFetchAllUsersUsage(...args),
  updateUserQuota: (...args: unknown[]) => mockUpdateUserQuota(...args),
  fetchUserUsage: (...args: unknown[]) => mockFetchUserUsage(...args),
}));

const mockCreateAuditLog = vi.fn();

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

const mockCanManageUser = vi.fn();

vi.mock('@/lib/constants/status', () => ({
  canManageUser: (...args: unknown[]) => mockCanManageUser(...args),
}));

// admin client mock for user lookup in updateQuota
const mockAdminSingle = vi.fn();
const mockAdminEq = vi.fn(() => ({ single: mockAdminSingle }));
const mockAdminSelect = vi.fn(() => ({ eq: mockAdminEq }));
const mockAdminFrom = vi.fn(() => ({ select: mockAdminSelect }));
const mockAdminClient = { from: mockAdminFrom };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}));

// after() callback 테스트 패턴
const pendingAfterCallbacks: Promise<unknown>[] = [];

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingAfterCallbacks.push(result as Promise<unknown>);
    }
  }),
}));

async function flushAfterCallbacks() {
  await Promise.all(pendingAfterCallbacks);
  pendingAfterCallbacks.length = 0;
}

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TARGET_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

function setupAuthWithRole(overrides?: { role?: string }) {
  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: TEST_USER_ID, email: 'test@test.com' },
    supabase: {},
    role: overrides?.role ?? 'OPS_ADMIN',
    status: 'ACTIVE',
  });
}

function setupAuthWithRoleFailure() {
  mockRequireAuthWithRole.mockResolvedValue({ error: '권한이 없습니다.' });
}

function setupAuth(overrides?: { userId?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: {},
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
  });
}

function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });
}

beforeEach(() => {
  vi.clearAllMocks();
  pendingAfterCallbacks.length = 0;
});

afterEach(() => {
  pendingAfterCallbacks.length = 0;
});

// ─── fetchUsageStats ─────────────────────────────────────────────────────────

describe('fetchUsageStats', () => {
  it('인증 실패 → 빈 결과 반환', async () => {
    setupAuthWithRoleFailure();

    const result = await fetchUsageStats({ page: 1 });

    expect(result).toEqual({
      users: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      month: '',
    });
  });

  it('정상 — role이 fetchAllUsersUsage에 전달됨', async () => {
    setupAuthWithRole({ role: 'SYSTEM_ADMIN' });
    const mockResult = {
      users: [{ id: '1', name: 'Test' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      month: '2026-03',
    };
    mockFetchAllUsersUsage.mockResolvedValue(mockResult);

    const result = await fetchUsageStats({ page: 1 });

    expect(mockFetchAllUsersUsage).toHaveBeenCalledWith({
      page: 1,
      currentUserRole: 'SYSTEM_ADMIN',
    });
    expect(result).toEqual(mockResult);
  });

  it('options(page, limit, month)가 그대로 전달됨', async () => {
    setupAuthWithRole({ role: 'OPS_ADMIN' });
    mockFetchAllUsersUsage.mockResolvedValue({ users: [], total: 0 });

    await fetchUsageStats({ page: 2, limit: 10, month: '2026-01' });

    expect(mockFetchAllUsersUsage).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      month: '2026-01',
      currentUserRole: 'OPS_ADMIN',
    });
  });
});

// ─── updateQuota ─────────────────────────────────────────────────────────────

describe('updateQuota', () => {
  it('인증 실패 시 에러 반환', async () => {
    setupAuthWithRoleFailure();

    const result = await updateQuota(TARGET_USER_ID, 10);

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('Zod 실패 — dailyLimit와 monthlyLimit 둘 다 없음', async () => {
    setupAuthWithRole();

    const result = await updateQuota(TARGET_USER_ID, undefined, undefined);

    expect(result.success).toBe(false);
    expect(result.error).toContain('일별 한도 또는 월별 한도 중 하나 이상을 입력해야 합니다.');
  });

  it('Zod 실패 — dailyLimit 범위 초과 (501)', async () => {
    setupAuthWithRole();

    const result = await updateQuota(TARGET_USER_ID, 501);

    expect(result.success).toBe(false);
    expect(result.error).toContain('일별 한도는 최대 500 이하여야 합니다.');
  });

  it('Zod 실패 — monthlyLimit 범위 초과 (10001)', async () => {
    setupAuthWithRole();

    const result = await updateQuota(TARGET_USER_ID, undefined, 10001);

    expect(result.success).toBe(false);
    expect(result.error).toContain('월별 한도는 최대 10000 이하여야 합니다.');
  });

  it('대상 사용자 미존재 → 에러', async () => {
    setupAuthWithRole();
    mockAdminSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateQuota(TARGET_USER_ID, 10);

    expect(result).toEqual({
      success: false,
      error: '대상 사용자를 찾을 수 없습니다.',
    });
  });

  it('권한 부족 (canManageUser false) → 에러', async () => {
    setupAuthWithRole();
    mockAdminSingle.mockResolvedValue({ data: { role: 'OPS_ADMIN' }, error: null });
    mockCanManageUser.mockReturnValue(false);

    const result = await updateQuota(TARGET_USER_ID, 10);

    expect(result).toEqual({
      success: false,
      error: '해당 사용자의 쿼터를 수정할 권한이 없습니다.',
    });
    expect(mockCanManageUser).toHaveBeenCalledWith('OPS_ADMIN', 'OPS_ADMIN');
  });

  it('성공 — updateUserQuota 호출 + after() 감사로그', async () => {
    setupAuthWithRole();
    mockAdminSingle.mockResolvedValue({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    mockCanManageUser.mockReturnValue(true);
    mockUpdateUserQuota.mockResolvedValue(undefined);
    mockCreateAuditLog.mockResolvedValue(undefined);

    const result = await updateQuota(TARGET_USER_ID, 30, 200);
    await flushAfterCallbacks();

    expect(result).toEqual({ success: true });
    expect(mockUpdateUserQuota).toHaveBeenCalledWith(TARGET_USER_ID, 30, 200);
    expect(mockCreateAuditLog).toHaveBeenCalledWith({
      actorUserId: TEST_USER_ID,
      action: 'QUOTA_UPDATE',
      targetType: 'user_quota',
      targetId: TARGET_USER_ID,
      meta: { dailyLimit: 30, monthlyLimit: 200 },
    });
  });

  it('성공 — dailyLimit만 전달 시 meta에 dailyLimit만 포함', async () => {
    setupAuthWithRole();
    mockAdminSingle.mockResolvedValue({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    mockCanManageUser.mockReturnValue(true);
    mockUpdateUserQuota.mockResolvedValue(undefined);
    mockCreateAuditLog.mockResolvedValue(undefined);

    await updateQuota(TARGET_USER_ID, 50);
    await flushAfterCallbacks();

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { dailyLimit: 50 },
      }),
    );
  });

  it('예외 발생 시 에러 반환 (throw 안 함)', async () => {
    setupAuthWithRole();
    mockAdminSingle.mockResolvedValue({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    mockCanManageUser.mockReturnValue(true);
    mockUpdateUserQuota.mockRejectedValue(new Error('DB crash'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await updateQuota(TARGET_USER_ID, 10);

    expect(result).toEqual({
      success: false,
      error: '쿼터 수정에 실패했습니다.',
    });
    consoleSpy.mockRestore();
  });
});

// ─── fetchMyUsage ────────────────────────────────────────────────────────────

describe('fetchMyUsage', () => {
  it('인증 실패 → null 반환', async () => {
    setupAuthFailure();

    const result = await fetchMyUsage();

    expect(result).toBeNull();
  });

  it('정상 — fetchUserUsage에 user.id 전달', async () => {
    setupAuth({ userId: TEST_USER_ID });
    const usageData = { dailyUsage: 5, monthlyUsage: 30, dailyLimit: 50, monthlyLimit: 500 };
    mockFetchUserUsage.mockResolvedValue(usageData);

    const result = await fetchMyUsage();

    expect(mockFetchUserUsage).toHaveBeenCalledWith(TEST_USER_ID);
    expect(result).toEqual(usageData);
  });
});
