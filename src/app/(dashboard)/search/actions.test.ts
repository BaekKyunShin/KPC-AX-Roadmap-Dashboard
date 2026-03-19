/**
 * unifiedSearch Server Action 테스트
 *
 * 테스트 대상:
 * - 인증 실패 처리
 * - 2자 미만 쿼리 → 빈 결과
 * - 컨설턴트: 담당 프로젝트만 검색, 사용자 검색 불가, 공유 갤러리만
 * - 관리자: 전체 프로젝트/사용자/갤러리 검색
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedSearch } from './actions';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// requireAuth를 직접 모킹 (내부에서 createClient를 호출하므로)
const mockRequireAuth = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

import { createAdminClient } from '@/lib/supabase/admin';

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

// ─── Supabase 체인 모킹 ────────────────────────────────────────────────────

function createMockChain(data: unknown[] = [], error: unknown = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};

  for (const method of [
    'select',
    'eq',
    'neq',
    'or',
    'ilike',
    'order',
    'limit',
    'in',
  ]) {
    chain[method] = vi.fn(() => chain);
  }

  // thenable — await시 결과 반환
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve({ data, error }).then(resolve, reject);
  };

  return chain;
}

function setupAdminClient(
  projectsData: unknown[] = [],
  usersData: unknown[] = [],
  galleryData: unknown[] = [],
) {
  const projectChain = createMockChain(projectsData);
  const userChain = createMockChain(usersData);
  const galleryChain = createMockChain(galleryData);

  let callCount = 0;
  const chains = [projectChain, userChain, galleryChain];

  const mockAdmin = {
    from: vi.fn(() => {
      const chain = chains[callCount] || createMockChain();
      callCount++;
      return chain;
    }),
  };

  vi.mocked(createAdminClient).mockReturnValue(mockAdmin as never);
  return { mockAdmin, projectChain, userChain, galleryChain };
}

// ─── 테스트 ─────────────────────────────────────────────────────────────────

describe('unifiedSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 인증 ──────────────────────────────────────────────────────────────

  it('인증 실패 시 에러를 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await unifiedSearch('테스트');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('로그인이 필요합니다.');
    }
  });

  // ─── 쿼리 길이 ────────────────────────────────────────────────────────

  it('2자 미만 쿼리는 빈 결과를 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'test@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    const result = await unifiedSearch('프');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects).toEqual([]);
      expect(result.data.users).toEqual([]);
      expect(result.data.gallery).toEqual([]);
    }
  });

  // ─── 관리자 검색 ──────────────────────────────────────────────────────

  it('관리자: 프로젝트 검색 결과를 /ops/projects/ 경로로 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    setupAdminClient(
      [{ id: 'p1', company_name: '테스트 기업', industry: '제조업', status: 'NEW' }],
      [],
      [],
    );

    const result = await unifiedSearch('테스트');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].href).toBe('/ops/projects/p1');
      expect(result.data.projects[0].category).toBe('project');
    }
  });

  it('관리자: 사용자 검색 결과를 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    setupAdminClient(
      [],
      [{ id: 'u1', name: '홍길동', email: 'hong@test.com', role: 'CONSULTANT_APPROVED' }],
      [],
    );

    const result = await unifiedSearch('홍길');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].label).toBe('홍길동');
      expect(result.data.users[0].category).toBe('user');
    }
  });

  it('관리자: 갤러리 검색 결과를 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    setupAdminClient([], [], [
      {
        id: 'r1',
        status: 'FINAL',
        is_shared: true,
        projects: { company_name: '갤러리 기업' },
      },
    ]);

    const result = await unifiedSearch('갤러리');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gallery).toHaveLength(1);
      expect(result.data.gallery[0].category).toBe('gallery');
    }
  });

  // ─── 컨설턴트 검색 ────────────────────────────────────────────────────

  it('컨설턴트: 사용자 검색은 빈 배열을 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'consultant@test.com' },
      supabase: {},
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
    });

    setupAdminClient(
      [{ id: 'p1', company_name: '테스트', industry: '제조업', status: 'ASSIGNED' }],
      [],
      [],
    );

    const result = await unifiedSearch('테스트');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toEqual([]);
    }
  });

  it('컨설턴트: 프로젝트 검색 결과를 /consultant/projects/ 경로로 반환한다', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'consultant@test.com' },
      supabase: {},
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
    });

    setupAdminClient(
      [{ id: 'p2', company_name: '컨설턴트 기업', industry: 'IT', status: 'ASSIGNED' }],
      [],
      [],
    );

    const result = await unifiedSearch('컨설턴트');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].href).toBe('/consultant/projects/p2');
    }
  });

  // ─── 에러 처리 ────────────────────────────────────────────────────────

  it('DB 오류 시 빈 결과를 반환한다 (에러를 삼킴)', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 쿼리에서 에러 발생
    setupAdminClient();
    const { projectChain } = setupAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectChain.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
      return Promise.resolve({ data: null, error: { message: 'DB error' } }).then(resolve, reject);
    };

    const result = await unifiedSearch('테스트');

    expect(result.success).toBe(true);
    if (result.success) {
      // DB 에러 시 해당 카테고리는 빈 배열
      expect(result.data.projects).toEqual([]);
    }
  });
});
