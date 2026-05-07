/**
 * deleteProject Server Action 테스트
 *
 * 검증 항목:
 * - 인증·역할 가드
 * - Zod 스키마
 * - "${회사명} 삭제" 확인 문구 일치 검증
 * - DB 삭제 (CASCADE 의존)
 * - Storage 정리 (best-effort)
 * - 감사로그 + revalidatePath
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: mockAfter,
}));

import { deleteProject } from './delete-project';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440010';
const COMPANY_NAME = '테스트 주식회사';

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

/**
 * createMockSupabase 가 storage 를 지원하지 않으므로, storage 호출만 별도
 * 모킹해 주입한다.
 */
function attachStorageMock(client: ReturnType<typeof createMockSupabase>['client']) {
  const list = vi.fn();
  const remove = vi.fn();
  const from = vi.fn(() => ({ list, remove }));
  Object.assign(client, {
    storage: { from },
  });
  return { from, list, remove };
}

describe('deleteProject', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });
    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('Zod 검증 실패 시 에러 반환 (잘못된 UUID)', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const result = await deleteProject({
      project_id: 'not-a-uuid',
      confirm_text: '확인',
    });
    expect(result.success).toBe(false);
  });

  it('프로젝트가 존재하지 않으면 에러 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    attachStorageMock(adminMock.client);
    adminMock.addResult({ data: null, error: null });
    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/찾을 수 없|존재하지 않/);
    }
  });

  it('확인 문구가 일치하지 않으면 INVALID_CONFIRM_TEXT 에러', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    attachStorageMock(adminMock.client);
    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null });

    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: '잘못된 텍스트',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/확인 문구|일치하지/);
    }
  });

  it('정확한 확인 문구 + 정상 삭제 → success', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const storage = attachStorageMock(adminMock.client);
    storage.list.mockResolvedValue({ data: [], error: null });
    storage.remove.mockResolvedValue({ data: null, error: null });

    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null }); // 조회
    adminMock.addResult({ data: null, error: null }); // delete

    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    expect(result.success).toBe(true);
    expect(adminMock.chainable.delete).toHaveBeenCalled();
    expect(adminMock.chainable.eq).toHaveBeenCalledWith('id', TEST_PROJECT_ID);
  });

  it('Storage 정리: interview-attachments 버킷에서 prefix 로 list 후 remove', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const storage = attachStorageMock(adminMock.client);
    storage.list.mockResolvedValue({
      data: [{ name: 'a.pdf' }, { name: 'b.pdf' }],
      error: null,
    });
    storage.remove.mockResolvedValue({ data: null, error: null });

    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null });
    adminMock.addResult({ data: null, error: null });

    await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });

    expect(storage.from).toHaveBeenCalledWith('interview-attachments');
    expect(storage.list).toHaveBeenCalledWith(TEST_PROJECT_ID);
    expect(storage.remove).toHaveBeenCalledWith([
      `${TEST_PROJECT_ID}/a.pdf`,
      `${TEST_PROJECT_ID}/b.pdf`,
    ]);
  });

  it('Storage 호출이 실패해도 DB 삭제는 강행 (best-effort)', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const storage = attachStorageMock(adminMock.client);
    storage.list.mockRejectedValue(new Error('storage 일시 장애'));
    storage.remove.mockResolvedValue({ data: null, error: null });

    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    expect(result.success).toBe(true);
  });

  it('성공 시 감사로그 + revalidatePath 실행', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    const storage = attachStorageMock(adminMock.client);
    storage.list.mockResolvedValue({ data: [], error: null });

    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null });
    adminMock.addResult({ data: null, error: null });

    await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    await Promise.all(pendingCallbacks);

    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_DELETE',
        targetType: 'project',
        targetId: TEST_PROJECT_ID,
      }),
    );
  });

  it('SYSTEM_ADMIN 도 삭제 권한이 있다', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess('SYSTEM_ADMIN'));
    const storage = attachStorageMock(adminMock.client);
    storage.list.mockResolvedValue({ data: [], error: null });

    adminMock.addResult({ data: { company_name: COMPANY_NAME }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await deleteProject({
      project_id: TEST_PROJECT_ID,
      confirm_text: `${COMPANY_NAME} 삭제`,
    });
    expect(result.success).toBe(true);

    // requireAuthWithRole 가 OPS_ADMIN + SYSTEM_ADMIN 두 역할로 호출됐는지
    expect(mockAuthResult).toHaveBeenCalledWith(
      expect.arrayContaining(['OPS_ADMIN', 'SYSTEM_ADMIN']),
      expect.anything(),
    );
  });
});
