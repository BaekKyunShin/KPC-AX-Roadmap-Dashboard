/**
 * TestPBLClient 단위 테스트 (Task 2.11-e V2 포팅).
 *
 * 검증:
 * 1. "샘플 데이터 채우기" 버튼이 visible
 * 2. 빈 상태에서 클릭 → ConfirmDialog 없이 fixture (camelCase) 값이 폼에 주입됨
 * 3. 입력값이 있을 때 클릭 → ConfirmDialog 가 열리고, "취소" 시 state 미변경 / "덮어쓰기" 시 교체
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
  usePathname: () => '/test-pbl',
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
  generateTestPBL: vi.fn(),
  cancelTestPBLGeneration: vi.fn(),
  exportTestPBLHwpx: vi.fn(),
}));

import TestPBLClient, { buildTestPBLExportPayload } from './TestPBLClient';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import { exportTestPBLHwpx } from './actions';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';

// ─── V2 Step 컴포넌트 경로로 모킹 ─────────────────────────────────────────
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOverview',
  () => ({
    StepOverview: ({ value }: { value: { courseName: string } }) => (
      <div data-testid="course-name-display">{value.courseName}</div>
    ),
  })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCompanyIssues',
  () => ({ StepCompanyIssues: () => <div>StepCompanyIssues</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOrganization',
  () => ({ StepOrganization: () => <div>StepOrganization</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTrainingEnv',
  () => ({ StepTrainingEnv: () => <div>StepTrainingEnv</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCourseNecessity',
  () => ({ StepCourseNecessity: () => <div>StepCourseNecessity</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPerformanceActivities',
  () => ({ StepPerformanceActivities: () => <div>StepPerformanceActivities</div> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepProblems',
  () => ({ StepProblems: () => <div>StepProblems</div> })
);
vi.mock('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTarget', () => ({
  StepTarget: () => <div>StepTarget</div>,
}));
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper',
  () => ({ default: () => <nav aria-label="Progress">stepper</nav> })
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient',
  () => ({ PBLResultClient: () => <div>PBLResultClient</div> })
);

const baseUser = {
  id: 'u1',
  name: '홍컨설턴트',
  email: 'a@b.c',
  role: 'CONSULTANT_APPROVED',
  status: 'ACTIVE',
};

describe('TestPBLClient — 스텝 구성 (실제 인터뷰와 정합)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 실제 PBL 인터뷰(PBL_STEPS)는 10스텝이고, 테스트 모드가 제외하는 것은 파일 업로드가
   * 불가한 `hrdReport`(Ⅱ-1-가)·`sttAttach` **2개뿐**이므로 **8스텝**이어야 한다.
   *
   * 회귀 배경: Ⅲ-1 수행활동 스텝을 신설(PBL 자체 입력 전환)할 때 이 페이지 반영이
   * 누락되어 7스텝으로 운영됐다. 데이터 필드는 이미 있어 타입 검사로는 잡히지 않았다.
   */
  it('8스텝이며 Ⅲ-1 수행활동을 포함한다 (HRD PDF·STT 만 제외)', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    await screen.findByTestId('course-name-display');

    const next = () => screen.getByRole('button', { name: /^다음/ });

    // 1 Ⅰ → 2 Ⅱ-1 → 3 Ⅱ-1-다 → 4 Ⅱ-3-a → 5 Ⅱ-3-b → 6 Ⅲ-1
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await userEvent.click(next());
      });
    }
    expect(screen.getByText('StepPerformanceActivities')).toBeInTheDocument();

    // 7 Ⅲ-2 문제 정의서
    await act(async () => {
      await userEvent.click(next());
    });
    expect(screen.getByText('StepProblems')).toBeInTheDocument();

    // 8 Ⅲ-3 훈련대상 업무 — 마지막 스텝이므로 "다음" 이 사라진다
    await act(async () => {
      await userEvent.click(next());
    });
    expect(screen.getByText('StepTarget')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^다음/ })).not.toBeInTheDocument();
  });
});

