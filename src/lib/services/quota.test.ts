/**
 * quota.ts 테스트
 * - getKSTDateTime: KST 기준 날짜/월 조회 (순수 함수, 타이머 모킹)
 * - checkAndRecordLLMUsage: 원자적 쿼터 확인+사용량 기록 (RPC 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getKSTDateTime,
  checkAndRecordLLMUsage,
  fetchUserQuota,
  updateUserQuota,
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
        message: '일일 사용량(50회)을 초과했습니다. 내일 다시 시도해주세요.',
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
        message: '월간 사용량(500회)을 초과했습니다. 관리자에게 문의하세요.',
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
