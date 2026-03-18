/**
 * quota.ts 테스트
 * - getKSTDateTime: KST 기준 날짜/월 조회 (순수 함수, 타이머 모킹)
 * - checkAndRecordLLMUsage: 원자적 쿼터 확인+사용량 기록 (RPC 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDefaultLimits,
  getKSTDateTime,
  checkAndRecordLLMUsage,
  fetchUserQuota,
  updateUserQuota,
  fetchUserUsage,
  fetchAllUsersUsage,
} from './quota';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Supabase 모킹 ─────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

/** Supabase RPC 모킹 — setRpcResult()로 응답을 설정 */
function createMockSupabase() {
  const mockClient = {
    rpc: vi.fn(),
  };

  return {
    mockClient,
    setRpcResult: (result: { data: unknown; error: unknown }) => {
      mockClient.rpc = vi.fn().mockResolvedValue(result);
    },
  };
}

// ─── getDefaultLimits (환경 변수 기반 기본 쿼터) ────────────────────────────

describe('getDefaultLimits', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('환경 변수가 설정되면 해당 값을 반환', () => {
    vi.stubEnv('DAILY_LLM_CALL_LIMIT', '100');
    vi.stubEnv('MONTHLY_LLM_CALL_LIMIT', '2000');

    const limits = getDefaultLimits();
    expect(limits.daily).toBe(100);
    expect(limits.monthly).toBe(2000);
  });

  it('환경 변수가 없으면 기본값 사용 (일일: 50, 월간: 500)', () => {
    vi.stubEnv('DAILY_LLM_CALL_LIMIT', '');
    vi.stubEnv('MONTHLY_LLM_CALL_LIMIT', '');

    const limits = getDefaultLimits();
    expect(limits.daily).toBe(50);
    expect(limits.monthly).toBe(500);
  });

  it('유효하지 않은 값이면 기본값 사용', () => {
    vi.stubEnv('DAILY_LLM_CALL_LIMIT', 'abc');
    vi.stubEnv('MONTHLY_LLM_CALL_LIMIT', 'xyz');

    const limits = getDefaultLimits();
    expect(limits.daily).toBe(50);
    expect(limits.monthly).toBe(500);
  });
});

// ─── getKSTDateTime ─────────────────────────────────────────────────────────

describe('getKSTDateTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('UTC 자정 → KST 09:00 (같은 날)', () => {
    // 2025-03-15 00:00:00 UTC → 2025-03-15 09:00:00 KST
    vi.setSystemTime(new Date('2025-03-15T00:00:00.000Z'));

    const { date, month } = getKSTDateTime();
    expect(date).toBe('2025-03-15');
    expect(month).toBe('2025-03');
  });

  it('UTC 15:00 → KST 다음날 00:00 (날짜 변경)', () => {
    // 2025-03-15 15:00:00 UTC → 2025-03-16 00:00:00 KST
    vi.setSystemTime(new Date('2025-03-15T15:00:00.000Z'));

    const { date, month } = getKSTDateTime();
    expect(date).toBe('2025-03-16');
    expect(month).toBe('2025-03');
  });

  it('월 경계 (UTC 3월 31일 15시 → KST 4월 1일)', () => {
    vi.setSystemTime(new Date('2025-03-31T15:00:00.000Z'));

    const { date, month } = getKSTDateTime();
    expect(date).toBe('2025-04-01');
    expect(month).toBe('2025-04');
  });

  it('연도 경계 (UTC 12월 31일 15시 → KST 1월 1일)', () => {
    vi.setSystemTime(new Date('2025-12-31T15:00:00.000Z'));

    const { date, month } = getKSTDateTime();
    expect(date).toBe('2026-01-01');
    expect(month).toBe('2026-01');
  });

  it('date는 YYYY-MM-DD, month는 YYYY-MM 형식', () => {
    vi.setSystemTime(new Date('2025-06-05T10:30:00.000Z'));

    const { date, month } = getKSTDateTime();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(month).toMatch(/^\d{4}-\d{2}$/);
    expect(date.startsWith(month)).toBe(true);
  });
});

