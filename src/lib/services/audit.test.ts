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

// audit_logs.actor_user_id / target_id 는 uuid 컬럼이므로 픽스처도 실제 UUID 를 쓴다.
// (예전 픽스처는 'user-123' 같은 임의 문자열이라, uuid 위반 버그를 모킹이 가려 왔다)
const ACTOR_UUID = '49808725-69f4-4971-9334-4707d34183e3';
const TARGET_UUID = 'd3e47283-7452-4aa4-bb77-ff373f13f7bb';

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
    vi.restoreAllMocks();
  });

  const baseParams = {
    actorUserId: ACTOR_UUID,
    action: 'PROJECT_CREATE' as const,
    targetType: 'project',
    targetId: TARGET_UUID,
  };

  it('필수 파라미터로 감사로그를 기록한다', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.mockClient.from).toHaveBeenCalledWith('audit_logs');
    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: ACTOR_UUID,
        action: 'PROJECT_CREATE',
        target_type: 'project',
        target_id: TARGET_UUID,
        success: true,
        error_message: undefined,
      })
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
      })
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
      })
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

    expect(consoleSpy).toHaveBeenCalledWith('[createAuditLog Error]', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ─── IP 주소 자동 기록 ──────────────────────────────────────────────────

  it('요청 헤더에서 IP 주소를 추출하여 meta에 포함한다', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }) as never
    );
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ ip_address: '1.2.3.4' }),
      })
    );
  });

  // ─── uuid 입력 검증 ─────────────────────────────────────────────────────
  //
  // audit_logs.actor_user_id / target_id 는 uuid 컬럼이다. 비-UUID 를 넘기면 insert 가
  // `invalid input syntax for type uuid` 로 실패하는데, 감사로그 실패는 삼켜지고
  // 호출부는 대부분 `after()` 안이라 콘솔조차 묻힌다. 실제로 /test-pbl · /test-roadmap 이
  // `targetId: 'test-mode'` 를 넘겨 감사 기록이 통째로 유실돼 왔다.
  // → 개발·테스트에서는 즉시 throw 해서 드러나게 하고, 운영에서는 본 작업을 깨지 않는다.

  it('targetId 가 UUID 가 아니면 테스트 환경에서 throw 한다', async () => {
    await expect(createAuditLog({ ...baseParams, targetId: 'test-mode' })).rejects.toThrow(
      /targetId/
    );
  });

  it('targetId 가 UUID 가 아니면 insert 를 시도하지 않는다', async () => {
    await createAuditLog({ ...baseParams, targetId: 'test-mode' }).catch(() => {});

    expect(mock.chainable.insert).not.toHaveBeenCalled();
  });

  it('actorUserId 가 UUID 가 아니면 테스트 환경에서 throw 한다', async () => {
    await expect(createAuditLog({ ...baseParams, actorUserId: 'user-123' })).rejects.toThrow(
      /actorUserId/
    );
  });

  it('actorUserId 가 null 이면 검증을 통과한다 (시스템 액션)', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog({ ...baseParams, actorUserId: null });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_user_id: null })
    );
  });

  it('운영 환경에서는 throw 하지 않고 기록만 건너뛴다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createAuditLog({ ...baseParams, targetId: 'test-mode' }); // 예외 없이 완료

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('headers() 실패 시 IP 없이 정상 기록된다', async () => {
    vi.mocked(headers).mockRejectedValue(new Error('Not in request context'));
    mock.addResult({ data: null, error: null });

    await createAuditLog(baseParams);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: {},
      })
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
    vi.restoreAllMocks();
  });

  it('기본 페이징으로 로그를 조회한다', async () => {
    const logData = [{ id: 'log-1', action: 'PROJECT_CREATE' }];
    mock.addResult({ data: logData, error: null, count: 1 });

    const result = await fetchAuditLogs({});

    expect(mock.mockClient.from).toHaveBeenCalledWith('audit_logs');
    expect(mock.chainable.select).toHaveBeenCalledWith(
      '*, actor:users!actor_user_id(id, name, email)',
      { count: 'exact' }
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

  it('SYSTEM_ADMIN은 전체 로그를 조회한다 (actor_user_id 필터 없음)', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    await fetchAuditLogs({ currentUserRole: 'SYSTEM_ADMIN' });

    expect(mock.chainable.in).not.toHaveBeenCalledWith('actor_user_id', expect.anything());
  });

  // #001 회귀 방지 — 기존에는 OPS_ADMIN 가시 범위를 컨설턴트 actor 로그로만 좁혔으나,
  // RLS 정책(`audit_logs SELECT: OPS_ADMIN 이상`) 의도와 충돌하고 OPS_ADMIN 본인이
  // 수행한 PROJECT_CREATE 등이 모두 0건으로 표시되는 결함이 있었음.
  it('#001: OPS_ADMIN도 SYSTEM_ADMIN처럼 전체 로그를 조회한다 (actor 화이트리스트 없음)', async () => {
    const logs = [
      { id: 'log-self', action: 'PROJECT_CREATE', actor_user_id: 'ops-admin-1' },
      { id: 'log-other', action: 'INTERVIEW_SAVE', actor_user_id: 'consultant-1' },
    ];
    mock.addResult({ data: logs, error: null, count: 2 });

    const result = await fetchAuditLogs({ currentUserRole: 'OPS_ADMIN' });

    // 컨설턴트 화이트리스트 쿼리가 발생하지 않음 (단일 from 호출)
    expect(mock.mockClient.from).toHaveBeenCalledTimes(1);
    expect(mock.mockClient.from).toHaveBeenCalledWith('audit_logs');
    // actor_user_id 에 화이트리스트 필터가 들어가지 않음
    expect(mock.chainable.in).not.toHaveBeenCalledWith('actor_user_id', expect.anything());
    // 본인 actor 로그가 결과에 포함됨
    expect(result.total).toBe(2);
    expect(result.logs).toEqual(logs);
  });

  it('Supabase 에러 시 빈 결과를 반환한다', async () => {
    mock.addResult({ data: null, error: { message: 'DB error' }, count: null });

    const result = await fetchAuditLogs({});
    expect(result).toEqual({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });
  });

  it('count가 null이면 total 0으로 처리', async () => {
    mock.addResult({ data: [], error: null, count: null });

    const result = await fetchAuditLogs({});

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

// ─── createAuditLog 에지 케이스 ─────────────────────────────────────────────

describe('createAuditLog 에지 케이스', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
    vi.mocked(headers).mockRejectedValue(new Error('Not in request context'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('actorUserId가 null일 때 null로 기록된다', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      actorUserId: null,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: null,
      })
    );
  });

  it('meta에 다양한 타입(숫자, 배열, 중첩 객체, boolean)이 포함된다', async () => {
    mock.addResult({ data: null, error: null });

    const complexMeta = {
      count: 42,
      tags: ['tag1', 'tag2'],
      nested: { key: 'value' },
      flag: true,
    };

    await createAuditLog({
      actorUserId: ACTOR_UUID,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
      meta: complexMeta,
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          count: 42,
          tags: ['tag1', 'tag2'],
          nested: { key: 'value' },
          flag: true,
        }),
      })
    );
  });

  it('meta가 빈 객체일 때도 정상 기록된다', async () => {
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      actorUserId: ACTOR_UUID,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
      meta: {},
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: {},
      })
    );
  });

  it('x-real-ip 헤더로 IP 주소를 추출한다 (x-forwarded-for 없을 때)', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-real-ip': '192.168.1.1' }) as never);
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      actorUserId: ACTOR_UUID,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ ip_address: '192.168.1.1' }),
      })
    );
  });

  it('IP 헤더가 모두 없으면 meta에 ip_address가 포함되지 않는다', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({}) as never);
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      actorUserId: ACTOR_UUID,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
      meta: { custom: 'data' },
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { custom: 'data' },
      })
    );
  });

  it('meta와 IP 주소가 병합된다', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-forwarded-for': '10.0.0.1' }) as never);
    mock.addResult({ data: null, error: null });

    await createAuditLog({
      actorUserId: ACTOR_UUID,
      action: 'PROJECT_CREATE' as const,
      targetType: 'project',
      targetId: TARGET_UUID,
      meta: { reason: '테스트' },
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { reason: '테스트', ip_address: '10.0.0.1' },
      })
    );
  });
});
