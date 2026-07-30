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
    vi.restoreAllMocks();
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

  // #012 — link 는 **필수**다. 이동 대상이 없는 알림은 클릭해도 아무 화면도 열리지 않아
  // 사용자가 클릭 실패로 오해한다. 타입이 1차로 막고(컴파일), 이 검증이 2차로 막는다.
  it('link 가 없으면 검증 실패해 insert를 호출하지 않는다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { link: _, ...paramsWithoutLink } = validParams;
    // 타입에서 필수이므로 런타임 방어를 확인하려면 캐스팅이 필요하다.
    await createNotification(paramsWithoutLink as typeof validParams);

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification Error] 검증 실패:',
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('Zod 검증 실패 시 insert를 호출하지 않음 (유효하지 않은 userId)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      ...validParams,
      userId: 'not-a-uuid', // UUID 형식이 아님
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification Error] 검증 실패:',
      expect.anything()
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

    expect(consoleSpy).toHaveBeenCalledWith('[createNotification Error]', dbError);
    consoleSpy.mockRestore();
  });

  it('예외 발생 시에도 throw하지 않음', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('연결 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification(validParams); // 예외 없이 완료

    expect(consoleSpy).toHaveBeenCalledWith('[createNotification Error]', expect.any(Error));
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
    vi.restoreAllMocks();
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
    mock.addResult({ data: null, error: null }); // R2: bulk insert

    await createNotificationForAdmins(validParams);

    // 관리자 조회: OPS_ADMIN, SYSTEM_ADMIN, ACTIVE
    expect(mock.mockClient.from).toHaveBeenCalledWith('users');
    expect(mock.chainable.select).toHaveBeenCalledWith('id');
    expect(mock.chainable.in).toHaveBeenCalledWith('role', ['OPS_ADMIN', 'SYSTEM_ADMIN']);
    expect(mock.chainable.eq).toHaveBeenCalledWith('status', 'ACTIVE');

    // bulk insert: 각 관리자에 대해 알림 생성
    expect(mock.chainable.insert).toHaveBeenCalledWith([
      {
        user_id: 'admin-1',
        type: validParams.type,
        title: validParams.title,
        message: validParams.message,
        link: validParams.link,
      },
      {
        user_id: 'admin-2',
        type: validParams.type,
        title: validParams.title,
        message: validParams.message,
        link: validParams.link,
      },
      {
        user_id: 'admin-3',
        type: validParams.type,
        title: validParams.title,
        message: validParams.message,
        link: validParams.link,
      },
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
      '[createNotificationForAdmins Error] 관리자 조회:',
      dbError
    );
    consoleSpy.mockRestore();
  });

  it('bulk insert 에러 시 예외를 던지지 않고 console.error 출력', async () => {
    mock.addResult({ data: [{ id: 'admin-1' }], error: null });
    const insertError = { message: 'insert failed' };
    mock.addResult({ data: null, error: insertError });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotificationForAdmins(validParams);

    expect(consoleSpy).toHaveBeenCalledWith('[createNotificationForAdmins Error]', insertError);
    consoleSpy.mockRestore();
  });

  it('예외 발생 시에도 throw하지 않음', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('연결 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotificationForAdmins(validParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotificationForAdmins Error]',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  // 이 함수는 `createNotification` 과 달리 Zod 검증을 거치지 않는다(bulk insert 경로).
  // 따라서 link 누락의 방어는 **타입 하나뿐**이며 런타임에서는 걸러지지 않는다 —
  // 그 사실을 고정해 둔다. 나중에 검증을 추가하면 이 테스트가 먼저 알려 준다(#012).
  it('스키마 검증을 거치지 않아 link 누락이 런타임에서 걸러지지 않는다 (타입이 유일한 방어)', async () => {
    const { link: _, ...paramsWithoutLink } = validParams;
    mock.addResult({ data: [{ id: 'admin-1' }], error: null });
    mock.addResult({ data: null, error: null });

    // 타입에서 필수이므로 런타임 경로를 확인하려면 캐스팅이 필요하다.
    await createNotificationForAdmins(paramsWithoutLink as typeof validParams);

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

// ─── createNotification 알림 타입별 테스트 ─────────────────────────────────

describe('createNotification 알림 타입별 생성', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  const UUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const notificationTypes = [
    'assignment',
    'deadline',
    'status_change',
    'message',
    'system',
    'interview_complete',
    'roadmap_draft',
    'roadmap_finalized',
    'assessment_submitted',
  ] as const;

  for (const type of notificationTypes) {
    it(`타입 '${type}'으로 알림을 생성할 수 있다`, async () => {
      mock.addResult({ data: null, error: null });

      await createNotification({
        userId: UUID,
        type,
        title: `${type} 알림`,
        message: `${type} 테스트 메시지`,
        link: '/ops/projects',
      });

      expect(mock.chainable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: UUID,
          type,
        })
      );
    });
  }

  // #012 — 아래 두 케이스는 예전엔 "정상 생성"이었다. 이동 대상 없는 알림이 만들어지는
  // 경로였으므로 지금은 둘 다 검증에서 막는다.
  it('link 가 undefined 면 검증 실패해 insert를 호출하지 않는다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      userId: UUID,
      type: 'assignment',
      title: '배정 알림',
      message: '배정되었습니다.',
      link: undefined as unknown as string,
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('link 가 빈 문자열이면 검증 실패해 insert를 호출하지 않는다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      userId: UUID,
      type: 'system',
      title: '시스템 알림',
      message: '시스템 메시지',
      link: '',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('유효하지 않은 알림 타입은 검증 실패한다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      userId: UUID,
      type: 'INVALID_TYPE' as never,
      title: '알림',
      message: '메시지',
      link: '/ops/projects',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[createNotification Error] 검증 실패:',
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('title이 200자를 초과하면 검증 실패한다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      userId: UUID,
      type: 'system',
      title: 'A'.repeat(201),
      message: '메시지',
      link: '/ops/projects',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('message가 500자를 초과하면 검증 실패한다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createNotification({
      userId: UUID,
      type: 'system',
      title: '알림',
      message: 'A'.repeat(501),
      link: '/ops/projects',
    });

    expect(mock.chainable.insert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