// ─── checkAndRecordLLMUsage (원자적 쿼터 확인+기록) ─────────────────────────
//
// 호출 흐름: supabase.rpc('check_and_increment_llm_usage', { ... })
// DB 함수가 원자적으로 쿼터 확인 + 사용량 증가를 수행하고 결과를 반환

describe('checkAndRecordLLMUsage', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T05:00:00.000Z'));

    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('쿼터 미초과 시 exceeded: false 반환 (원자적 증가 완료)', async () => {
    mock.setRpcResult({
      data: { exceeded: false },
      error: null,
    });

    const result = await checkAndRecordLLMUsage('user-1');

    expect(result.exceeded).toBe(false);
    expect(result.reason).toBeUndefined();
    expect(mock.mockClient.rpc).toHaveBeenCalledWith(
      'check_and_increment_llm_usage',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_date: '2025-03-15',
        p_month: '2025-03',
      })
    );
  });

  it('일일 쿼터 초과 시 exceeded: true, reason: daily', async () => {
    mock.setRpcResult({
      data: {
        exceeded: true,
        reason: 'daily',
        message: '일일 사용량 한도(50회)에 도달했습니다. 내일 다시 시도해주세요.',
      },
      error: null,
    });

    const result = await checkAndRecordLLMUsage('user-1');

    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('daily');
    expect(result.message).toContain('50');
  });

  it('월간 쿼터 초과 시 exceeded: true, reason: monthly', async () => {
    mock.setRpcResult({
      data: {
        exceeded: true,
        reason: 'monthly',
        message: '월간 사용량 한도(500회)에 도달했습니다. 관리자에게 문의하세요.',
      },
      error: null,
    });

    const result = await checkAndRecordLLMUsage('user-1');

    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('monthly');
  });

  it('RPC 호출 실패 시 에러를 throw', async () => {
    mock.setRpcResult({
      data: null,
      error: { message: 'DB connection error' },
    });

    await expect(checkAndRecordLLMUsage('user-1')).rejects.toThrow(
      '쿼터 확인/기록 실패'
    );
  });

  it('KST 기준 date와 month를 사용', async () => {
    // UTC 2025-03-15 15:00 → KST 2025-03-16
    vi.setSystemTime(new Date('2025-03-15T15:00:00.000Z'));

    mock.setRpcResult({
      data: { exceeded: false },
      error: null,
    });

    await checkAndRecordLLMUsage('user-1');

    expect(mock.mockClient.rpc).toHaveBeenCalledWith(
      'check_and_increment_llm_usage',
      expect.objectContaining({
        p_date: '2025-03-16',
        p_month: '2025-03',
      })
    );
  });

  it('토큰 파라미터를 RPC에 전달', async () => {
    mock.setRpcResult({
      data: { exceeded: false },
      error: null,
    });

    await checkAndRecordLLMUsage('user-1', 100, 200);

    expect(mock.mockClient.rpc).toHaveBeenCalledWith(
      'check_and_increment_llm_usage',
      expect.objectContaining({
        p_tokens_in: 100,
        p_tokens_out: 200,
      })
    );
  });
});

// ─── Supabase 체인 모킹 (fetchUserQuota, updateUserQuota용) ──────────────

function createChainMock() {
  let selectSingleResult: { data: unknown; error: unknown } = {
    data: null,
    error: null,
  };

  // select chain: .select('*').eq('user_id', id).single()
  const singleFn = vi.fn(() => Promise.resolve(selectSingleResult));
  const selectEqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEqFn });

  // update chain: .update({...}).eq('user_id', id)
  const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

  // upsert: .upsert({...}, options) → Promise
  const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

  const fromResult = {
    upsert: upsertFn,
    select: selectFn,
    update: updateFn,
  };

  const mockClient = {
    from: vi.fn().mockReturnValue(fromResult),
  };

  return {
    mockClient,
    upsertFn,
    updateFn,
    setSelectSingleResult: (r: { data: unknown; error: unknown }) => {
      selectSingleResult = r;
    },
  };
}

