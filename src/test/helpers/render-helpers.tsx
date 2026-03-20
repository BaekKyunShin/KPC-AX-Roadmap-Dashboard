/**
 * 컴포넌트 테스트용 렌더링 래퍼
 *
 * renderWithRouter(): next/navigation mock 포함 렌더
 * renderWithUser(role): 인증 컨텍스트 mock 포함 렌더
 */
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { ActionResult } from '@/lib/types/action-result';

// ─── next/navigation mock 기본값 ──────────────────────────────────────────────

export interface RouterMockOptions {
  pathname?: string;
  searchParams?: Record<string, string>;
  push?: ReturnType<typeof vi.fn>;
  replace?: ReturnType<typeof vi.fn>;
  back?: ReturnType<typeof vi.fn>;
  refresh?: ReturnType<typeof vi.fn>;
}

const defaultRouterMock: Required<RouterMockOptions> = {
  pathname: '/',
  searchParams: {},
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
};

/**
 * next/navigation을 mock하고 컴포넌트를 렌더링합니다.
 *
 * 주의: 호출 전에 vi.mock('next/navigation', ...) 을 테스트 파일 상단에서
 * 설정해야 합니다. 이 헬퍼는 mock 값을 반환하는 것에 집중합니다.
 */
export function createRouterMocks(options: RouterMockOptions = {}) {
  const merged = { ...defaultRouterMock, ...options };

  return {
    useRouter: () => ({
      push: merged.push,
      replace: merged.replace,
      back: merged.back,
      refresh: merged.refresh,
      prefetch: vi.fn(),
      forward: vi.fn(),
    }),
    usePathname: () => merged.pathname,
    useSearchParams: () => new URLSearchParams(merged.searchParams),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
}

// ─── renderWithRouter ─────────────────────────────────────────────────────────

export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, options);
}

// ─── renderWithUser ───────────────────────────────────────────────────────────

export type MockRole =
  | 'OPS_ADMIN'
  | 'SYSTEM_ADMIN'
  | 'CONSULTANT_APPROVED'
  | 'USER_PENDING'
  | 'OPS_ADMIN_PENDING'
  | 'PUBLIC';

export interface MockUser {
  id: string;
  email: string;
  role: MockRole;
  full_name: string;
}

export function createMockUser(role: MockRole = 'OPS_ADMIN'): MockUser {
  const users: Record<MockRole, MockUser> = {
    OPS_ADMIN: {
      id: 'ops-admin-1',
      email: 'ops@test.com',
      role: 'OPS_ADMIN',
      full_name: '운영관리자',
    },
    SYSTEM_ADMIN: {
      id: 'system-admin-1',
      email: 'admin@test.com',
      role: 'SYSTEM_ADMIN',
      full_name: '시스템관리자',
    },
    CONSULTANT_APPROVED: {
      id: 'consultant-1',
      email: 'consultant@test.com',
      role: 'CONSULTANT_APPROVED',
      full_name: '홍길동 컨설턴트',
    },
    USER_PENDING: {
      id: 'user-pending-1',
      email: 'pending@test.com',
      role: 'USER_PENDING',
      full_name: '대기중사용자',
    },
    OPS_ADMIN_PENDING: {
      id: 'ops-pending-1',
      email: 'ops-pending@test.com',
      role: 'OPS_ADMIN_PENDING',
      full_name: '대기중운영자',
    },
    PUBLIC: {
      id: 'public-1',
      email: 'public@test.com',
      role: 'PUBLIC',
      full_name: '일반사용자',
    },
  };

  return users[role];
}

export function renderWithUser(
  ui: ReactElement,
  role: MockRole = 'OPS_ADMIN',
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const user = createMockUser(role);
  return { ...render(ui, options), user };
}

// ─── Server Action Mock 헬퍼 ─────────────────────────────────────────────────

/**
 * Server Action 결과를 mock하는 함수를 생성합니다.
 *
 * 사용 예:
 *   const mockAction = createServerActionMock({ items: [] });
 *   vi.mocked(fetchProjects).mockImplementation(mockAction.fn);
 *   mockAction.setError('에러 발생');
 */
export function createServerActionMock<T>(successData?: T, errorMessage?: string) {
  const fn = vi.fn<() => Promise<ActionResult<T>>>();

  if (errorMessage) {
    fn.mockResolvedValue({ success: false, error: errorMessage });
  } else if (successData !== undefined) {
    fn.mockResolvedValue({ success: true, data: successData });
  }

  return {
    fn,
    setSuccess: (data: T) => {
      fn.mockResolvedValue({ success: true, data });
    },
    setError: (error: string) => {
      fn.mockResolvedValue({ success: false, error });
    },
  };
}

// ─── Timer 헬퍼 ──────────────────────────────────────────────────────────────

/**
 * vi.useFakeTimers 래퍼 — setup/teardown을 간편하게 처리합니다.
 *
 * 사용 예:
 *   const timer = createTimerHelper();
 *   beforeEach(() => timer.setup());
 *   afterEach(() => timer.teardown());
 *   await timer.advance(5000);
 */
export function createTimerHelper() {
  return {
    setup: () => {
      vi.useFakeTimers();
    },
    teardown: () => {
      vi.useRealTimers();
    },
    advance: async (ms: number) => {
      await vi.advanceTimersByTimeAsync(ms);
    },
    runAll: async () => {
      await vi.runAllTimersAsync();
    },
  };
}

// ─── Params Mock 포함 렌더 ───────────────────────────────────────────────────

/**
 * useParams가 특정 값을 반환하도록 mock된 상태에서 렌더링합니다.
 */
export function renderWithParams(
  ui: ReactElement,
  params: Record<string, string>,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return {
    ...render(ui, options),
    params,
  };
}
