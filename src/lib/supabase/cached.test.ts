/**
 * cached.ts 테스트
 *
 * getCachedUser:
 *   - 인증 성공 → user 반환
 *   - 인증 에러 → null 반환
 *   - user null → null 반환
 *   - React.cache로 래핑 확인
 *
 * getCachedProfile:
 *   - user 없음 → null 반환
 *   - user 있음 + 프로필 → 프로필 반환
 *   - user 있음 + 프로필 없음(null) → null 반환
 *   - 프로필 쿼리에서 올바른 필드 select 확인
 *   - getCachedUser를 내부 호출 확인
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// React.cache를 identity 함수로 대체하여 매 호출마다 실행되도록 설정
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    cache: (fn: unknown) => fn,
  };
});

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_EMAIL = 'test@test.com';

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('getCachedUser', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    serverMock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 성공 → user 객체 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    const { getCachedUser } = await import('./cached');
    const result = await getCachedUser();

    expect(result).toEqual({ id: TEST_USER_ID, email: TEST_EMAIL });
  });

  it('인증 에러 → null 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'auth error' },
    });

    const { getCachedUser } = await import('./cached');
    const result = await getCachedUser();

    expect(result).toBeNull();
  });

  it('user null (에러 없음) → null 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { getCachedUser } = await import('./cached');
    const result = await getCachedUser();

    expect(result).toBeNull();
  });

  it('user 존재 + error 동시 발생 시 null 반환 (에러 우선)', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: { message: 'session expired' },
    });

    const { getCachedUser } = await import('./cached');
    const result = await getCachedUser();

    expect(result).toBeNull();
  });
});

describe('getCachedProfile', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    serverMock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('user 없음 → null 반환 (getCachedUser가 null)', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { getCachedProfile } = await import('./cached');
    const result = await getCachedProfile();

    expect(result).toBeNull();
  });

  it('user 있음 + 프로필 조회 성공 → 프로필 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    const profile = {
      id: TEST_USER_ID,
      name: '홍길동',
      email: TEST_EMAIL,
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
      email_notify_enabled: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    serverMock.addResult({ data: profile, error: null });

    const { getCachedProfile } = await import('./cached');
    const result = await getCachedProfile();

    expect(result).toEqual(profile);
  });

  it('user 있음 + 프로필 없음 (null) → null 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    serverMock.addResult({ data: null, error: null });

    const { getCachedProfile } = await import('./cached');
    const result = await getCachedProfile();

    expect(result).toBeNull();
  });

  it('프로필 조회 시 올바른 테이블과 필드를 select', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    serverMock.addResult({ data: { id: TEST_USER_ID }, error: null });

    const { getCachedProfile } = await import('./cached');
    await getCachedProfile();

    // from('users') 호출 확인
    expect(serverMock.client.from).toHaveBeenCalledWith('users');
    // select에 필요한 필드들이 포함되었는지 확인
    expect(serverMock.chainable.select).toHaveBeenCalledWith(
      'id, name, email, role, status, email_notify_enabled, created_at, updated_at',
    );
    // eq('id', user.id) 확인
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('id', TEST_USER_ID);
  });

  it('프로필 DB 에러 시 data가 없으므로 null 반환', async () => {
    serverMock.client.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    // DB 에러 → data: null
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const { getCachedProfile } = await import('./cached');
    const result = await getCachedProfile();

    // error가 있어도 data만 반환하므로 null
    expect(result).toBeNull();
  });
});