// ─── fetchUserQuota ─────────────────────────────────────────────────────────

describe('fetchUserQuota', () => {
  let mock: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    mock = createChainMock();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('기존 쿼터가 있으면 해당 값을 반환', async () => {
    mock.setSelectSingleResult({
      data: { user_id: 'user-1', daily_limit: 100, monthly_limit: 1000 },
      error: null,
    });

    const result = await fetchUserQuota('user-1');

    expect(result.daily_limit).toBe(100);
    expect(result.monthly_limit).toBe(1000);
  });

  it('SELECT 실패 시 기본 쿼터 반환', async () => {
    mock.setSelectSingleResult({ data: null, error: { message: 'not found' } });

    const result = await fetchUserQuota('user-1');

    expect(result.daily_limit).toBe(50);
    expect(result.monthly_limit).toBe(500);
  });

  it('upsert로 원자적 행 생성 보장 (ON CONFLICT DO NOTHING)', async () => {
    mock.setSelectSingleResult({
      data: { daily_limit: 50, monthly_limit: 500 },
      error: null,
    });

    await fetchUserQuota('user-1');

    expect(mock.upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' }),
      expect.objectContaining({ onConflict: 'user_id', ignoreDuplicates: true })
    );
  });
});

// ─── updateUserQuota ────────────────────────────────────────────────────────

describe('updateUserQuota', () => {
  let mock: ReturnType<typeof createChainMock>;

  beforeEach(() => {
    mock = createChainMock();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('업데이트할 항목이 없으면 아무것도 하지 않음', async () => {
    await updateUserQuota('user-1');

    expect(mock.mockClient.from).not.toHaveBeenCalled();
  });

  it('upsert로 행 존재 보장 후 부분 업데이트', async () => {
    await updateUserQuota('user-1', 200);

    expect(mock.upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' }),
      expect.objectContaining({ onConflict: 'user_id', ignoreDuplicates: true })
    );
    expect(mock.updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ daily_limit: 200 })
    );
  });

  it('dailyLimit만 전달하면 daily_limit만 업데이트', async () => {
    await updateUserQuota('user-1', 200);

    expect(mock.updateFn).toHaveBeenCalledWith({ daily_limit: 200 });
  });

  it('monthlyLimit만 전달하면 monthly_limit만 업데이트', async () => {
    await updateUserQuota('user-1', undefined, 3000);

    expect(mock.updateFn).toHaveBeenCalledWith({ monthly_limit: 3000 });
  });
});

// ─── fetchUserUsage 모킹 헬퍼 ──────────────────────────────────────────────
//
// fetchUserUsage 내부 호출 순서:
// 1. createAdminClient() → usageMockClient (본체용)
// 2. fetchUserQuota → createAdminClient() → quotaMockClient
//    - quotaMockClient.from('user_quotas').upsert(...)
//    - quotaMockClient.from('user_quotas').select().eq().single()
// 3. usageMockClient.from('usage_metrics').select().eq().eq().single() (일별)
// 4. usageMockClient.from('usage_metrics').select().eq().eq() (월별, 배열)

interface UsageMockOptions {
  quota: { daily_limit: number; monthly_limit: number };
  dailyUsage: { llm_calls: number } | null;
  monthlyUsage: { llm_calls: number }[] | null;
}