describe('TestPBLClient — 샘플 데이터 채우기 (V2)', () => {
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

  it('빈 상태에서 버튼 클릭 시 ConfirmDialog 없이 fixture 값이 주입된다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');

    await act(async () => {
      await userEvent.click(btn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
    });
    // ConfirmDialog 가 열리지 않아야 한다
    expect(screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?')).not.toBeInTheDocument();
  });

  it('이미 입력값이 있을 때 ConfirmDialog "취소" 시 state 가 유지된다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');

    // 사전 입력값 채우기 (빈 상태에서는 ConfirmDialog 없이 즉시 적용됨)
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
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
    expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
  });

  it('이미 입력값이 있을 때 ConfirmDialog "덮어쓰기" 시 샘플로 교체된다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);
    const btn = await screen.findByTestId('test-pbl-fill-sample');

    // 사전 입력값 채우기
    await act(async () => {
      await userEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
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
    expect(screen.getByTestId('course-name-display')).toHaveTextContent(/PBL 과정/);
  });
});

// ─── 회귀 #이슈3-B — 테스트 PBL 다운로드 페이로드 변환 ─────────────────────
describe('buildTestPBLExportPayload', () => {
  function emptyContent(): PBLContent {
    return {
      header: { course_name: '', training_hours: 0, training_target: '' },
      diagnosis: { current_level: 'BASIC', expected_level: 'USER', summary: '' },
      competency: { name: '', criteria: '', knowledge: [], skill: [], attitude: [] },
      task_analysis: [],
      tasks: [],
      operation_plan: {
        training_goal: '',
        ai_tool_usage_plan: [],
        training_plan: {
          overview: { course_name: '', training_period: { start: '', end: '' } },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: '',
            total_hours: 0,
            training_goals: [],
            ai_tools: [],
            utilized_data: '',
            analysis_method: '',
            training_contents: [],
            total_sum_hours: 0,
          },
          facilities: [],
          evaluation: { method: '', criteria: [] },
        },
      },
      outcome_analysis: {
        learner_assessment: { method: '', criteria: [] },
        instructor_evaluation: { criteria: [] },
        management_assessment: { items: [] },
        roi_analysis: { metrics: [] },
        improvement_plan: { items: [] },
      },
    } as unknown as PBLContent;
  }

  it('companyName · 인터뷰 V2 데이터 · pblContent 로 PBLExportPayload 를 구성한다', () => {
    const payload = buildTestPBLExportPayload({
      content: emptyContent(),
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '회귀테스트 기업',
    });

    expect(payload.companyName).toBe('회귀테스트 기업');
    expect(payload.projectId).toBe('test-mode');
    expect(payload.versionNumber).toBe(1);
    expect(payload.status).toBe('DRAFT');
    expect(payload.pblContent).toBeDefined();
    expect(payload.interviewOverview?.courseName).toBe(PBL_INTERVIEW_SAMPLE.courseName);
    expect(payload.interviewOverview?.trainingHours).toBe(PBL_INTERVIEW_SAMPLE.trainingHours);
  });

  it('finalizedAt 은 null, createdAt 은 ISO 문자열', () => {
    const payload = buildTestPBLExportPayload({
      content: emptyContent(),
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '테스트',
    });
    expect(payload.finalizedAt).toBeNull();
    expect(typeof payload.createdAt).toBe('string');
    expect(payload.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── HWPX 다운로드 흐름 — useHwpxDownload 훅 통합 ───────────────────────
//
// 본 페이지는 PR #95 이전까지 inline 으로 exportTestPBLHwpx 를 호출했기 때문에
// HWPX 진행 토스트가 자동 전파되지 않았다. 이제 useHwpxDownload 훅을 사용해
// 4개 실제 결과 페이지와 동일한 진행 토스트·점 애니메이션·취소 동작을 획득한다.

describe('TestPBLClient — HWPX 다운로드 (useHwpxDownload 통합)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('컴포넌트 렌더 시 useHwpxDownload 가 action 옵션과 함께 호출된다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);

    const useHwpxMock = vi.mocked(useHwpxDownload);
    expect(useHwpxMock).toHaveBeenCalled();
    const opts = useHwpxMock.mock.calls[0]?.[0];
    expect(typeof opts?.action).toBe('function');
  });

  it('testResult 가 null 인 초기 상태에서 action() 호출 시 exportTestPBLHwpx 가 호출되지 않고 실패 결과를 반환한다', async () => {
    render(<TestPBLClient user={baseUser} canAccess={true} />);

    const useHwpxMock = vi.mocked(useHwpxDownload);
    const opts = useHwpxMock.mock.calls[0]?.[0];
    expect(opts?.action).toBeDefined();

    const exportMock = vi.mocked(exportTestPBLHwpx);
    const result = await opts!.action();

    expect(result.success).toBe(false);
    expect(exportMock).not.toHaveBeenCalled();
  });
});
