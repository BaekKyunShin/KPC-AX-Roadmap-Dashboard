/**
 * ops/audit/actions.ts 테스트
 *
 * fetchAuditLogs:
 *   - 인증 실패 → 빈 결과, 정상(role·필터 전달 확인)
 *
 * fetchAllAuditLogs:
 *   - 인증 실패 → { logs: [] }, 1페이지 완료, 여러 페이지, MAX 도달
 *
 * fetchUsers:
 *   - 인증 실패 → [], SYSTEM_ADMIN 전체 조회, OPS_ADMIN 컨설턴트 필터
 *
 * getActionTypes / getTargetTypes:
 *   - 배열 길이·항목 구조 확인
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  fetchAuditLogs: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { fetchAuditLogs as fetchAuditLogsService } from '@/lib/services/audit';
import {
  fetchAuditLogs,
  fetchAllAuditLogs,
  fetchUsers,
  getActionTypes,
  getTargetTypes,
} from './actions';

// ─── 공통 설정 ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── fetchAuditLogs ─────────────────────────────────────────────────────────

describe('fetchAuditLogs', () => {
  it('인증 실패 → 빈 결과 반환', async () => {
    vi.mocked(requireAuthWithRole).mockResolvedValue({ error: '권한 없음' });

    const result = await fetchAuditLogs();

    expect(result).toEqual({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
  });

  it('정상 — fetchAuditLogsService에 currentUserRole 전달', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService).mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    await fetchAuditLogs({ action: 'USER_APPROVE' });

    expect(fetchAuditLogsService).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserRole: 'SYSTEM_ADMIN',
        action: 'USER_APPROVE',
      }),
    );
  });

  it('OPS_ADMIN 역할 — 날짜 범위 필터 전달', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService).mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    await fetchAuditLogs({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      targetType: 'project',
    });

    expect(fetchAuditLogsService).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserRole: 'OPS_ADMIN',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        targetType: 'project',
      }),
    );
  });

  it('필터 없이 기본 호출 — fetchAuditLogsService가 currentUserRole 포함', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService).mockResolvedValue({
      logs: [{ id: 'log-1' } as never],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    const result = await fetchAuditLogs();

    expect(fetchAuditLogsService).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
  });
});

// ─── fetchAllAuditLogs ──────────────────────────────────────────────────────

describe('fetchAllAuditLogs', () => {
  it('인증 실패 → { logs: [] }', async () => {
    vi.mocked(requireAuthWithRole).mockResolvedValue({ error: '권한 없음' });

    const result = await fetchAllAuditLogs();

    expect(result).toEqual({ logs: [] });
  });

  it('1페이지에 모든 로그 (500건, < CHUNK_SIZE) → 2번째 호출에서 빈 배열로 종료', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService)
      .mockResolvedValueOnce({
        logs: Array(500).fill({ id: '1' }),
        total: 500,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        logs: [],
        total: 500,
        page: 2,
        limit: 1000,
        totalPages: 1,
      });

    const result = await fetchAllAuditLogs();

    expect(result.logs).toHaveLength(500);
    expect(fetchAuditLogsService).toHaveBeenCalledTimes(2);
  });

  it('여러 페이지 순회 (1000+500건)', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService)
      .mockResolvedValueOnce({
        logs: Array(1000).fill({ id: '1' }),
        total: 1500,
        page: 1,
        limit: 1000,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        logs: Array(500).fill({ id: '2' }),
        total: 1500,
        page: 2,
        limit: 1000,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        logs: [],
        total: 1500,
        page: 3,
        limit: 1000,
        totalPages: 2,
      });

    const result = await fetchAllAuditLogs();

    expect(result.logs).toHaveLength(1500);
  });

  it('10000건 MAX 도달 → 루프 종료', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService).mockImplementation(async (opts) => ({
      logs: Array(1000).fill({ id: '1' }),
      total: 15000,
      page: opts?.page || 1,
      limit: 1000,
      totalPages: 15,
    }));

    const result = await fetchAllAuditLogs();

    expect(result.logs).toHaveLength(10000);
    // while 조건: allLogs.length < 10000 → 10번 * 1000 = 10000 → 조건 불만족 → 종료
    expect(fetchAuditLogsService).toHaveBeenCalledTimes(10);
  });

  it('OPS_ADMIN 역할 — fetchAllAuditLogs에서 currentUserRole 전달', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService)
      .mockResolvedValueOnce({
        logs: Array(5).fill({ id: '1' }),
        total: 5,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        logs: [],
        total: 5,
        page: 2,
        limit: 1000,
        totalPages: 1,
      });

    const result = await fetchAllAuditLogs({ action: 'PROJECT_CREATE' });

    expect(fetchAuditLogsService).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserRole: 'OPS_ADMIN',
        action: 'PROJECT_CREATE',
      }),
    );
    expect(result.logs).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it('fetchAuditLogsService 에러 시 빈 결과 반환 (throw하지 않음)', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService).mockRejectedValueOnce(
      new Error('DB 연결 실패'),
    );

    const result = await fetchAllAuditLogs();

    // 에러 시 빈 배열 반환, throw하지 않음
    expect(result).toEqual({ logs: [] });
  });

  it('fetchAllAuditLogs — 첫 페이지 결과로 total 설정', async () => {
    const mockAuth = {
      user: { id: 'u1', email: 'a@b.com' },
      supabase: {},
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    vi.mocked(fetchAuditLogsService)
      .mockResolvedValueOnce({
        logs: Array(3).fill({ id: '1' }),
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })
      .mockResolvedValueOnce({
        logs: [],
        total: 3,
        page: 2,
        limit: 1000,
        totalPages: 1,
      });

    const result = await fetchAllAuditLogs();

    // total은 첫 페이지 결과에서 가져옴
    expect(result.total).toBe(3);
  });
});

// ─── fetchUsers ─────────────────────────────────────────────────────────────

describe('fetchUsers', () => {
  it('인증 실패 → []', async () => {
    vi.mocked(requireAuthWithRole).mockResolvedValue({ error: '권한 없음' });

    const result = await fetchUsers();

    expect(result).toEqual([]);
  });

  it('SYSTEM_ADMIN → 전체 사용자 조회 (in() 호출 안 됨)', async () => {
    const mock = createMockSupabase();
    const mockAuth = {
      user: { id: 'u1' },
      supabase: mock.client,
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    mock.addResult({
      data: [{ id: 'u1', name: '이름', email: 'a@b.com' }],
      error: null,
    });

    const result = await fetchUsers();

    expect(result).toHaveLength(1);
    expect(mock.client.from).toHaveBeenCalledWith('users');
    // SYSTEM_ADMIN은 전체 조회 → in() 호출 안 됨
    expect(mock.chainable.in).not.toHaveBeenCalled();
  });

  it('OPS_ADMIN → CONSULTANT_ROLES로 in() 필터', async () => {
    const mock = createMockSupabase();
    const mockAuth = {
      user: { id: 'u1' },
      supabase: mock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    };
    vi.mocked(requireAuthWithRole).mockResolvedValue(mockAuth as never);
    mock.addResult({
      data: [{ id: 'u2', name: '컨설턴트', email: 'c@b.com' }],
      error: null,
    });

    const result = await fetchUsers();

    expect(result).toHaveLength(1);
    expect(mock.chainable.in).toHaveBeenCalledWith(
      'role',
      expect.arrayContaining(['USER_PENDING', 'CONSULTANT_APPROVED']),
    );
  });
});

// ─── getActionTypes / getTargetTypes ────────────────────────────────────────

describe('getActionTypes', () => {
  it('배열 길이 > 0, 각 항목에 value/label 포함', async () => {
    const types = await getActionTypes();

    expect(types.length).toBeGreaterThan(0);
    for (const t of types) {
      expect(t).toHaveProperty('value');
      expect(t).toHaveProperty('label');
    }
  });
});

describe('getTargetTypes', () => {
  it('배열 길이 > 0, 각 항목에 value/label 포함', async () => {
    const types = await getTargetTypes();

    expect(types.length).toBeGreaterThan(0);
    for (const t of types) {
      expect(t).toHaveProperty('value');
      expect(t).toHaveProperty('label');
    }
  });
});