function createUsageMock(options: UsageMockOptions) {
  const { quota, dailyUsage, monthlyUsage } = options;

  // ── quotaMockClient (fetchUserQuota 내부용) ──
  const quotaSingleFn = vi.fn().mockResolvedValue({
    data: { user_id: 'any', ...quota },
    error: null,
  });
  const quotaSelectEqFn = vi.fn().mockReturnValue({ single: quotaSingleFn });
  const quotaSelectFn = vi.fn().mockReturnValue({ eq: quotaSelectEqFn });
  const quotaUpsertFn = vi.fn().mockResolvedValue({ data: null, error: null });

  const quotaMockClient = {
    from: vi.fn().mockReturnValue({
      upsert: quotaUpsertFn,
      select: quotaSelectFn,
    }),
  };

  // ── usageMockClient (fetchUserUsage 본체용) ──
  // from('usage_metrics')가 2번 호출됨: 일별(single), 월별(배열)
  const dailySingleFn = vi.fn().mockResolvedValue({
    data: dailyUsage,
    error: null,
  });
  const dailyEq2Fn = vi.fn().mockReturnValue({ single: dailySingleFn });
  const dailyEq1Fn = vi.fn().mockReturnValue({ eq: dailyEq2Fn });
  const dailySelectFn = vi.fn().mockReturnValue({ eq: dailyEq1Fn });

  // 월별: .select().eq().eq() → Promise (배열 반환, single 없음)
  const monthlyEq2Fn = vi.fn().mockResolvedValue({
    data: monthlyUsage,
    error: null,
  });
  const monthlyEq1Fn = vi.fn().mockReturnValue({ eq: monthlyEq2Fn });
  const monthlySelectFn = vi.fn().mockReturnValue({ eq: monthlyEq1Fn });

  const usageMockClient = {
    from: vi.fn()
      .mockReturnValueOnce({ select: dailySelectFn })   // 1st: 일별 usage_metrics
      .mockReturnValueOnce({ select: monthlySelectFn }), // 2nd: 월별 usage_metrics
  };

  return { usageMockClient, quotaMockClient };
}

// ─── fetchUserUsage ─────────────────────────────────────────────────────────

describe('fetchUserUsage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-03-15 05:00:00 UTC → KST 2025-03-15 14:00:00
    vi.setSystemTime(new Date('2025-03-15T05:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('일별/월별 사용량과 한도를 정상 반환', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 10 },
      monthlyUsage: [{ llm_calls: 80 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)   // fetchUserUsage 본체
      .mockReturnValueOnce(quotaMockClient as never);   // fetchUserQuota

    const result = await fetchUserUsage('user-1');

    expect(result).toEqual({
      daily: 10,
      monthly: 80,
      dailyLimit: 50,
      monthlyLimit: 500,
      dailyRemaining: 40,
      monthlyRemaining: 420,
    });
  });

  it('일별 사용량 없음(null) → daily: 0', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: null,
      monthlyUsage: [{ llm_calls: 30 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.daily).toBe(0);
    expect(result.dailyRemaining).toBe(50);
  });

  it('월별 사용량 여러 행 합산', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 5 },
      monthlyUsage: [{ llm_calls: 10 }, { llm_calls: 20 }, { llm_calls: 30 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.monthly).toBe(60);
    expect(result.monthlyRemaining).toBe(440);
  });

  it('일별 사용량이 한도를 초과하면 dailyRemaining: 0 (Math.max)', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 60 },
      monthlyUsage: [{ llm_calls: 60 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.daily).toBe(60);
    expect(result.dailyRemaining).toBe(0);
  });

  it('월별 사용량이 한도를 초과하면 monthlyRemaining: 0 (Math.max)', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 10 },
      monthlyUsage: [{ llm_calls: 300 }, { llm_calls: 350 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.monthly).toBe(650);
    expect(result.monthlyRemaining).toBe(0);
  });

  it('KST 기준 날짜 사용 (UTC 15시 → KST 다음날)', async () => {
    // UTC 2025-03-15 15:00 → KST 2025-03-16
    vi.setSystemTime(new Date('2025-03-15T15:00:00.000Z'));

    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 5 },
      monthlyUsage: [{ llm_calls: 5 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    await fetchUserUsage('user-1');

    // 일별 쿼리 체인에서 eq가 'date' → '2025-03-16' 순서로 호출됨
    const dailyFromCall = usageMockClient.from.mock.results[0].value;
    const dailySelectCall = dailyFromCall.select.mock.results[0].value;
    const dailyEq1Call = dailySelectCall.eq;
    expect(dailyEq1Call).toHaveBeenCalledWith('user_id', 'user-1');
    const dailyEq2Call = dailyEq1Call.mock.results[0].value.eq;
    expect(dailyEq2Call).toHaveBeenCalledWith('date', '2025-03-16');
  });

  it('한도와 사용량이 같을 때 remaining: 0 (경계값)', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 50 },
      monthlyUsage: [{ llm_calls: 500 }],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.dailyRemaining).toBe(0);
    expect(result.monthlyRemaining).toBe(0);
    expect(result.daily).toBe(50);
    expect(result.monthly).toBe(500);
  });

  it('월별 사용량 빈 배열 → monthly: 0', async () => {
    const { usageMockClient, quotaMockClient } = createUsageMock({
      quota: { daily_limit: 50, monthly_limit: 500 },
      dailyUsage: { llm_calls: 3 },
      monthlyUsage: [],
    });

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(usageMockClient as never)
      .mockReturnValueOnce(quotaMockClient as never);

    const result = await fetchUserUsage('user-1');

    expect(result.monthly).toBe(0);
    expect(result.monthlyRemaining).toBe(500);
  });
});

