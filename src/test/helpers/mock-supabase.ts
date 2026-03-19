/**
 * 공유 Supabase 모킹 팩토리
 *
 * 큐 기반 체인 모킹: addResult()로 순서대로 결과를 추가하면
 * single() / maybeSingle() / thenable에서 순서대로 소비합니다.
 *
 * 사용 예:
 *   const mock = createMockSupabase({ authUser: { id: 'user-1' } });
 *   mock.addResult({ data: { id: 1 }, error: null });
 *   vi.mocked(createClient).mockResolvedValue(mock.client as never);
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest';

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface MockSupabaseOptions {
  /** auth.getUser() 반환값. null이면 인증 실패, 생략하면 auth 미포함 */
  authUser?: { id: string } | null;
}

interface MockResult {
  data: unknown;
  error: unknown;
  count?: number | null;
}

interface MockRpcResult {
  data: unknown;
  error: unknown;
}

type Chainable = Record<string, any>;

interface MockSupabaseReturn {
  /** Supabase 클라이언트 mock (from, rpc, auth 포함) */
  client: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      admin: { getUserById: ReturnType<typeof vi.fn> };
    };
  };
  /** 체이너블 객체 — from()이 반환하는 쿼리 빌더 */
  chainable: Chainable;
  /** 큐에 결과 추가 (단일 쿼리용) */
  addResult: (result: MockResult) => void;
  /** RPC 큐에 결과 추가 */
  addRpcResult: (result: MockRpcResult) => void;
  /** 큐 초기화 (테스트 간 재사용 시) */
  resetResults: () => void;
}

// ─── 체이너블 메서드 목록 (전체 합집합) ──────────────────────────────────────

const CHAINABLE_METHODS = [
  'select', 'eq', 'neq', 'in', 'not', 'or', 'is',
  'gte', 'lte', 'gt', 'lt',
  'ilike', 'overlaps', 'order', 'range', 'limit',
  'insert', 'update', 'delete', 'upsert',
] as const;

// ─── 체이너블 생성 헬퍼 ─────────────────────────────────────────────────────

/** 체이닝 + 종결 메서드(single, maybeSingle, then)를 갖는 mock 객체 생성 */
function buildChainable(nextFn: () => unknown): Chainable {
  const obj: Chainable = {};

  for (const method of CHAINABLE_METHODS) {
    obj[method] = vi.fn(() => obj);
  }

  obj.single = vi.fn(() => nextFn());
  obj.maybeSingle = vi.fn(() => nextFn());
  obj.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve(nextFn()).then(resolve, reject);
  };

  return obj;
}

// ─── 팩토리 함수 ─────────────────────────────────────────────────────────────

export function createMockSupabase(
  options: MockSupabaseOptions = {},
): MockSupabaseReturn {
  const results: MockResult[] = [];
  let resultIndex = 0;

  const rpcResults: MockRpcResult[] = [];
  let rpcIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      const r = results[resultIndex++];
      return { data: r.data, error: r.error, count: r.count ?? null };
    }
    throw new Error(
      `mock-supabase: 결과 큐 소진 (${resultIndex}번째 호출). addResult()로 충분한 결과를 추가하세요.`,
    );
  }

  function nextRpcResult() {
    if (rpcIndex < rpcResults.length) {
      return rpcResults[rpcIndex++];
    }
    throw new Error(
      `mock-supabase: RPC 결과 큐 소진 (${rpcIndex}번째 호출). addRpcResult()로 충분한 결과를 추가하세요.`,
    );
  }

  const chainable = buildChainable(nextResult);

  // auth 설정
  const hasAuth = 'authUser' in options;
  const authGetUser = vi.fn().mockResolvedValue({
    data: { user: hasAuth ? options.authUser : null },
    error: null,
  });
  const authAdminGetUserById = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });

  const client = {
    from: vi.fn(() => chainable),
    rpc: vi.fn(() => buildChainable(nextRpcResult)),
    auth: {
      getUser: authGetUser,
      admin: { getUserById: authAdminGetUserById },
    },
  };

  return {
    client,
    chainable,
    addResult: (result: MockResult) => {
      results.push(result);
    },
    addRpcResult: (result: MockRpcResult) => {
      rpcResults.push(result);
    },
    resetResults: () => {
      results.length = 0;
      resultIndex = 0;
      rpcResults.length = 0;
      rpcIndex = 0;
    },
  };
}

// ─── after() 콜백 추적 헬퍼 ─────────────────────────────────────────────────

/**
 * next/server의 after() 콜백을 추적하기 위한 헬퍼.
 *
 * 사용 예:
 *   const { pendingCallbacks, flush, mockAfter } = createAfterTracker();
 *   vi.mock('next/server', () => ({ after: mockAfter }));
 *   afterEach(() => { pendingCallbacks.length = 0; });
 */
export function createAfterTracker() {
  const pendingCallbacks: Promise<unknown>[] = [];

  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingCallbacks.push(result as Promise<unknown>);
    }
  });

  async function flush() {
    await Promise.all(pendingCallbacks);
    pendingCallbacks.length = 0;
  }

  return { pendingCallbacks, flush, mockAfter };
}
