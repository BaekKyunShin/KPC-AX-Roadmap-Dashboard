/**
 * quota.ts 테스트
 * - getKSTDateTime: KST 기준 날짜/월 조회 (순수 함수, 타이머 모킹)
 * - checkQuotaExceeded: 쿼터 초과 여부 확인 (Supabase 모킹)
 * - recordLLMUsage: LLM 호출 사용량 기록 (Supabase 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getKSTDateTime, checkQuotaExceeded, recordLLMUsage } from './quota';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Supabase 모킹 ─────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

/**
 * Supabase 클라이언트 체인 모킹
 * - .single() 호출 시: 큐에서 결과를 꺼내 반환
 * - .single() 없이 await 시: thenable로 큐에서 결과를 꺼내 반환
 * - 결과는 addResult()로 추가한 순서대로 소비됨
 */
function createMockSupabase() {
  const results: Array<{ data: unknown; error: unknown }>  = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      return results[resultIndex++];
    }
    return { data: null, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  // 체이닝 메서드: 자신을 반환
  for (const method of ['select', 'eq', 'in', 'order', 'range']) {
    chainable[method] = vi.fn(() => chainable);
  }

  // insert/update: 인수를 기록하고 자신을 반환
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);

  // .single(): 큐에서 결과 꺼내 반환 (plain object, thenable 아님)
  chainable.single = vi.fn(() => nextResult());

  // thenable: .single() 없이 await할 때 큐에서 결과 꺼냄
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
    addResult: (result: { data: unknown; error: unknown }) => {
      results.push(result);
    },
  };
}

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

// ─── checkQuotaExceeded ─────────────────────────────────────────────────────
//
// 호출 흐름: checkQuotaExceeded → fetchUserUsage → fetchUserQuota
// 결과 소비 순서:
//   1) fetchUserQuota: from('user_quotas').select().eq().single() → R1
//   2) 일별 사용량: from('usage_metrics').select().eq().eq().single() → R2
//   3) 월별 사용량: from('usage_metrics').select().eq().eq() [no single] → R3

describe('checkQuotaExceeded', () => {
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

  it('쿼터 미초과 시 exceeded: false 반환', async () => {
    mock.addResult({ data: { daily_limit: 50, monthly_limit: 500 }, error: null }); // R1: quota
    mock.addResult({ data: { llm_calls: 10 }, error: null });                       // R2: daily
    mock.addResult({ data: [{ llm_calls: 30 }], error: null });                     // R3: monthly

    const result = await checkQuotaExceeded('user-1');

    expect(result.exceeded).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it('일일 쿼터 초과 시 exceeded: true, reason: daily', async () => {
    mock.addResult({ data: { daily_limit: 50, monthly_limit: 500 }, error: null });
    mock.addResult({ data: { llm_calls: 50 }, error: null }); // 일일 한도 도달
    mock.addResult({ data: [{ llm_calls: 50 }], error: null });

    const result = await checkQuotaExceeded('user-1');

    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('daily');
    expect(result.message).toContain('50');
  });

  it('월간 쿼터 초과 시 exceeded: true, reason: monthly', async () => {
    mock.addResult({ data: { daily_limit: 50, monthly_limit: 500 }, error: null });
    mock.addResult({ data: { llm_calls: 10 }, error: null });                          // 일일 미초과
    mock.addResult({ data: [{ llm_calls: 200 }, { llm_calls: 300 }], error: null });   // 월간 합산 500

    const result = await checkQuotaExceeded('user-1');

    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('monthly');
    expect(result.message).toContain('500');
  });

  it('일일과 월간 모두 초과 시 일일이 우선', async () => {
    mock.addResult({ data: { daily_limit: 50, monthly_limit: 500 }, error: null });
    mock.addResult({ data: { llm_calls: 50 }, error: null });
    mock.addResult({ data: [{ llm_calls: 500 }], error: null });

    const result = await checkQuotaExceeded('user-1');

    expect(result.exceeded).toBe(true);
    expect(result.reason).toBe('daily');
  });

  it('사용량이 없을 때(null) exceeded: false', async () => {
    mock.addResult({ data: { daily_limit: 50, monthly_limit: 500 }, error: null });
    mock.addResult({ data: null, error: null });  // 일별 사용량 없음
    mock.addResult({ data: null, error: null });  // 월별 사용량 없음

    const result = await checkQuotaExceeded('user-1');

    expect(result.exceeded).toBe(false);
  });
});

// ─── recordLLMUsage ─────────────────────────────────────────────────────────
//
// 호출 흐름:
//   1) 기존 레코드 확인: from('usage_metrics').select().eq().eq().single() → R1
//   2a) 있으면: from('usage_metrics').update({...}).eq() [no single] → R2
//   2b) 없으면: from('usage_metrics').insert({...}) [no single] → R2

describe('recordLLMUsage', () => {
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

  it('기존 레코드가 있으면 update로 누적', async () => {
    mock.addResult({
      data: { id: 'rec-1', llm_calls: 5, tokens_in: 100, tokens_out: 200 },
      error: null,
    }); // R1: existing
    mock.addResult({ data: null, error: null }); // R2: update 결과 (무시됨)

    await recordLLMUsage('user-1', 50, 100);

    expect(mock.chainable.update).toHaveBeenCalledWith({
      llm_calls: 6,
      tokens_in: 150,
      tokens_out: 300,
    });
    expect(mock.chainable.insert).not.toHaveBeenCalled();
  });

  it('기존 레코드가 없으면 insert로 신규 생성', async () => {
    mock.addResult({ data: null, error: null }); // R1: no existing
    mock.addResult({ data: null, error: null }); // R2: insert 결과 (무시됨)

    await recordLLMUsage('user-1', 50, 100);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        llm_calls: 1,
        tokens_in: 50,
        tokens_out: 100,
      })
    );
    expect(mock.chainable.update).not.toHaveBeenCalled();
  });

  it('토큰 기본값은 0', async () => {
    mock.addResult({ data: null, error: null });
    mock.addResult({ data: null, error: null });

    await recordLLMUsage('user-1');

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens_in: 0,
        tokens_out: 0,
      })
    );
  });

  it('KST 기준 date와 month를 사용', async () => {
    // UTC 2025-03-15 15:00 → KST 2025-03-16
    vi.setSystemTime(new Date('2025-03-15T15:00:00.000Z'));

    mock.addResult({ data: null, error: null });
    mock.addResult({ data: null, error: null });

    await recordLLMUsage('user-1');

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2025-03-16',
        month: '2025-03',
      })
    );
  });

  it('기존 레코드의 llm_calls를 1 증가시킴', async () => {
    mock.addResult({
      data: { id: 'rec-1', llm_calls: 99, tokens_in: 0, tokens_out: 0 },
      error: null,
    });
    mock.addResult({ data: null, error: null });

    await recordLLMUsage('user-1', 10, 20);

    expect(mock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        llm_calls: 100,
        tokens_in: 10,
        tokens_out: 20,
      })
    );
  });
});