// ─── fetchAllUsersUsage 모킹 헬퍼 ──────────────────────────────────────────

interface AllUsageMockOptions {
  users: { data: unknown[] | null; count: number | null };
  monthlyUsage: { data: unknown[] | null };
  quotas: { data: unknown[] | null };
}

function createAllUsageMock(options: AllUsageMockOptions) {
  const { users, monthlyUsage, quotas } = options;

  // from() 호출 순서: users → usage_metrics → user_quotas
  let fromCallCount = 0;

  // ── users 쿼리 체인 ──
  // .from('users').select(..., { count: 'exact' }).in().order().range()
  const usersRangeFn = vi.fn().mockResolvedValue({
    data: users.data,
    count: users.count,
  });
  const usersOrderFn = vi.fn().mockReturnValue({ range: usersRangeFn });
  const usersInFn = vi.fn().mockReturnValue({ order: usersOrderFn });
  const usersSelectFn = vi.fn().mockReturnValue({ in: usersInFn });
  const usersChain = { select: usersSelectFn };

  // ── usage_metrics 쿼리 체인 ──
  // .from('usage_metrics').select('user_id, llm_calls').in().eq()
  const metricsEqFn = vi.fn().mockResolvedValue({
    data: monthlyUsage.data,
    error: null,
  });
  const metricsInFn = vi.fn().mockReturnValue({ eq: metricsEqFn });
  const metricsSelectFn = vi.fn().mockReturnValue({ in: metricsInFn });
  const metricsChain = { select: metricsSelectFn };

  // ── user_quotas 쿼리 체인 ──
  // .from('user_quotas').select('user_id, daily_limit, monthly_limit').in()
  const quotasInFn = vi.fn().mockResolvedValue({
    data: quotas.data,
    error: null,
  });
  const quotasSelectFn = vi.fn().mockReturnValue({ in: quotasInFn });
  const quotasChain = { select: quotasSelectFn };

  const mockClient = {
    from: vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return usersChain;
      if (fromCallCount === 2) return metricsChain;
      return quotasChain;
    }),
  };

  return { mockClient };
}

// ─── fetchAllUsersUsage ─────────────────────────────────────────────────────

