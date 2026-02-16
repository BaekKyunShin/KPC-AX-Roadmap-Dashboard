/**
 * roadmap-crud.ts 테스트
 * - finalizeRoadmap: 원자적 로드맵 확정 (RPC 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finalizeRoadmap } from './roadmap-crud';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';

// ─── 모킹 ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

/** Supabase RPC + from 체인 모킹 (quota.test.ts 패턴과 동일) */
function createMockSupabase() {
  const singleFn = vi.fn();
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  const mockClient = {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({ select: selectFn }),
  };

  return {
    mockClient,
    setRpcResult: (r: { data: unknown; error: unknown }) => {
      mockClient.rpc.mockResolvedValue(r);
    },
    setProjectQueryResult: (r: { data: unknown; error: unknown }) => {
      singleFn.mockResolvedValue(r);
    },
  };
}

// ─── finalizeRoadmap ────────────────────────────────────────────────────────

describe('finalizeRoadmap', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('finalize_roadmap RPC를 올바른 파라미터로 호출한다', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 2 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '테스트기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-1', 'user-1');

    expect(mock.mockClient.rpc).toHaveBeenCalledWith('finalize_roadmap', {
      p_roadmap_id: 'roadmap-1',
      p_actor_user_id: 'user-1',
    });
  });

  it('RPC 성공 시 감사로그를 기록한다', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 3 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '감사기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-2', 'user-2');

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: 'user-2',
      action: 'ROADMAP_FINALIZE',
      targetType: 'roadmap',
      targetId: 'roadmap-2',
      meta: {
        project_id: 'proj-1',
        version_number: 3,
      },
    });
  });

  it('RPC 성공 시 운영관리자에게 알림을 보낸다 (비테스트 모드)', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '알림기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-3', 'user-3');

    expect(createNotificationForAdmins).toHaveBeenCalledWith({
      type: 'roadmap_finalized',
      title: '로드맵 확정',
      message: '알림기업 프로젝트 로드맵이 최종 확정되었습니다.',
      link: '/ops/projects/proj-1',
    });
  });

  it('테스트 모드 프로젝트는 알림을 보내지 않는다', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-test', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '테스트기업', is_test_mode: true },
      error: null,
    });

    await finalizeRoadmap('roadmap-4', 'user-4');

    expect(createNotificationForAdmins).not.toHaveBeenCalled();
  });

  it('DRAFT가 아닌 로드맵 확정 시도 시 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: { success: false, error: 'DRAFT 상태의 로드맵만 최종 확정할 수 있습니다.' },
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-already-final', 'user-5')).rejects.toThrow(
      'DRAFT 상태의 로드맵만 최종 확정할 수 있습니다.'
    );
  });

  it('RPC에서 success: false 반환 시 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: { success: false, error: '배정된 컨설턴트만 최종 확정할 수 있습니다.' },
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-5', 'user-5')).rejects.toThrow(
      '배정된 컨설턴트만 최종 확정할 수 있습니다.'
    );
  });

  it('RPC 호출 자체가 실패하면 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: null,
      error: { message: 'DB connection error' },
    });

    await expect(finalizeRoadmap('roadmap-6', 'user-6')).rejects.toThrow(
      '로드맵 확정에 실패했습니다.'
    );
  });

  it('RPC data가 null이면 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: null,
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-7', 'user-7')).rejects.toThrow(
      '로드맵 확정에 실패했습니다.'
    );
  });

  it('감사로그 실패 시에도 정상 완료된다 (throw하지 않음)', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '기업', is_test_mode: false },
      error: null,
    });
    vi.mocked(createAuditLog).mockRejectedValue(new Error('audit DB down'));

    await expect(finalizeRoadmap('roadmap-8', 'user-8')).resolves.toBeUndefined();
  });

  it('알림 실패 시에도 정상 완료된다 (throw하지 않음)', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '기업', is_test_mode: false },
      error: null,
    });
    vi.mocked(createNotificationForAdmins).mockRejectedValue(new Error('notification service down'));

    await expect(finalizeRoadmap('roadmap-9', 'user-9')).resolves.toBeUndefined();
  });
});
