/**
 * quota.ts 테스트
 * - getKSTDateTime: KST 기준 날짜/월 조회 (순수 함수, 타이머 모킹)
 * - checkAndRecordLLMUsage: 원자적 쿼터 확인+사용량 기록 (RPC 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getKSTDateTime, checkAndRecordLLMUsage } from './quota';
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
