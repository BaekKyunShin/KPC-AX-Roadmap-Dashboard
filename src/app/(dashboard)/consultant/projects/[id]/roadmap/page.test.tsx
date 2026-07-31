/**
 * roadmap/page.tsx 트랙 가드 테스트 (#015)
 *
 * PBL 트랙 프로젝트가 `/roadmap` 으로 들어오면 프로젝트 상세로 돌려보낸다.
 * 예전에는 아무 사유 없이 튕겨서 사용자가 "왜 나왔지?" 상태가 됐으므로,
 * 이제 `?trackMismatch=1` 을 실어 보내 목적지에서 안내 배너를 띄운다.
 *
 * ── 서버 컴포넌트 테스트 패턴은 `gallery/layout.test.tsx` 를 따른다 ──
 * - async 서버 컴포넌트를 직접 await 호출해 단언한다.
 * - redirect() 는 실제 Next.js 와 동일하게 throw 하도록 모킹한다.
 *   그래야 "리다이렉트 이후 코드가 실행되지 않는다"는 성질까지 재현된다.
 *
 * 목적지 단언을 **경로 prefix 로 나눠서** 하는 이유: "어디로 보내는가"(기존 동작)와
 * "사유를 실어 보내는가"(신규 동작)를 분리해야, 쿼리 형식을 나중에 바꿔도
 * 기존 동작 고정이 무너지지 않는다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectTrack } from '@/lib/constants/tracks';

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('./actions', () => ({
  fetchProjectInfo: vi.fn(),
  fetchRoadmapPageDataV2: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock('./_components/RoadmapResultPageClient', () => ({
  default: () => null,
}));

import RoadmapPage from './page';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { fetchProjectInfo, fetchRoadmapPageDataV2 } from './actions';
import { redirect } from 'next/navigation';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440031';
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
    track = 'ROADMAP',
    projectInfoOk = true,
  } = options;

  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue((role ? { role } : null) as never);
  vi.mocked(fetchProjectInfo).mockResolvedValue(
    (projectInfoOk
      ? { success: true, data: { companyName: '시드기업', track } }
      : { success: false, error: '조회 실패' }) as never
  );
  vi.mocked(fetchRoadmapPageDataV2).mockResolvedValue({
    success: true,
    data: {
      versions: [],
      selectedVersion: null,
      interview: {},
      selfAssessmentExists: false,
      projectStatus: 'FINALIZED',
      projectClosed: false,
    },
  } as never);
}

function renderPage() {
  return RoadmapPage({ params: Promise.resolve({ id: PROJECT_ID }) });
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

describe('RoadmapPage — 접근 가드 (특성화)', () => {
  it('비로그인 사용자는 /login 으로 보낸다', async () => {
    setup({ user: null });
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('컨설턴트가 아니면 /dashboard 로 보낸다', async () => {
    setup({ role: 'OPS_ADMIN' });
    await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
  });

  it('로드맵 트랙 프로젝트는 리다이렉트 없이 결과 화면을 렌더한다', async () => {
    setup({ track: 'ROADMAP' });
    await expect(renderPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('프로젝트 정보 조회에 실패하면 트랙 가드가 발동하지 않는다', async () => {
    // 조회 실패를 "트랙 불일치"로 오인해 튕기면 안 된다 (현재 동작 고정).
    setup({ projectInfoOk: false });
    await expect(renderPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('PBL 트랙 프로젝트는 해당 프로젝트 상세로 돌려보낸다', async () => {
    setup({ track: 'PBL' });
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT:/);

    const target = redirectTarget();
    expect(target).not.toBeNull();
    // 목적지 경로 자체는 바뀌지 않는다 (쿼리 유무와 무관하게 성립해야 함).
    expect(target?.startsWith(DETAIL_PATH)).toBe(true);
  });
});

// ─── 신규: 왜 돌아왔는지 사유를 실어 보낸다 ──────────────────────────────────

describe('RoadmapPage — 트랙 불일치 사유 전달', () => {
  it('PBL 트랙을 돌려보낼 때 trackMismatch 플래그를 붙인다', async () => {
    setup({ track: 'PBL' });
    await expect(renderPage()).rejects.toThrow(/NEXT_REDIRECT:/);

    expect(redirectTarget()).toBe(`${DETAIL_PATH}?trackMismatch=1`);
  });

  it('트랙이 맞으면 플래그를 붙이지 않는다 (정상 진입에 배너가 뜨면 퇴보)', async () => {
    setup({ track: 'ROADMAP' });
    await renderPage();

    expect(redirect).not.toHaveBeenCalled();
  });
});
