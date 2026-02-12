/**
 * notification.ts 테스트
 * - createNotification: 개별 알림 생성 (Supabase 모킹)
 * - createNotificationForAdmins: 관리자 전체 알림 생성 (Supabase 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotification, createNotificationForAdmins } from './notification';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Supabase 모킹 ─────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

/**
 * Supabase 클라이언트 체인 모킹 (quota.test.ts 패턴 재활용)
 */
function createMockSupabase() {
  const results: Array<{ data: unknown; error: unknown }> = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      return results[resultIndex++];
    }
    return { data: null, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  for (const method of ['select', 'eq', 'in', 'order', 'range']) {
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
    addResult: (result: { data: unknown; error: unknown }) => {
      results.push(result);
    },
  };
}

// ─── createNotification ─────────────────────────────────────────────────────

describe('createNotification', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validParams = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    type: 'assignment' as const,
    title: '프로젝트 배정',
    message: '새 프로젝트가 배정되었습니다.',
    link: '/projects/1',
  };

  it('유효한 파라미터로 알림을 생성한다', async () => {
    mock.addResult({ data: null, error: null }); // insert 결과

    await createNotification(validParams);

    expect(mock.mockClient.from).toHaveBeenCalledWith('notifications');
    expect(mock.chainable.insert).toHaveBeenCalledWith({
      user_id: validParams.userId,
      type: validParams.type,
      title: validParams.title,
      message: validParams.message,
      link: validParams.link,
    });
  });

  it('link 없이도 알림 생성 가능', async () => {
    mock.addResult({ data: null, error: null });

    const { link: _, ...paramsWithoutLink } = validParams;
    await createNotification(paramsWithoutLink);

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: validParams.userId,
        type: validParams.type,
        title: validParams.title,
        message: validParams.message,
      }),
    );
  });

  it('Zod 검증 실패 시 insert를 호출하지 않음 (유효하지 않은 userId)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      ...validParams,
      userId: 'not-a-uuid', // UUID 형식이 아님
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification] 검증 실패:',
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });

  it('빈 title 시 insert를 호출하지 않음', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      ...validParams,
      title: '',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('빈 message 시 insert를 호출하지 않음', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      ...validParams,
      message: '',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('Supabase insert 에러 시 예외를 던지지 않고 console.error 출력', async () => {
    const dbError = { message: 'DB error', code: '42P01' };
    mock.addResult({ data: null, error: dbError });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification(validParams); // 예외 없이 완료

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification] 알림 생성 실패:',
      dbError,
    );
    consoleSpy.mockRestore();
  });

  it('예외 발생 시에도 throw하지 않음', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('연결 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification(validParams); // 예외 없이 완료

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification] 예외:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

// ─── createNotificationForAdmins ─────────────────────────────────────────────

describe('createNotificationForAdmins', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const validParams = {
    type: 'status_change' as const,
    title: '프로젝트 상태 변경',
    message: '프로젝트가 ASSIGNED 상태로 변경되었습니다.',
    link: '/ops/projects',
  };

  it('관리자 목록을 조회하고 bulk insert한다', async () => {
    const admins = [{ id: 'admin-1' }, { id: 'admin-2' }, { id: 'admin-3' }];
    mock.addResult({ data: admins, error: null }); // R1: 관리자 조회
    mock.addResult({ data: null, error: null });   // R2: bulk insert

    await createNotificationForAdmins(validParams);

    // 관리자 조회: OPS_ADMIN, SYSTEM_ADMIN, ACTIVE
    expect(mock.mockClient.from).toHaveBeenCalledWith('users');
    expect(mock.chainable.select).toHaveBeenCalledWith('id');
    expect(mock.chainable.in).toHaveBeenCalledWith('role', ['OPS_ADMIN', 'SYSTEM_ADMIN']);
    expect(mock.chainable.eq).toHaveBeenCalledWith('status', 'ACTIVE');

    // bulk insert: 각 관리자에 대해 알림 생성
    expect(mock.chainable.insert).toHaveBeenCalledWith([
      { user_id: 'admin-1', type: validParams.type, title: validParams.title, message: validParams.message, link: validParams.link },
      { user_id: 'admin-2', type: validParams.type, title: validParams.title, message: validParams.message, link: validParams.link },
      { user_id: 'admin-3', type: validParams.type, title: validParams.title, message: validParams.message, link: validParams.link },
    ]);
  });

  it('관리자가 없으면 insert를 호출하지 않음 (빈 배열)', async () => {
    mock.addResult({ data: [], error: null });

    await createNotificationForAdmins(validParams);

    expect(mock.chainable.insert).not.toHaveBeenCalled();
  });

  it('관리자 조회 실패 시 insert를 호출하지 않고 console.error 출력', async () => {
    const dbError = { message: 'DB error' };
    mock.addResult({ data: null, error: dbError });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotificationForAdmins(validParams);

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotificationForAdmins] 관리자 조회 실패:',
      dbError,
    );
    consoleSpy.mockRestore();
  });

  it('bulk insert 에러 시 예외를 던지지 않고 console.error 출력', async () => {
    mock.addResult({ data: [{ id: 'admin-1' }], error: null });
    const insertError = { message: 'insert failed' };
    mock.addResult({ data: null, error: insertError });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotificationForAdmins(validParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotificationForAdmins] 알림 생성 실패:',
      insertError,
    );
    consoleSpy.mockRestore();
  });

  it('예외 발생 시에도 throw하지 않음', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('연결 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotificationForAdmins(validParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotificationForAdmins] 예외:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('link 없이도 동작한다', async () => {
    const { link: _, ...paramsWithoutLink } = validParams;
    mock.addResult({ data: [{ id: 'admin-1' }], error: null });
    mock.addResult({ data: null, error: null });

    await createNotificationForAdmins(paramsWithoutLink);

    expect(mock.chainable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'admin-1',
        type: validParams.type,
        title: validParams.title,
        message: validParams.message,
        link: undefined,
      }),
    ]);
  });
});
