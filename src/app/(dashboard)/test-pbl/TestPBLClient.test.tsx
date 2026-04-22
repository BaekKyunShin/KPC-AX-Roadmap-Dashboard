/**
 * TestPBLClient — ISSUE-02·03 Step E 단위 테스트.
 *
 * 검증:
 * 1. "샘플 데이터 채우기" 버튼이 visible
 * 2. 빈 상태에서 클릭 → fixture 값(과정명 등) 이 폼에 주입됨
 * 3. 입력값이 있을 때 클릭 → confirm 호출, 취소 시 state 미변경
 *
 * lazy 로 로드되는 Step 컴포넌트는 부하가 크므로 mock 한다 (input 1개만 포함).
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// next/navigation — BackButton 의 useRouter 호출 위해 mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/test-pbl',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import TestPBLClient from './TestPBLClient';

// ─── Step 컴포넌트 mock — 실제 폼 대신 value 를 노출하는 div 만 렌더 ─────────
// readOnly + value 의 input 은 React 의 controlled 경고 + 일부 환경에서 value
// 업데이트가 누락되므로 div.textContent 로 비교 가능한 형태로 노출한다.
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCourseOverview',
  () => ({
    default: ({ value }: { value: { course_name: string } }) => (
      <div data-testid="course-name-display">{value.course_name}</div>
    ),
  }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCompanyStatus',
  () => ({ default: () => <div>StepCompanyStatus</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTrainingEnvironment',
  () => ({ default: () => <div>StepTrainingEnvironment</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLHrdNecessity',
  () => ({ default: () => <div>StepHrdNecessity</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLPerformanceActivities',
  () => ({ default: () => <div>StepPerformanceActivities</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLProblemDefinition',
  () => ({ default: () => <div>StepProblemDefinition</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTargetTasks',
  () => ({ default: () => <div>StepTargetTasks</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLAILevel',
  () => ({ default: () => <div>StepAILevel</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLSummary',
  () => ({ default: () => <div>StepSummary</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper',
  () => ({ default: () => <nav aria-label="Progress">stepper</nav> }),
);

const baseUser = {
  id: 'u1',
  name: '홍컨설턴트',
  email: 'a@b.c',
  role: 'CONSULTANT_APPROVED',
  status: 'ACTIVE',
};

describe('TestPBLClient — 샘플 데이터 채우기 (ISSUE-02·03 Step E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"샘플 데이터 채우기" 버튼이 보인다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('샘플 데이터 채우기');
  });

  it('초기 폼은 빈 상태로 시작한다 (과정명 비어 있음)', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const display = await screen.findByTestId('course-name-display');
    expect(display).toHaveTextContent('');
  });

  it('빈 상태에서 버튼 클릭 시 confirm 없이 즉시 fixture 값이 주입된다', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');

    await act(async () => {
      await userEvent.click(btn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
    });
    expect(confirmSpy).not.toHaveBeenCalled(); // 빈 상태에서는 confirm 미호출
    confirmSpy.mockRestore();
  });

  it('이미 입력값이 있을 때 confirm 취소하면 state 가 유지된다', async () => {
    // 1차: fixture 로 채움
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
    });

    // 2차: 다시 클릭 — confirm=false → 변경 없음
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => {
      await userEvent.click(btn);
    });
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('기존 입력값이 모두 덮어써집니다'),
    );
    expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
    confirmSpy.mockRestore();
  });
});
