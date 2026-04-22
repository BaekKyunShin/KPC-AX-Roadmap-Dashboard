/**
 * TestRoadmapClient — ISSUE-02·03 Step E 단위 테스트.
 *
 * 검증:
 * 1. "샘플 데이터 채우기" 버튼이 visible
 * 2. 빈 상태에서 클릭 → fixture 값(수립 필요성 등) 이 폼에 주입됨
 * 3. 입력값이 있을 때 클릭 → confirm 호출, 취소 시 state 미변경
 *
 * Step 컴포넌트는 mock 으로 단순화 (실제 인터뷰 폼 UI 는 production 컴포넌트 테스트에서 검증).
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/test-roadmap',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import TestRoadmapClient from './TestRoadmapClient';

vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepOverview',
  () => ({
    default: ({ value }: { value: { establishment_necessity: string } }) => (
      <div data-testid="establishment-display">{value.establishment_necessity}</div>
    ),
  }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepBasicInfoRoadmap',
  () => ({ default: () => <div>StepBasicInfoRoadmap</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompanyRequirements',
  () => ({ default: () => <div>StepCompanyRequirements</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskWorkflowAnalysis',
  () => ({ default: () => <div>StepTaskWorkflowAnalysis</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTrainingTargets',
  () => ({ default: () => <div>StepTrainingTargets</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompetencyModeling',
  () => ({ default: () => <div>StepCompetencyModeling</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepSummaryRoadmap',
  () => ({ default: () => <div>StepSummaryRoadmap</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper',
  () => ({ default: () => <nav aria-label="Progress">stepper</nav> }),
);
vi.mock('@/components/roadmap/RoadmapLoadingOverlay', () => ({
  default: () => null,
  COMPLETION_DELAY_MS: 0,
}));
vi.mock('./_components/TestRoadmapResult', () => ({
  default: () => <div>TestRoadmapResult</div>,
}));

const baseUser = {
  id: 'u1',
  name: '홍컨설턴트',
  email: 'a@b.c',
  role: 'CONSULTANT_APPROVED',
  status: 'ACTIVE',
};

describe('TestRoadmapClient — 샘플 데이터 채우기 (ISSUE-02·03 Step E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"샘플 데이터 채우기" 버튼이 보인다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('샘플 데이터 채우기');
  });

  it('초기 폼은 빈 상태로 시작한다 (수립 필요성 비어 있음)', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const display = await screen.findByTestId('establishment-display');
    expect(display).toHaveTextContent('');
  });

  it('빈 상태에서 버튼 클릭 시 confirm 없이 fixture 값이 주입된다', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');

    await act(async () => {
      await userEvent.click(btn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('establishment-display')).toHaveTextContent(/샘플정밀공업|자동차 부품/);
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('이미 입력값이 있을 때 confirm 취소하면 state 가 유지된다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');

    // 1차: fixture 로 채움
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('establishment-display')).toHaveTextContent(/샘플정밀공업|자동차 부품/);
    });

    // 2차: confirm=false → state 유지
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => {
      await userEvent.click(btn);
    });
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('기존 입력값이 모두 덮어써집니다'),
    );
    expect(screen.getByTestId('establishment-display')).toHaveTextContent(/샘플정밀공업|자동차 부품/);
    confirmSpy.mockRestore();
  });
});
