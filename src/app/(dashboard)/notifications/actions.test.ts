/**
 * notifications/actions.ts 테스트
 *
 * fetchNotifications:
 *   - 인증 실패, 유효하지 않은 filter, DB 에러, 정상(hasMore=false), 정상(hasMore=true)
 *
 * fetchUnreadCount:
 *   - 인증 실패 → 0, DB 에러 → 0, 정상 카운트
 *
 * markNotificationRead:
 *   - 인증 실패, DB 에러, 성공
 *
 * markAllNotificationsRead:
 *   - 인증 실패, DB 에러, 성공 (.neq('type','message') 확인)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './actions';
import { NOTIFICATION_PAGE_SIZE } from '@/lib/constants/notification';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_NOTIFICATION_ID = '550e8400-e29b-41d4-a716-446655440010';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;

function setupAuth(overrides?: { role?: string; userId?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role ?? 'OPS_ADMIN',
    status: 'ACTIVE',
  });
}

function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });
}

beforeEach(() => {
  serverMock = createMockSupabase();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── fetchNotifications ──────────────────────────────────────────────────────

describe('fetchNotifications', () => {
  it('인증 실패 시 에러 반환', async () => {
    setupAuthFailure();

    const result = await fetchNotifications(1);

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다.',
    });
  });

  it('유효하지 않은 filter → 에러 반환', async () => {
    setupAuth();

    const result = await fetchNotifications(1, 'invalid_type');

    expect(result).toEqual({
      success: false,
      error: '유효하지 않은 필터입니다.',
    });
  });

  it('message 타입 filter → 에러 반환 (message는 허용되지 않음)', async () => {
    setupAuth();

    const result = await fetchNotifications(1, 'message');

    expect(result).toEqual({
      success: false,
      error: '유효하지 않은 필터입니다.',
    });
  });

  it('DB 에러 시 에러 반환', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await fetchNotifications(1);

    expect(result).toEqual({
      success: false,
      error: '알림 조회에 실패했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('정상 조회 (hasMore=false) — 데이터가 PAGE_SIZE 이하', async () => {
    setupAuth();
    const notifications = Array.from({ length: 5 }, (_, i) => ({
      id: `notif-${i}`,
      user_id: TEST_USER_ID,
      type: 'system',
      is_read: false,
    }));
    serverMock.addResult({ data: notifications, error: null });

    const result = await fetchNotifications(1);

    expect(result).toEqual({
      success: true,
      data: {
        notifications,
        hasMore: false,
      },
    });
  });

  it('정상 조회 (hasMore=true) — 데이터가 PAGE_SIZE 초과', async () => {
    setupAuth();
    // PAGE_SIZE + 1개 반환 → hasMore = true, 마지막 1개 잘림
    const notifications = Array.from({ length: NOTIFICATION_PAGE_SIZE + 1 }, (_, i) => ({
      id: `notif-${i}`,
      user_id: TEST_USER_ID,
      type: 'system',
      is_read: false,
    }));
    serverMock.addResult({ data: notifications, error: null });

    const result = await fetchNotifications(1);

    expect(result).toEqual({
      success: true,
      data: {
        notifications: notifications.slice(0, NOTIFICATION_PAGE_SIZE),
        hasMore: true,
      },
    });
  });

  it('filter 지정 시 해당 type으로 쿼리 (.eq 호출 확인)', async () => {
    setupAuth();
    serverMock.addResult({ data: [], error: null });

    await fetchNotifications(1, 'assignment');

    // from → select → eq(user_id) → eq(type, 'assignment') → order → range
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('type', 'assignment');
  });

  it('filter 없으면 message 제외 (.neq 호출 확인)', async () => {
    setupAuth();
    serverMock.addResult({ data: [], error: null });

    await fetchNotifications(1);

    expect(serverMock.chainable.neq).toHaveBeenCalledWith('type', 'message');
  });
});

// ─── fetchUnreadCount ────────────────────────────────────────────────────────

describe('fetchUnreadCount', () => {
  it('인증 실패 → 0 반환', async () => {
    setupAuthFailure();

    const result = await fetchUnreadCount();

    expect(result).toBe(0);
  });

  it('DB 에러 → 0 반환', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'DB error' }, count: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await fetchUnreadCount();

    expect(result).toBe(0);
    consoleSpy.mockRestore();
  });

  it('정상 카운트 반환', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: null, count: 7 });

    const result = await fetchUnreadCount();

    expect(result).toBe(7);
  });
});

// ─── markNotificationRead ────────────────────────────────────────────────────

describe('markNotificationRead', () => {
  it('인증 실패 시 에러 반환', async () => {
    setupAuthFailure();

    const result = await markNotificationRead(TEST_NOTIFICATION_ID);

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다.',
    });
  });

  it('DB 에러 시 에러 반환', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'update failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await markNotificationRead(TEST_NOTIFICATION_ID);

    expect(result).toEqual({
      success: false,
      error: '알림 읽음 처리에 실패했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('성공 — update + eq(id) + eq(user_id) 호출', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: null });

    const result = await markNotificationRead(TEST_NOTIFICATION_ID);

    expect(result).toEqual({ success: true });
    expect(serverMock.chainable.update).toHaveBeenCalledWith({ is_read: true });
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('id', TEST_NOTIFICATION_ID);
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
  });
});

// ─── markAllNotificationsRead ────────────────────────────────────────────────

describe('markAllNotificationsRead', () => {
  it('인증 실패 시 에러 반환', async () => {
    setupAuthFailure();

    const result = await markAllNotificationsRead();

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다.',
    });
  });

  it('DB 에러 시 에러 반환', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'update failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await markAllNotificationsRead();

    expect(result).toEqual({
      success: false,
      error: '모두 읽음 처리에 실패했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('성공 — message 타입 제외 확인 (.neq 호출)', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: null });

    const result = await markAllNotificationsRead();

    expect(result).toEqual({ success: true });
    expect(serverMock.chainable.update).toHaveBeenCalledWith({ is_read: true });
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('is_read', false);
    expect(serverMock.chainable.neq).toHaveBeenCalledWith('type', 'message');
  });
});