describe('fetchAllUsersUsage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T05:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('SYSTEM_ADMIN → CONSULTANT_APPROVED + OPS_ADMIN 사용자 조회', async () => {
    const { mockClient } = createAllUsageMock({
      users: {
        data: [
          { id: 'u1', name: '홍길동', email: 'hong@test.com', role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
          { id: 'u2', name: '김관리', email: 'kim@test.com', role: 'OPS_ADMIN', status: 'ACTIVE' },
        ],
        count: 2,
      },
      monthlyUsage: {
        data: [
          { user_id: 'u1', llm_calls: 30 },
          { user_id: 'u2', llm_calls: 50 },
        ],
      },
      quotas: {
        data: [
          { user_id: 'u1', daily_limit: 50, monthly_limit: 500 },
          { user_id: 'u2', daily_limit: 100, monthly_limit: 1000 },
        ],
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await fetchAllUsersUsage({ currentUserRole: 'SYSTEM_ADMIN' });

    expect(result.users).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.users[0].monthlyUsage).toBe(30);
    expect(result.users[1].monthlyUsage).toBe(50);

    // in() 호출에 targetRoles 확인
    const usersInCall = mockClient.from.mock.results[0].value.select.mock.results[0].value.in;
    expect(usersInCall).toHaveBeenCalledWith('role', ['CONSULTANT_APPROVED', 'OPS_ADMIN']);
  });

  it('OPS_ADMIN → CONSULTANT_APPROVED만 조회 (OPS_ADMIN 제외)', async () => {
    const { mockClient } = createAllUsageMock({
      users: {
        data: [
          { id: 'u1', name: '홍길동', email: 'hong@test.com', role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        ],
        count: 1,
      },
      monthlyUsage: {
        data: [{ user_id: 'u1', llm_calls: 20 }],
      },
      quotas: {
        data: [{ user_id: 'u1', daily_limit: 50, monthly_limit: 500 }],
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await fetchAllUsersUsage({ currentUserRole: 'OPS_ADMIN' });

    expect(result.users).toHaveLength(1);
    const usersInCall = mockClient.from.mock.results[0].value.select.mock.results[0].value.in;
    expect(usersInCall).toHaveBeenCalledWith('role', ['CONSULTANT_APPROVED']);
  });

  it('CONSULTANT_APPROVED → 관리 가능 역할 없으므로 빈 결과 즉시 반환', async () => {
    const result = await fetchAllUsersUsage({ currentUserRole: 'CONSULTANT_APPROVED' });

    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    // createAdminClient가 호출되지만 from()은 호출되지 않아야 함
    // (targetRoles가 비어있어 early return)
  });

  it('조회된 사용자가 없으면 빈 결과 반환', async () => {
    const { mockClient } = createAllUsageMock({
      users: { data: [], count: 0 },
      monthlyUsage: { data: [] },
      quotas: { data: [] },
    });

    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await fetchAllUsersUsage({ currentUserRole: 'SYSTEM_ADMIN' });

    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('usagePercent 정확한 계산: llmCalls 25 / monthlyLimit 100 → 25%', async () => {
    const { mockClient } = createAllUsageMock({
      users: {
        data: [
          { id: 'u1', name: '테스트', email: 't@test.com', role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        ],
        count: 1,
      },
      monthlyUsage: {
        data: [{ user_id: 'u1', llm_calls: 25 }],
      },
      quotas: {
        data: [{ user_id: 'u1', daily_limit: 50, monthly_limit: 100 }],
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await fetchAllUsersUsage({ currentUserRole: 'SYSTEM_ADMIN' });

    expect(result.users[0].usagePercent).toBe(25);
    expect(result.users[0].monthlyLimit).toBe(100);
  });

  it('쿼터 없는 사용자는 기본값(daily:50, monthly:500) 사용', async () => {
    const { mockClient } = createAllUsageMock({
      users: {
        data: [
          { id: 'u1', name: '무쿼터', email: 'nq@test.com', role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        ],
        count: 1,
      },
      monthlyUsage: {
        data: [{ user_id: 'u1', llm_calls: 10 }],
      },
      quotas: {
        data: [], // 쿼터 데이터 없음
      },
    });

    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    const result = await fetchAllUsersUsage({ currentUserRole: 'SYSTEM_ADMIN' });

    expect(result.users[0].dailyLimit).toBe(50);
    expect(result.users[0].monthlyLimit).toBe(500);
    expect(result.users[0].usagePercent).toBe(2); // Math.round(10/500*100)
  });
});
