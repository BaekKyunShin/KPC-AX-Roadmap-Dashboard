/**
 * supabase/middleware.ts 테스트
 *
 * updateSession:
 * - Server Action 요청 (POST + next-action) → 세션만 갱신, 리다이렉트 없음
 * - Server Action 요청 (POST + multipart/form-data) → 세션만 갱신
 * - 비인증 + 보호 라우트 → /login 리다이렉트 (redirect 쿼리 파라미터 포함)
 * - 비인증 + 공개 라우트 → 정상 통과
 * - 인증 + /login → /dashboard 리다이렉트
 * - 인증 + /register → 리다이렉트 없음 (회원가입은 인증 사용자도 접근 가능)
 * - 인증 + 보호 라우트 → 정상 통과
 * - **stale token (server 측 무효화) → signOut 으로 cookie 정리 + 미인증 처리**
 *
 * 감사 이슈 검증:
 * - #19 protectedRoutes: /dashboard, /consultant, /ops, /gallery, /notifications, /test-roadmap 모두 보호
 * - #20 SA 미들웨어 우회: Server Action은 리다이렉트하지 않음
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSession } from './middleware';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}));

// NextResponse 모킹
const mockNextResponseCookies = {
  set: vi.fn(),
};

const mockNextResponse = {
  cookies: mockNextResponseCookies,
  _type: 'next' as string,
  _url: undefined as URL | undefined,
};

const mockRedirectResponse = {
  cookies: { set: vi.fn() },
  _type: 'redirect',
  _url: undefined as URL | undefined,
};

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ ...mockNextResponse, _type: 'next' })),
    redirect: vi.fn((url: URL) => ({ ...mockRedirectResponse, _type: 'redirect', _url: url })),
  },
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

function createMockRequest(options: {
  pathname: string;
  method?: string;
  headers?: Record<string, string>;
}) {
  const { pathname, method = 'GET', headers = {} } = options;

  const searchParams = new URLSearchParams();
  const url = {
    pathname,
    searchParams,
    clone() {
      return {
        pathname: this.pathname,
        searchParams: new URLSearchParams(this.searchParams),
      };
    },
  };

  return {
    method,
    headers: {
      get: vi.fn((name: string) => headers[name] ?? null),
    },
    cookies: {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
    nextUrl: url,
  };
}

function setupUser(user: { id: string; email: string } | null) {
  // 기본: 정상 인증 사용자 또는 cookie 없는 미인증 사용자 (둘 다 error null)
  mockGetUser.mockResolvedValue({
    data: { user: user ?? null },
    error: null,
  });
}

function setupStaleToken() {
  // server 측에서 세션 무효화된 stale token (비번 변경·관리자 ban·강제 종료 후)
  // getUser() 가 error 반환 + user null
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'JWT expired or invalid' },
  });
  mockSignOut.mockResolvedValue({ error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Server Action 우회 (감사 이슈 #20)
// =============================================================================

describe('Server Action 요청 → 세션만 갱신', () => {
  it('POST + next-action 헤더 → 리다이렉트 없음', async () => {
    setupUser(null); // 비인증이어도 리다이렉트하지 않아야 함
    const request = createMockRequest({
      pathname: '/dashboard',
      method: 'POST',
      headers: { 'next-action': 'abc123' },
    });

    const { NextResponse } = await import('next/server');
    const result = await updateSession(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('object');
  });

  it('POST + multipart/form-data → 리다이렉트 없음', async () => {
    setupUser(null);
    const request = createMockRequest({
      pathname: '/dashboard',
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=---123' },
    });

    const { NextResponse } = await import('next/server');
    const result = await updateSession(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('object');
  });
});

// =============================================================================
// 보호 라우트 (감사 이슈 #19)
// =============================================================================

describe('비인증 + 보호 라우트 → /login 리다이렉트', () => {
  const protectedPaths = [
    '/dashboard',
    '/dashboard/messages',
    '/consultant',
    '/consultant/home',
    '/ops',
    '/ops/projects',
    '/gallery',
    '/notifications',
    '/test-roadmap',
  ];

  for (const path of protectedPaths) {
    it(`${path} → /login + redirect=${path}`, async () => {
      setupUser(null);
      const request = createMockRequest({ pathname: path });

      const { NextResponse } = await import('next/server');
      await updateSession(request as never);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = vi.mocked(NextResponse.redirect).mock.calls[0][0] as unknown as {
        pathname: string;
        searchParams: URLSearchParams;
      };
      expect(redirectUrl.pathname).toBe('/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe(path);
    });
  }
});

// =============================================================================
// 공개 라우트
// =============================================================================

describe('비인증 + 공개 라우트 → 정상 통과', () => {
  const publicPaths = ['/', '/demo', '/login', '/register'];

  for (const path of publicPaths) {
    it(`${path} → 리다이렉트 없음`, async () => {
      setupUser(null);
      const request = createMockRequest({ pathname: path });

      const { NextResponse } = await import('next/server');
      await updateSession(request as never);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  }
});

// =============================================================================
// 인증된 사용자 라우트 접근
// =============================================================================

describe('인증 + 라우트 접근', () => {
  const testUser = { id: 'user-1', email: 'test@test.com' };

  it('/login → /dashboard 리다이렉트', async () => {
    setupUser(testUser);
    const request = createMockRequest({ pathname: '/login' });

    const { NextResponse } = await import('next/server');
    await updateSession(request as never);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = vi.mocked(NextResponse.redirect).mock.calls[0][0] as unknown as {
      pathname: string;
    };
    expect(redirectUrl.pathname).toBe('/dashboard');
  });

  it('/register → 리다이렉트 없음 (인증 사용자도 접근 가능)', async () => {
    setupUser(testUser);
    const request = createMockRequest({ pathname: '/register' });

    const { NextResponse } = await import('next/server');
    await updateSession(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('보호 라우트 → 정상 통과', async () => {
    setupUser(testUser);
    const request = createMockRequest({ pathname: '/dashboard' });

    const { NextResponse } = await import('next/server');
    await updateSession(request as never);

    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});

// =============================================================================
// stale token 처리 — server 측 세션 무효화 후 무한 리다이렉트 차단
// =============================================================================

describe('stale token (server 측 무효화) 처리', () => {
  it('보호 라우트 + stale token → signOut 호출 + /login 리다이렉트', async () => {
    setupStaleToken();
    const request = createMockRequest({ pathname: '/dashboard' });

    const { NextResponse } = await import('next/server');
    await updateSession(request as never);

    // stale token 정리
    expect(mockSignOut).toHaveBeenCalled();
    // user 없는 것으로 처리 → 보호 라우트는 /login 으로
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = vi.mocked(NextResponse.redirect).mock.calls[0][0] as unknown as {
      pathname: string;
    };
    expect(redirectUrl.pathname).toBe('/login');
  });

  it('/login + stale token → signOut 호출 + 로그인 페이지 정상 통과 (무한 리다이렉트 차단)', async () => {
    setupStaleToken();
    const request = createMockRequest({ pathname: '/login' });

    const { NextResponse } = await import('next/server');
    await updateSession(request as never);

    expect(mockSignOut).toHaveBeenCalled();
    // user 없는 것으로 처리 → /login 에서 /dashboard 로 재리다이렉트하지 않음
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('정상 인증 사용자 → signOut 호출하지 않음 (회귀 방지)', async () => {
    setupUser({ id: 'user-1', email: 'test@test.com' });
    const request = createMockRequest({ pathname: '/dashboard' });

    await updateSession(request as never);

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('미인증 사용자 (cookie 없음) → signOut 호출하지 않음 (불필요한 호출 방지)', async () => {
    setupUser(null);
    const request = createMockRequest({ pathname: '/' });

    await updateSession(request as never);

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// =============================================================================
// cookies 어댑터 콜백 (getAll / setAll) — Supabase SSR 내부 경로 cover
// =============================================================================

describe('cookies 어댑터 (getAll / setAll) 직접 호출', () => {
  it('createServerClient 에 전달된 cookies.getAll/setAll 을 실행해 양쪽 경로 cover', async () => {
    setupUser(null);
    const request = createMockRequest({
      pathname: '/login',
    });
    // createServerClient 호출 시 전달된 config 를 가로챔
    const { createServerClient } = await import('@supabase/ssr');
    const createServerClientMock = vi.mocked(createServerClient);

    await updateSession(request as never);

    // updateSession 내부가 createServerClient 를 1회 호출
    expect(createServerClientMock).toHaveBeenCalled();
    const lastCall = createServerClientMock.mock.calls.at(-1)!;
    const config = lastCall[2] as {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (
          cookies: { name: string; value: string; options?: Record<string, unknown> }[],
        ) => void;
      };
    };

    // getAll 콜백 직접 실행 → request.cookies.getAll 위임 경로 cover
    const cookies = config.cookies.getAll();
    expect(Array.isArray(cookies)).toBe(true);
    expect(request.cookies.getAll).toHaveBeenCalled();

    // setAll 콜백 직접 실행 → request/response 양쪽 set 경로 cover
    config.cookies.setAll([
      { name: 'a', value: '1', options: { maxAge: 60 } },
      { name: 'b', value: '2' },
    ]);
    expect(request.cookies.set).toHaveBeenCalledTimes(2);
  });
});
