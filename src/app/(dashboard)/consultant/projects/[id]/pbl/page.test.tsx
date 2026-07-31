/**
 * pbl/page.tsx 트랙 가드 테스트 (#015)
 *
 * 로드맵 트랙 프로젝트가 `/pbl` 로 들어오면 프로젝트 상세로 돌려보낸다
 * (roadmap 쪽 가드와 대칭). 이쪽도 사유 없이 튕기던 것을 `?trackMismatch=1` 로 알린다.
 *
 * 감사 문서는 roadmap 쪽만 지목했으나 실제로는 **양방향**이라 두 페이지를 함께 고친다.
 *
 * 패턴은 `gallery/layout.test.tsx` / 같은 계열 `roadmap/page.test.tsx` 와 동일하다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectTrack } from '@/lib/constants/tracks';

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('./actions', () => ({
  fetchPBLProjectInfo: vi.fn(),
  fetchPBLPageDataV2: vi.fn(),
}));

vi.mock('@/lib/services/pbl/pbl-roadmap-link', () => ({
  fetchLinkedRoadmapData: vi.fn(),
  hydrateRoadmapInterview: vi.fn(() => null),
  mergeRoadmapOverrides: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock('./_components/PBLResultPageClient', () => ({
  default: () => null,
}));

import PBLPage from './page';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchPBLProjectInfo, fetchPBLPageDataV2 } from './actions';
import { fetchLinkedRoadmapData } from '@/lib/services/pbl/pbl-roadmap-link';
import { redirect } from 'next/navigation';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440032';
const DETAIL_PATH = `/consultant/projects/${PROJECT_ID}`;

function setup(options: {
  user?: { id: string } | null;
  role?: string | null;
  track?: ProjectTrack;
  projectInfoOk?: boolean;
}) {
  const {
    user = { id: 'consultant-1' },
    role = 'CONSULTANT_APPROVED',
    track = 'PBL',
    projectInfoOk = true,
  } = options;

  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue((role ? { role } : null) as never);
  vi.mocked(fetchPBLProjectInfo).mockResolvedValue(
    (projectInfoOk
      ? { success: true, data: { companyName: '시드기업', track } }
      : { success: false, error: '조회 실패' }) as never
  );
  vi.mocked(fetchPBLPageDataV2).mockResolvedValue({
    success: true,
    data: {
      versions: [],
      selectedVersion: null,
      interview: {},
      hasInterview: false,
      projectStatus: 'FINALIZED',
      projectClosed: false,
    },
  } as never);
  vi.mocked(fetchLinkedRoadmapData).mockResolvedValue({ interview: null } as never);
}

function renderPage() {
  return PBLPage({ params: Promise.resolve({ id: PROJECT_ID }) });
}

/** redirect 가 실제로 받은 목적지 (호출되지 않았으면 null) */
function redirectTarget(): string | null {
  const call = vi.mocked(redirect).mock.calls[0];
  return call ? (call[0] as string) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 특성화: 기존 동작은 그대로여야 한다 ────────────────────────────────────

describe('PBLPage — 접근 가드 (특성화)', () => {
  it('비로그인 사용자는 /login 으로 보낸다', async () => {
    setup({ user: null });
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('컨설턴트가 아니면 /dashboard 로 보낸다', async () => {
    setup({ role: 'OPS_ADMIN' });
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('PBL 트랙 프로젝트는 리다이렉트 없이 결과 화면을 렌더한다', async () => {
    setup({ track: 'PBL' });
    await expect(renderPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('프로젝트 정보 조회에 실패하면 /dashboard 로 보낸다 (roadmap 쪽과 다른 기존 동작)', async () => {
    setup({ projectInfoOk: false });
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('로드맵 트랙 프로젝트는 해당 프로젝트 상세로 돌려보낸다', async () => {
    setup({ track: 'ROADMAP' });
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT:/);

    const target = redirectTarget();
    expect(target).not.toBeNull();
    // 목적지 경로 자체는 바뀌지 않는다 (쿼리 유무와 무관하게 성립해야 함).
    expect(target?.startsWith(DETAIL_PATH)).toBe(true);
  });
});

// ─── 신규: 왜 돌아왔는지 사유를 실어 보낸다 ──────────────────────────────────

describe('PBLPage — 트랙 불일치 사유 전달', () => {
  it('로드맵 트랙을 돌려보낼 때 trackMismatch 플래그를 붙인다', async () => {
    setup({ track: 'ROADMAP' });
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT:/);

    expect(redirectTarget()).toBe(`${DETAIL_PATH}?trackMismatch=1`);
  });

  it('트랙이 맞으면 플래그를 붙이지 않는다 (정상 진입에 배너가 뜨면 퇴보)', async () => {
    setup({ track: 'PBL' });
    await renderPage();

    expect(redirect).not.toHaveBeenCalled();
  });
});
