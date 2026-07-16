/**
 * TestRoadmapClient 단위 테스트 (Task 2.11-e V2 포팅).
 *
 * 검증:
 * 1. "샘플 데이터 채우기" 버튼이 visible
 * 2. 빈 상태에서 클릭 → ConfirmDialog 없이 fixture (camelCase) 값이 폼에 주입됨
 * 3. 입력값이 있을 때 클릭 → ConfirmDialog 가 열리고, "취소" 시 state 미변경 / "덮어쓰기" 시 교체
 *
 * Step 컴포넌트는 mock 으로 단순화 (실제 폼 UI 는 production 테스트에서 검증).
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

vi.mock('@/hooks/useHwpxDownload', () => ({
  useHwpxDownload: vi.fn(() => ({
    download: vi.fn(),
    isLoading: false,
    error: null,
  })),
}));

vi.mock('./actions', () => ({
  createTestRoadmap: vi.fn(),
  cancelTestRoadmapGeneration: vi.fn(),
  reviseTestRoadmap: vi.fn(),
  exportTestRoadmapHwpx: vi.fn(),
}));

import TestRoadmapClient from './TestRoadmapClient';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import { exportTestRoadmapHwpx } from './actions';

// V2 Step 컴포넌트 경로로 모킹 (Task 2.11-e rename 이후 경로)
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepNecessity',
  () => ({
    StepNecessity: ({ value }: { value: string }) => (
      <div data-testid="establishment-display">{value}</div>
    ),
  })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepMainResult',
  () => ({ StepMainResult: () => <div>StepMainResult</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepCompanyRequirements',
  () => ({ StepCompanyRequirements: () => <div>StepCompanyRequirements</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepTaskAnalysis',
  () => ({ StepTaskAnalysis: () => <div>StepTaskAnalysis</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepTargetTask',
  () => ({ StepTargetTask: () => <div>StepTargetTask</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/shared/StepPerformanceActivities',
  () => ({ StepPerformanceActivities: () => <div>StepPerformanceActivities</div> })
);
// 스텝 구성 검증을 위해 steps prop 을 그대로 노출하는 mock
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper',
  () => ({
    default: ({ steps }: { steps: Array<{ id: number; name: string }> }) => (
      <nav aria-label="Progress">
        <ul>
          {steps.map((s) => (
            <li key={s.id} data-testid="stepper-step">
              {s.name}
            </li>
          ))}
        </ul>
      </nav>
    ),
  })
);
vi.mock('@/components/roadmap/RoadmapLoadingOverlay', () => ({
  default: () => null,
  COMPLETION_DELAY_MS: 0,
}));
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient',
  () => ({ RoadmapResultClient: () => <div>RoadmapResultClient</div> })
);

const baseUser = {
  id: 'u1',
  name: '홍컨설턴트',
  email: 'a@b.c',
  role: 'CONSULTANT_APPROVED',
  status: 'ACTIVE',
};

describe('TestRoadmapClient — 샘플 데이터 채우기 (V2)', () => {
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

  // 양식 v2 — 인터뷰 Ⅲ-1 역량 모델링 스텝이 통째로 삭제됐다 (역량·NCS 전부).
  it('역량 모델링(Ⅲ-1) 스텝이 제거된 6개 스텝만 표시한다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const steps = await screen.findAllByTestId('stepper-step');
    const names = steps.map((s) => s.textContent);

    expect(names).toEqual([
      '수립 필요성',
      '주요 활동',
      '수립 주요 결과',
      '기업 요구분석',
      '과업·워크플로우 분석',
      '훈련대상 과업',
    ]);
    expect(names).not.toContain('역량 모델링');
  });

  it('빈 상태에서 버튼 클릭 시 ConfirmDialog 없이 fixture 값이 주입된다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');

    await act(async () => {
      await userEvent.click(btn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('establishment-display')).toHaveTextContent(
        /샘플정밀공업|자동차 부품/
      );
    });
    // ConfirmDialog 가 열리지 않아야 한다
    expect(screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?')).not.toBeInTheDocument();
  });

  it('이미 입력값이 있을 때 ConfirmDialog "취소" 시 state 가 유지된다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');

    // 사전 입력값 채우기 (빈 상태에서는 ConfirmDialog 없이 즉시 적용됨)
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('establishment-display')).toHaveTextContent(
        /샘플정밀공업|자동차 부품/
      );
    });

    // 다시 클릭 → ConfirmDialog 가 열려야 한다
    await act(async () => {
      await userEvent.click(btn);
    });
    expect(await screen.findByText('샘플 데이터로 덮어쓰시겠습니까?')).toBeInTheDocument();

    // "취소" 클릭
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '취소' }));
    });

    // 다이얼로그가 닫히고 기존 state 가 유지되어야 한다
    await waitFor(() => {
      expect(screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('establishment-display')).toHaveTextContent(
      /샘플정밀공업|자동차 부품/
    );
  });

  it('이미 입력값이 있을 때 ConfirmDialog "덮어쓰기" 시 샘플로 교체된다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);
    const btn = await screen.findByTestId('test-roadmap-fill-sample');

    // 사전 입력값 채우기
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('establishment-display')).toHaveTextContent(
        /샘플정밀공업|자동차 부품/
      );
    });

    // 다시 클릭 → ConfirmDialog 열림
    await act(async () => {
      await userEvent.click(btn);
    });
    expect(await screen.findByText('샘플 데이터로 덮어쓰시겠습니까?')).toBeInTheDocument();

    // "덮어쓰기" 클릭 → 다이얼로그 닫히고 샘플 값 유지 (재적용)
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '덮어쓰기' }));
    });
    await waitFor(() => {
      expect(screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('establishment-display')).toHaveTextContent(
      /샘플정밀공업|자동차 부품/
    );
  });
});

// ─── HWPX 다운로드 흐름 — useHwpxDownload 훅 통합 ───────────────────────
//
// 본 페이지는 PR #95 이전까지 inline 으로 exportTestRoadmapHwpx 를 호출했기 때문에
// HWPX 진행 토스트가 자동 전파되지 않았다. 이제 useHwpxDownload 훅을 사용해
// 4개 실제 결과 페이지와 동일한 진행 토스트·점 애니메이션·취소 동작을 획득한다.

describe('TestRoadmapClient — HWPX 다운로드 (useHwpxDownload 통합)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('컴포넌트 렌더 시 useHwpxDownload 가 action 옵션과 함께 호출된다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);

    const useHwpxMock = vi.mocked(useHwpxDownload);
    expect(useHwpxMock).toHaveBeenCalled();
    const opts = useHwpxMock.mock.calls[0]?.[0];
    expect(typeof opts?.action).toBe('function');
  });

  it('testResult 가 null 인 초기 상태에서 action() 호출 시 exportTestRoadmapHwpx 가 호출되지 않고 실패 결과를 반환한다', async () => {
    render(<TestRoadmapClient user={baseUser} canAccess={true} hasProfile={true} />);

    const useHwpxMock = vi.mocked(useHwpxDownload);
    const opts = useHwpxMock.mock.calls[0]?.[0];
    expect(opts?.action).toBeDefined();

    const exportMock = vi.mocked(exportTestRoadmapHwpx);
    const result = await opts!.action();

    expect(result.success).toBe(false);
    expect(exportMock).not.toHaveBeenCalled();
  });
});
