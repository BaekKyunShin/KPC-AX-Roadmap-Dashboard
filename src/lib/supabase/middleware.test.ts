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
 *
 * 감사 이슈 검증:
 * - #19 protectedRoutes: /dashboard, /consultant, /ops, /gallery, /notifications, /test-roadmap 모두 보호
 * - #20 SA 미들웨어 우회: Server Action은 리다이렉트하지 않음
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSession } from './middleware';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockGetSession = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
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
  mockGetSession.mockResolvedValue({
    data: { session: user ? { user } : null },
    error: user ? null : { message: 'not authenticated' },
  });
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
