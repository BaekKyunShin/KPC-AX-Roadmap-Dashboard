/**
 * 컨설턴트 프로젝트 상세 page.tsx — 트랙 불일치 안내 배너 노출 조건 (#015)
 *
 * 이 파일이 지키는 것은 딱 하나다: **배너가 떠야 할 때만 뜨는가.**
 * 트랙 가드에 튕겨 돌아온 경우(`?trackMismatch=1`)에만 배너가 보여야 하고,
 * 평소 진입에는 절대 보이면 안 된다(보이면 명백한 퇴보).
 *
 * 서버 컴포넌트 테스트 패턴은 `gallery/layout.test.tsx` 계열을 따르되,
 * 이 페이지는 JSX 를 반환하므로 await 로 받아 RTL 로 렌더한다.
 * 탭·차트 등 무거운 하위 컴포넌트는 배너 판정과 무관하므로 전부 모킹한다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  // PageHeader 의 뒤로가기 버튼이 사용한다
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

/** projects / interview_guides 두 쿼리를 테이블명으로 분기하는 체이닝 mock */
const mockProjectRow = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      const result = table === 'projects' ? { data: mockProjectRow() } : { data: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: () => Promise.resolve(result),
      };
      return chain;
    },
  })),
}));

// 배너 판정과 무관한 하위 컴포넌트 (렌더 비용·async 회피)
vi.mock('./_components/ProjectDetailTabs', () => ({
  ProjectDetailTabs: () => <div data-testid="project-detail-tabs" />,
}));
vi.mock('./_components/CompanyInfoEditableCard', () => ({
  CompanyInfoEditableCard: () => null,
}));
vi.mock('./_components/InterviewGuide', () => ({ InterviewGuide: () => null }));
vi.mock('./_components/ActivityLog', () => ({ default: () => null }));
vi.mock('./_components/AssessmentDetailAccordion', () => ({
  AssessmentDetailAccordion: () => null,
}));
vi.mock('./_components/ConsultantAssessmentResult', () => ({
  ConsultantAssessmentResult: () => null,
}));
vi.mock('@/components/interview/RoadmapInterviewSummary', () => ({
  RoadmapInterviewSummary: () => null,
}));
vi.mock('@/components/interview/PblInterviewSummary', () => ({
  PblInterviewSummary: () => null,
}));

import ConsultantProjectDetailPage from './page';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440034';

function setup(options: { track?: 'ROADMAP' | 'PBL' } = {}) {
  const { track = 'PBL' } = options;

  vi.mocked(getCachedUser).mockResolvedValue({ id: 'consultant-1' } as never);
  vi.mocked(getCachedProfile).mockResolvedValue({ role: 'CONSULTANT_APPROVED' } as never);
  mockProjectRow.mockReturnValue({
    id: PROJECT_ID,
    company_name: '시드기업',
    industry: '제조업',
    company_size: '50-299',
    track,
    status: 'FINALIZED',
    closed_at: null,
    self_assessments: null,
    interviews: null,
  });
}

/** searchParams 를 넘겨 페이지를 렌더한다 (undefined = 쿼리 없이 직접 진입) */
async function renderPage(searchParams?: { trackMismatch?: string }) {
  const jsx = await ConsultantProjectDetailPage({
    params: Promise.resolve({ id: PROJECT_ID }),
    searchParams: searchParams ? Promise.resolve(searchParams) : undefined,
  });
  render(jsx);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('프로젝트 상세 — 트랙 불일치 안내 배너', () => {
  it('trackMismatch=1 로 돌아온 경우 배너를 보여준다', async () => {
    setup({ track: 'PBL' });
    await renderPage({ trackMismatch: '1' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('이 프로젝트는 PBL 트랙입니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PBL 보고서 보기' })).toHaveAttribute(
      'href',
      `/consultant/projects/${PROJECT_ID}/pbl`
    );
  });

  it('평소 진입(쿼리 없음)에는 배너를 보여주지 않는다', async () => {
    setup({ track: 'PBL' });
    await renderPage();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/트랙입니다/)).not.toBeInTheDocument();
  });

  it('알 수 없는 값이 붙어 있으면 배너를 보여주지 않는다', async () => {
    setup({ track: 'PBL' });
    await renderPage({ trackMismatch: '0' });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('로드맵 트랙 프로젝트에서는 로드맵 안내로 바뀐다', async () => {
    setup({ track: 'ROADMAP' });
    await renderPage({ trackMismatch: '1' });

    expect(screen.getByText('이 프로젝트는 로드맵 트랙입니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로드맵 보기' })).toHaveAttribute(
      'href',
      `/consultant/projects/${PROJECT_ID}/roadmap`
    );
  });

  // ─── 특성화: 배너와 무관한 기존 동작 ──────────────────────────────────────
  it('배너 여부와 관계없이 프로젝트 상세 본문(탭)은 그대로 렌더된다', async () => {
    setup({ track: 'PBL' });
    await renderPage({ trackMismatch: '1' });

    expect(screen.getByTestId('project-detail-tabs')).toBeInTheDocument();
  });
});
