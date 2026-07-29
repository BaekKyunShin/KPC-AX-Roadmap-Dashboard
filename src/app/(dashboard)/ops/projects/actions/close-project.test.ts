/**
 * closeProject / reopenProject Server Action 테스트
 *
 * 검증 항목:
 * - 인증·역할 가드 (OPS_MANAGER_ROLES)
 * - Zod 스키마 (uuid, 사유 10자 이상)
 * - RPC 호출 인자 및 실패(jsonb success:false) 전파 + 실패 감사로그
 * - 성공 시 감사로그(PROJECT_ADMIN_CLOSED/PROJECT_REOPENED) + 컨설턴트 알림
 *   (status_change) + revalidatePath 4경로
 * - 미배정/테스트 모드 프로젝트는 알림 생략
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// after() 추적
const { pendingCallbacks, mockAfter } = vi.hoisted(() => {
  const pendingCallbacks: Promise<unknown>[] = [];
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingCallbacks.push(result as Promise<unknown>);
    }
  });
  return { pendingCallbacks, mockAfter };
});

const mockAuthResult = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: mockAfter,
}));

import { closeProject, reopenProject } from './close-project';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notification';
import { revalidatePath } from 'next/cache';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440010';
const COMPANY_NAME = '테스트 주식회사';
const VALID_REASON = '코치가 오프라인으로 작업을 완료하여 행정 종결 처리합니다.';

function createAuthSuccess(role: 'OPS_ADMIN' | 'SYSTEM_ADMIN' = 'OPS_ADMIN') {
  const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
  return {
    user: { id: TEST_USER_ID, email: 'ops@test.com' },
    supabase: mock.client,
    role,
    status: 'ACTIVE',
    _mock: mock,
  };
}

describe('closeProject', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });
    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('Zod 검증 실패 (잘못된 UUID) → 에러 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const result = await closeProject({ project_id: 'not-a-uuid', reason: VALID_REASON });
    expect(result.success).toBe(false);
  });

  it('Zod 검증 실패 (10자 미만 사유) → 에러 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: '짧은 사유' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('10자');
  });

  it('RPC가 success:false 반환 시 에러 전파 + 실패 감사로그', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: { success: false, error: '이미 종결된 프로젝트입니다.' },
      error: null,
    });

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });

    expect(result).toEqual({ success: false, error: '이미 종결된 프로젝트입니다.' });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ADMIN_CLOSED',
        success: false,
        errorMessage: '이미 종결된 프로젝트입니다.',
      })
    );
  });

  it('RPC 전송 에러 시 일반 에러 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({ data: null, error: { message: 'db down' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('종결');
    consoleSpy.mockRestore();
  });

  it('성공 → RPC 인자 + 감사로그 + 컨설턴트 알림 + revalidatePath 4경로', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: {
        success: true,
        previous_status: 'ASSIGNED',
        assigned_consultant_id: CONSULTANT_ID,
      },
      error: null,
    });
    // after(): 알림용 프로젝트 조회
    adminMock.addResult({
      data: { company_name: COMPANY_NAME, is_test_mode: false },
      error: null,
    });

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });
    await Promise.all(pendingCallbacks);

    expect(result).toEqual({ success: true });
    expect(adminMock.client.rpc).toHaveBeenCalledWith('close_project_administratively', {
      p_project_id: TEST_PROJECT_ID,
      p_closed_by: TEST_USER_ID,
      p_reason: VALID_REASON,
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'PROJECT_ADMIN_CLOSED',
        targetType: 'project',
        targetId: TEST_PROJECT_ID,
        meta: expect.objectContaining({
          reason: VALID_REASON,
          previous_status: 'ASSIGNED',
        }),
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: CONSULTANT_ID,
        type: 'status_change',
        link: `/consultant/projects/${TEST_PROJECT_ID}`,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${TEST_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${TEST_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/consultant/home');
  });

  it('배정 컨설턴트가 없으면 알림을 생략한다', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: { success: true, previous_status: 'NEW', assigned_consultant_id: null },
      error: null,
    });

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });
    await Promise.all(pendingCallbacks);

    expect(result).toEqual({ success: true });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('테스트 모드 프로젝트는 알림을 생략한다', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: {
        success: true,
        previous_status: 'ASSIGNED',
        assigned_consultant_id: CONSULTANT_ID,
      },
      error: null,
    });
    adminMock.addResult({
      data: { company_name: COMPANY_NAME, is_test_mode: true },
      error: null,
    });

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });
    await Promise.all(pendingCallbacks);

    expect(result).toEqual({ success: true });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('SYSTEM_ADMIN도 종결 권한이 있다 (OPS_MANAGER_ROLES 호출)', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess('SYSTEM_ADMIN'));
    adminMock.addRpcResult({
      data: { success: true, previous_status: 'NEW', assigned_consultant_id: null },
      error: null,
    });

    const result = await closeProject({ project_id: TEST_PROJECT_ID, reason: VALID_REASON });

    expect(result).toEqual({ success: true });
    expect(mockAuthResult).toHaveBeenCalledWith(
      expect.arrayContaining(['OPS_ADMIN', 'SYSTEM_ADMIN']),
      expect.anything()
    );
  });
});

describe('reopenProject', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });
    const result = await reopenProject({ project_id: TEST_PROJECT_ID });
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('Zod 검증 실패 (잘못된 UUID) → 에러 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const result = await reopenProject({ project_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('정식 확정 프로젝트 해제 시도 → RPC 에러 전파 + 실패 감사로그', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: { success: false, error: '행정 종결된 프로젝트가 아닙니다.' },
      error: null,
    });

    const result = await reopenProject({ project_id: TEST_PROJECT_ID });

    expect(result).toEqual({ success: false, error: '행정 종결된 프로젝트가 아닙니다.' });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_REOPENED',
        success: false,
        errorMessage: '행정 종결된 프로젝트가 아닙니다.',
      })
    );
  });

  it('성공 → RPC 인자 + 감사로그 + 복원 알림 + revalidatePath 4경로', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addRpcResult({
      data: {
        success: true,
        restored_status: 'ASSIGNED',
        assigned_consultant_id: CONSULTANT_ID,
      },
      error: null,
    });
    adminMock.addResult({
      data: { company_name: COMPANY_NAME, is_test_mode: false },
      error: null,
    });

    const result = await reopenProject({ project_id: TEST_PROJECT_ID });
    await Promise.all(pendingCallbacks);

    expect(result).toEqual({ success: true });
    expect(adminMock.client.rpc).toHaveBeenCalledWith('reopen_project', {
      p_project_id: TEST_PROJECT_ID,
    });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'PROJECT_REOPENED',
        targetType: 'project',
        targetId: TEST_PROJECT_ID,
        meta: expect.objectContaining({ restored_status: 'ASSIGNED' }),
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: CONSULTANT_ID,
        type: 'status_change',
        link: `/consultant/projects/${TEST_PROJECT_ID}`,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${TEST_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${TEST_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/consultant/home');
  });
});
