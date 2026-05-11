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

import TestPBLClient, { buildTestPBLExportPayload } from './TestPBLClient';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';

// ─── V2 Step 컴포넌트 경로로 모킹 ─────────────────────────────────────────
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOverview',
  () => ({
    StepOverview: ({ value }: { value: { courseName: string } }) => (
      <div data-testid="course-name-display">{value.courseName}</div>
    ),
  }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCompanyIssues',
  () => ({ StepCompanyIssues: () => <div>StepCompanyIssues</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOrganization',
  () => ({ StepOrganization: () => <div>StepOrganization</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTrainingEnv',
  () => ({ StepTrainingEnv: () => <div>StepTrainingEnv</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCourseNecessity',
  () => ({ StepCourseNecessity: () => <div>StepCourseNecessity</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepActivities',
  () => ({ StepActivities: () => <div>StepActivities</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepProblems',
  () => ({ StepProblems: () => <div>StepProblems</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel',
  () => ({ StepTargetAndLevel: () => <div>StepTargetAndLevel</div> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper',
  () => ({ default: () => <nav aria-label="Progress">stepper</nav> }),
);
vi.mock(
  '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient',
  () => ({ PBLResultClient: () => <div>PBLResultClient</div> }),
);

const baseUser = {
  id: 'u1',
  name: '홍컨설턴트',
  email: 'a@b.c',
  role: 'CONSULTANT_APPROVED',
  status: 'ACTIVE',
};

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
    expect(
      screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?'),
    ).not.toBeInTheDocument();
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
    expect(
      await screen.findByText('샘플 데이터로 덮어쓰시겠습니까?'),
    ).toBeInTheDocument();

    // "취소" 클릭
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '취소' }));
    });

    // 다이얼로그가 닫히고 기존 state 가 유지되어야 한다
    await waitFor(() => {
      expect(
        screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?'),
      ).not.toBeInTheDocument();
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
    expect(
      await screen.findByText('샘플 데이터로 덮어쓰시겠습니까?'),
    ).toBeInTheDocument();

    // "덮어쓰기" 클릭 → 다이얼로그 닫히고 샘플 값 유지 (재적용)
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: '덮어쓰기' }));
    });
    await waitFor(() => {
      expect(
        screen.queryByText('샘플 데이터로 덮어쓰시겠습니까?'),
      ).not.toBeInTheDocument();
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
    expect(payload.interviewOverview?.courseName).toBe(
      PBL_INTERVIEW_SAMPLE.courseName,
    );
    expect(payload.interviewOverview?.trainingHours).toBe(
      PBL_INTERVIEW_SAMPLE.trainingHours,
    );
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
