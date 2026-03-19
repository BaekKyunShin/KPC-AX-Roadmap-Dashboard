/**
 * admin.ts 테스트
 *
 * updateUserStatus:
 *   - 미인증 → 에러
 *   - 권한 없음 → 에러
 *   - approve: USER_PENDING → CONSULTANT_APPROVED
 *   - approve: OPS_ADMIN_PENDING + SYSTEM_ADMIN → OPS_ADMIN
 *   - approve: OPS_ADMIN_PENDING + OPS_ADMIN → 권한 부족
 *   - approve: 이미 승인된 사용자 → 에러
 *   - 대상 사용자 미존재 → 에러
 *   - suspend → status: SUSPENDED
 *   - reactivate → status: ACTIVE
 *   - DB 업데이트 실패 → 에러 + 실패 감사로그
 *   - 성공 시 감사로그 기록 확인
 *   - reason 전달 확인
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── Mock 설정 ────────────────────────────────────────────────────────────

const mockAuthResult = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

// ─── Import ───────────────────────────────────────────────────────────────

import { updateUserStatus } from './admin';

// ─── 상수 ─────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TARGET_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

// ─── 공통 셋업 ───────────────────────────────────────────────────────────

let adminMock: ReturnType<typeof createMockSupabase>;

beforeEach(async () => {
  vi.restoreAllMocks();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setupAuth(role: string = 'OPS_ADMIN') {
  mockAuthResult.mockResolvedValue({
    user: { id: TEST_USER_ID },
    role,
    status: 'ACTIVE',
  });
}

function setupAuthFailure(error: string = '인증되지 않은 사용자입니다.') {
  mockAuthResult.mockResolvedValue({ error });
}

// ─── 테스트 ───────────────────────────────────────────────────────────────

describe('updateUserStatus', () => {
  it('미인증 → 에러', async () => {
    setupAuthFailure();

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '인증되지 않은 사용자입니다.',
    });
  });

  it('권한 없음 → 에러', async () => {
    setupAuthFailure('권한이 없습니다.');

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '권한이 없습니다.',
    });
  });

  it('대상 사용자 미존재 → 에러', async () => {
    setupAuth();
    // 사용자 조회 → null
    adminMock.addResult({ data: null, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '대상 사용자를 찾을 수 없습니다.',
    });
  });

  it('approve: USER_PENDING → CONSULTANT_APPROVED', async () => {
    setupAuth('OPS_ADMIN');
    // 사용자 조회
    adminMock.addResult({ data: { role: 'USER_PENDING' }, error: null });
    // 업데이트 성공
    adminMock.addResult({ data: null, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({ success: true });
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ role: 'CONSULTANT_APPROVED' });
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'USER_APPROVE',
        targetType: 'user',
        targetId: TARGET_USER_ID,
      }),
    );
  });

  it('approve: OPS_ADMIN_PENDING + SYSTEM_ADMIN → OPS_ADMIN', async () => {
    setupAuth('SYSTEM_ADMIN');
    adminMock.addResult({ data: { role: 'OPS_ADMIN_PENDING' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({ success: true });
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ role: 'OPS_ADMIN' });
  });

  it('approve: OPS_ADMIN_PENDING + OPS_ADMIN → 권한 부족', async () => {
    setupAuth('OPS_ADMIN');
    adminMock.addResult({ data: { role: 'OPS_ADMIN_PENDING' }, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '운영관리자 승인은 시스템 관리자만 가능합니다.',
    });
  });

  it('approve: 이미 승인된 사용자 → 에러', async () => {
    setupAuth();
    adminMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '승인할 수 없는 사용자입니다.',
    });
  });

  it('suspend → status: SUSPENDED', async () => {
    setupAuth();
    adminMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'suspend');

    expect(result).toEqual({ success: true });
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ status: 'SUSPENDED' });
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_SUSPEND',
      }),
    );
  });

  it('reactivate → status: ACTIVE', async () => {
    setupAuth();
    adminMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await updateUserStatus(TARGET_USER_ID, 'reactivate');

    expect(result).toEqual({ success: true });
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_REACTIVATE',
      }),
    );
  });

  it('DB 업데이트 실패 → 에러 + 실패 감사로그', async () => {
    setupAuth();
    adminMock.addResult({ data: { role: 'USER_PENDING' }, error: null });
    adminMock.addResult({ data: null, error: { message: 'update failed' } });

    const result = await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(result).toEqual({
      success: false,
      error: '사용자 상태 변경에 실패했습니다.',
    });
    // 실패 감사로그에 success: false, errorMessage 포함
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_APPROVE',
        success: false,
        errorMessage: 'update failed',
      }),
    );
  });

  it('reason 전달 확인', async () => {
    setupAuth();
    adminMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    adminMock.addResult({ data: null, error: null });

    await updateUserStatus(TARGET_USER_ID, 'suspend', '규정 위반');

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { reason: '규정 위반' },
      }),
    );
  });

  it('requireAuthWithRole에 올바른 역할 전달 확인', async () => {
    setupAuthFailure();

    await updateUserStatus(TARGET_USER_ID, 'approve');

    expect(mockAuthResult).toHaveBeenCalledWith(
      ['OPS_ADMIN', 'SYSTEM_ADMIN'],
      { authError: '인증되지 않은 사용자입니다.' },
    );
  });
});
