/**
 * ops/projects/page.tsx 테스트 — URL 딥링크 필터 서버 반영
 *
 * 배경: `/ops/projects?industry=IT%2FSW` 로 직접 진입하면 드롭다운은 'IT/SW' 인데
 * 목록은 전체가 나왔다. page.tsx 가 search 만 서버 조회에 넘기고, ProjectList 의
 * isInitialMount 가드가 이를 바로잡을 첫 클라이언트 fetch 를 건너뛰기 때문이다.
 *
 * ⚠️ URL 의 status 값은 ProjectStatus 가 아니라 워크플로 단계 키('diagnosed' 등)다.
 * 그대로 넘기면 .eq('status','diagnosed') 가 되어 항상 0건이 되므로
 * getStatusesByFilterKey 로 statuses 배열을 만들어 넘겨야 한다.
 *
 * 테스트 패턴 설명은 gallery/layout.test.tsx 주석 참고.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRole } from '@/types/database';

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock('./actions/dashboard', () => ({
  fetchProjectStats: vi.fn(),
}));

vi.mock('./actions/queries', () => ({
  fetchProjectsWithTimeline: vi.fn(),
}));

vi.mock('./_components/ProjectManagementTabs', () => ({
  default: () => null,
}));

import OPSProjectsPage from './page';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { redirect } from 'next/navigation';
import { fetchProjectStats } from './actions/dashboard';
import { fetchProjectsWithTimeline } from './actions/queries';

type SearchParams = Record<string, string | string[] | undefined>;

function renderPage(params: SearchParams = {}) {
  return OPSProjectsPage({ searchParams: Promise.resolve(params) });
}

/** fetchProjectsWithTimeline 에 실제로 전달된 인자 */
function fetchArgs() {
  return vi.mocked(fetchProjectsWithTimeline).mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCachedUser).mockResolvedValue({ id: 'user-1' } as never);
  vi.mocked(getCachedProfile).mockResolvedValue({ role: 'OPS_ADMIN' as UserRole } as never);
  vi.mocked(fetchProjectStats).mockResolvedValue({} as never);
  vi.mocked(fetchProjectsWithTimeline).mockResolvedValue({
    projects: [],
    total: 0,
    totalPages: 0,
    page: 1,
  } as never);
});

// ─── 특성화: 현재 동작을 그대로 고정한다 ──────────────────────────────────────

describe('OPSProjectsPage — 기존 동작 (특성화)', () => {
  it('OPS 관리자가 아니면 /dashboard 로 리다이렉트된다', async () => {
    vi.mocked(getCachedProfile).mockResolvedValue({
      role: 'CONSULTANT_APPROVED' as UserRole,
    } as never);

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('미인증이면 /login 으로 리다이렉트된다', async () => {
    vi.mocked(getCachedUser).mockResolvedValue(null as never);

    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('파라미터가 없으면 1페이지·10건·빈 검색어로 조회한다', async () => {
    await renderPage();

    expect(fetchArgs()).toMatchObject({ page: 1, limit: 10, search: '' });
  });

  it('?search= 는 서버 조회에 전달된다', async () => {
    await renderPage({ search: '알파' });

    expect(fetchArgs()).toMatchObject({ search: '알파' });
  });

  it('통계와 목록을 함께 조회한다', async () => {
    await renderPage();

    expect(fetchProjectStats).toHaveBeenCalledTimes(1);
    expect(fetchProjectsWithTimeline).toHaveBeenCalledTimes(1);
  });
});

// ─── 신규: 나머지 필터도 서버 조회에 반영한다 ────────────────────────────────

describe('OPSProjectsPage — URL 딥링크 필터', () => {
  it('?industry= 는 서버 조회에 전달된다', async () => {
    await renderPage({ industry: 'IT/SW' });

    expect(fetchArgs()).toMatchObject({ industry: 'IT/SW' });
  });

  it('industry=all 은 전체를 뜻하므로 필터를 걸지 않는다', async () => {
    await renderPage({ industry: 'all' });

    expect(fetchArgs()?.industry).toBe('');
  });

  it('?status= 는 워크플로 단계 키를 상태 배열로 변환해 전달된다', async () => {
    await renderPage({ status: 'diagnosed' });

    expect(fetchArgs()).toMatchObject({ statuses: ['DIAGNOSED', 'MATCH_RECOMMENDED'] });
  });

  it('알 수 없는 status 키는 필터를 걸지 않는다 (클라이언트와 동일하게 전체 표시)', async () => {
    await renderPage({ status: 'nonexistent' });

    expect(fetchArgs()?.statuses).toBeUndefined();
  });

  it('?page= 는 서버 조회에 전달된다', async () => {
    await renderPage({ page: '3' });

    expect(fetchArgs()).toMatchObject({ page: 3 });
  });

  it.each(['abc', '0', '-1'])('잘못된 page 값 "%s" 은 1로 보정된다', async (bad) => {
    // 보정하지 않으면 range(NaN, NaN) 으로 PostgREST 에러가 나 목록이 빈다.
    await renderPage({ page: bad });

    expect(fetchArgs()).toMatchObject({ page: 1 });
  });

  it('여러 필터를 동시에 전달할 수 있다', async () => {
    await renderPage({ search: '알파', industry: 'IT/SW', status: 'finalized', page: '2' });

    expect(fetchArgs()).toMatchObject({
      search: '알파',
      industry: 'IT/SW',
      statuses: ['FINALIZED'],
      page: 2,
    });
  });
});
