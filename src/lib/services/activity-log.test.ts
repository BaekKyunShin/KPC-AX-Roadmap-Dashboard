/**
 * activity-log.ts 테스트
 *
 * - 정상 삽입: createAdminClient().from().insert() 호출 검증
 * - DB 에러 시 silent failure: console.error만 출력, throw 안 함
 * - createAdminClient 예외 시: throw 안 함
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insertSystemActivityLog } from './activity-log';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_CONTENT = '인터뷰가 자동으로 완료되었습니다.';

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('insertSystemActivityLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: 성공 응답
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('정상 삽입 — from(table).insert(row) 호출 검증', async () => {
    await insertSystemActivityLog(TEST_PROJECT_ID, TEST_CONSULTANT_ID, TEST_CONTENT);

    expect(mockCreateAdminClient).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith('consultant_activity_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      project_id: TEST_PROJECT_ID,
      consultant_id: TEST_CONSULTANT_ID,
      type: 'system_auto',
      content: TEST_CONTENT,
    });
  });

  it('DB 에러 시 silent failure — console.error만 출력, throw 안 함', async () => {
    const dbError = { message: 'insert failed', code: '23505' };
    mockInsert.mockResolvedValue({ error: dbError });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // throw 없이 정상 완료
    await expect(
      insertSystemActivityLog(TEST_PROJECT_ID, TEST_CONSULTANT_ID, TEST_CONTENT),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('[insertSystemActivityLog Error]', dbError);
    consoleSpy.mockRestore();
  });

  it('createAdminClient 예외 시 — throw 안 함', async () => {
    const runtimeError = new Error('supabase connection failed');
    mockCreateAdminClient.mockImplementation(() => {
      throw runtimeError;
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // throw 없이 정상 완료
    await expect(
      insertSystemActivityLog(TEST_PROJECT_ID, TEST_CONSULTANT_ID, TEST_CONTENT),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith('[insertSystemActivityLog Error]', runtimeError);
    consoleSpy.mockRestore();
  });
});
