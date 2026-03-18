/**
 * audit.ts 테스트
 * - createAuditLog: 감사로그 기록 (Supabase 모킹)
 * - fetchAuditLogs: 감사로그 조회 (Supabase 모킹, 역할별 필터링)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuditLog, fetchAuditLogs } from './audit';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Supabase 모킹 ─────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// ─── next/headers 모킹 ─────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { headers } from 'next/headers';

/**
 * Supabase 클라이언트 체인 모킹 (quota.test.ts 패턴 재활용)
 */
function createMockSupabase() {
  const results: Array<{ data: unknown; error: unknown; count?: number | null }> = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      const r = results[resultIndex++];
      return { data: r.data, error: r.error, count: r.count ?? null };
    }
    return { data: null, error: null, count: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  for (const method of ['select', 'eq', 'in', 'order', 'range', 'gte', 'lte']) {
    chainable[method] = vi.fn(() => chainable);
  }

  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);

  chainable.single = vi.fn(() => nextResult());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve(nextResult()).then(resolve, reject);
  };

  const mockClient = {
    from: vi.fn(() => chainable),
  };

  return {
    mockClient,
    chainable,
    addResult: (result: { data: unknown; error: unknown; count?: number | null }) => {
      results.push(result);
    },
  };
}

// ─── createAuditLog ─────────────────────────────────────────────────────────

describe('createAuditLog', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
    // 기본: headers() 실패 (요청 컨텍스트 없음)
    vi.mocked(headers).mockRejectedValue(new Error('Not in request context'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    actorUserId: 'user-123',
    action: 'PROJECT_CREATE' as const,
    targetType: 'project',
    targetId: 'proj-456',
  };

  it('필수 파라미터로 감사로그를 기록한다', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.mockClient.from).toHaveBeenCalledWith('audit_logs');
    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'user-123',
        action: 'PROJECT_CREATE',
        target_type: 'project',
        target_id: 'proj-456',
        success: true,
        error_message: undefined,
      }),
    );
  });

  it('meta 데이터를 포함하여 기록한다', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      ...baseParams,
      meta: { previous_status: 'NEW', new_status: 'DIAGNOSED' },
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ previous_status: 'NEW', new_status: 'DIAGNOSED' }),
      }),
    );
  });

  it('실패 기록 시 success: false와 errorMessage 포함', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      ...baseParams,
      success: false,
      errorMessage: '권한 부족',
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error_message: '권한 부족',
      }),
    );
  });

  it('Supabase insert 에러 시 예외를 던지지 않고 console.error 출력', async () => {
    const dbError = { message: 'insert failed' };
    mock.addResult({ data: null, error: dbError });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createAuditLog(baseParams); // 예외 없이 완료

    expect(consoleSpy).toHaveBeenCalledWith('[createAuditLog Error]', dbError);
    consoleSpy.mockRestore();
  });

  it('예외 발생 시에도 throw하지 않음', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('연결 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createAuditLog(baseParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createAuditLog Error]',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  // ─── IP 주소 자동 기록 ──────────────────────────────────────────────────

  it('요청 헤더에서 IP 주소를 추출하여 meta에 포함한다', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }) as never,
    );
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ ip_address: '1.2.3.4' }),
      }),
    );
  });

  it('headers() 실패 시 IP 없이 정상 기록된다', async () => {
    vi.mocked(headers).mockRejectedValue(new Error('Not in request context'));
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: {},
      }),
    );
  });
});

// ─── fetchAuditLogs ─────────────────────────────────────────────────────────

describe('fetchAuditLogs', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('기본 페이징으로 로그를 조회한다', async () => {
    const logData = [{ id: 'log-1', action: 'PROJECT_CREATE' }];
    mock.addResult({ data: logData, error: null, count: 1 });

    const result = await fetchAuditLogs({});

    expect(mock.mockClient.from).toHaveBeenCalledWith('audit_logs');
    expect(mock.chainable.select).toHaveBeenCalledWith(
      '*, actor:users!actor_user_id(id, name, email)',
      { count: 'exact' },
    );
    expect(mock.chainable.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mock.chainable.range).toHaveBeenCalledWith(0, 49); // page 1, limit 50
    expect(result).toEqual({
      logs: logData,
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it('page와 limit 파라미터를 적용한다', async () => {
    mock.addResult({ data: [], error: null, count: 100 });

    const result = await fetchAuditLogs({ page: 3, limit: 10 });

    expect(mock.chainable.range).toHaveBeenCalledWith(20, 29); // (3-1)*10 ~ 3*10-1
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(10); // ceil(100/10)
  });

  it('action 필터를 적용한다', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ action: 'USER_APPROVE' });

    expect(mock.chainable.eq).toHaveBeenCalledWith('action', 'USER_APPROVE');
  });

  it('targetType 필터를 적용한다', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ targetType: 'project' });

    expect(mock.chainable.eq).toHaveBeenCalledWith('target_type', 'project');
  });

  it('actorUserId 필터를 적용한다', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ actorUserId: 'user-123' });

    expect(mock.chainable.eq).toHaveBeenCalledWith('actor_user_id', 'user-123');
  });

  it('startDate/endDate 필터를 적용한다', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });

    expect(mock.chainable.gte).toHaveBeenCalledWith('created_at', '2025-01-01');
    expect(mock.chainable.lte).toHaveBeenCalledWith('created_at', '2025-12-31');
  });

  it('SYSTEM_ADMIN은 전체 로그를 조회한다 (컨설턴트 필터 없음)', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ currentUserRole: 'SYSTEM_ADMIN' });

    // 컨설턴트 조회를 위한 별도 from('users') 호출 없음
    // from은 audit_logs 한 번만 호출됨
    expect(mock.chainable.in).not.toHaveBeenCalledWith(
      'actor_user_id',
      expect.anything(),
    );
  });

  it('OPS_ADMIN은 컨설턴트가 수행한 로그만 조회한다', async () => {
    // R1: 컨설턴트 목록 조회 (from('users'))
    mock.addResult({ data: [{ id: 'consultant-1' }, { id: 'consultant-2' }], error: null });
    // R2: 감사로그 조회 (from('audit_logs'))
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ currentUserRole: 'OPS_ADMIN' });

    // 컨설턴트 역할 필터
    expect(mock.chainable.in).toHaveBeenCalledWith('role', ['USER_PENDING', 'CONSULTANT_APPROVED']);
    // 감사로그를 컨설턴트 ID로 필터링
    expect(mock.chainable.in).toHaveBeenCalledWith(
      'actor_user_id',
      ['consultant-1', 'consultant-2'],
    );
  });

  it('OPS_ADMIN이고 컨설턴트가 없으면 빈 결과 반환', async () => {
    mock.addResult({ data: [], error: null }); // 컨설턴트 0명

    const result = await fetchAuditLogs({ currentUserRole: 'OPS_ADMIN' });

    expect(result).toEqual({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
    // audit_logs 쿼리는 실행되지 않음
  });

  it('Supabase 에러 시 Error를 throw한다', async () => {
    mock.addResult({ data: null, error: { message: 'DB error' }, count: null });

    await expect(fetchAuditLogs({})).rejects.toThrow('감사로그 조회 실패: DB error');
  });

  it('count가 null이면 total 0으로 처리', async () => {
    mock.addResult({ data: [], error: null, count: null });

    const result = await fetchAuditLogs({});

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
