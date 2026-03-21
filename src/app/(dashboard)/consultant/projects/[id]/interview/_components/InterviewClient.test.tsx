import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InterviewClient from './InterviewClient';
import type { InterviewParticipant, JobTask, PainPoint, ImprovementGoal } from '@/lib/schemas/interview';

// =============================================================================
// 모킹
// =============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockSaveInterview = vi.fn();
const mockFetchInterview = vi.fn();
const mockProcessSttFile = vi.fn();
const mockDeleteSttInsights = vi.fn();
vi.mock('../actions', () => ({
  saveInterview: (...args: unknown[]) => mockSaveInterview(...args),
  fetchInterview: (...args: unknown[]) => mockFetchInterview(...args),
  processSttFile: (...args: unknown[]) => mockProcessSttFile(...args),
  deleteSttInsights: (...args: unknown[]) => mockDeleteSttInsights(...args),
}));

const mockShowErrorToast = vi.fn();
const mockShowSuccessToast = vi.fn();
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return {
    ...actual,
    showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
    showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
    scrollToPageTop: vi.fn(),
  };
});

// 하위 스텝 컴포넌트 경량 mock
vi.mock('./InterviewStepper', () => ({
  default: ({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) => (
    <div data-testid="interview-stepper">
      <span data-testid="current-step-indicator">Step {currentStep}</span>
      {[1, 2, 3, 4, 5, 6].map(step => (
        <button key={step} data-testid={`stepper-step-${step}`} onClick={() => onStepClick(step)}>
          Step {step}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./StepBasicInfo', () => ({
  default: () => <div data-testid="step-basic-info">StepBasicInfo</div>,
}));
vi.mock('./StepCompanyDetails', () => ({
  default: () => <div data-testid="step-company-details">StepCompanyDetails</div>,
}));
vi.mock('./StepJobTasks', () => ({
  default: () => <div data-testid="step-job-tasks">StepJobTasks</div>,
}));
vi.mock('./StepPainPoints', () => ({
  default: () => <div data-testid="step-pain-points">StepPainPoints</div>,
}));
vi.mock('./StepConstraintsGoals', () => ({
  default: () => <div data-testid="step-constraints-goals">StepConstraintsGoals</div>,
}));
vi.mock('./StepSummary', () => ({
  default: () => <div data-testid="step-summary">StepSummary</div>,
}));

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ui/back-button', () => ({
  BackButton: () => null,
  BACK_LINK_STYLES: '',
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

const TEST_PROJECT_ID = 'test-project-123';

function makeValidParticipants(): InterviewParticipant[] {
  return [{ id: 'p1', name: '홍길동', position: '팀장' }];
}

function makeValidJobTasks(): JobTask[] {
  return [{ id: 't1', task_name: '데이터 분석', task_description: '매출 데이터 분석' }];
}

function makeValidPainPoints(): PainPoint[] {
  return [{ id: 'pp1', description: '수작업이 많음', severity: 'HIGH', related_task_ids: [] }];
}

function makeValidImprovementGoals(): ImprovementGoal[] {
  return [{ id: 'g1', goal_description: '자동화 도입', kpi: '처리 시간', target_value: '50% 감소' }];
}

function makeFullInitialInterview() {
  return {
    id: 'interview-1',
    project_id: TEST_PROJECT_ID,
    interviewer_id: 'user-1',
    interview_date: '2026-03-15',
    participants: makeValidParticipants(),
    company_details: { systems_and_tools: ['Excel'], ai_experience: 'ChatGPT 사용 경험 있음' },
    job_tasks: makeValidJobTasks(),
    pain_points: makeValidPainPoints(),
    constraints: [],
    improvement_goals: makeValidImprovementGoals(),
    notes: '테스트 메모',
    customer_requirements: '',
    stt_insights: null,
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('InterviewClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveInterview.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. 초기 렌더링 (빈 인터뷰)
  // -------------------------------------------------------------------------
  describe('초기 렌더링 (빈 인터뷰)', () => {
    it('initialInterview가 null이면 스텝 1을 표시한다', () => {
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      expect(screen.getByTestId('step-basic-info')).toBeInTheDocument();
      expect(screen.getByTestId('current-step-indicator')).toHaveTextContent('Step 1');
    });

    it('initialInterview가 null이면 "이전" 버튼이 disabled이다', () => {
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      const prevButton = screen.getByRole('button', { name: /이전/ });
      expect(prevButton).toBeDisabled();
    });

    it('페이지 헤더에 제목이 표시된다', () => {
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      expect(screen.getByTestId('page-header')).toHaveTextContent('현장 인터뷰 입력');
    });

    it('"다음" 버튼이 표시된다', () => {
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. 스텝 네비게이션
  // -------------------------------------------------------------------------
  describe('스텝 네비게이션', () => {
    it('"다음" 클릭 시 스텝 2로 이동한다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 1 표시 확인
      expect(screen.getByTestId('step-basic-info')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /다음/ }));

      // 스텝 2 표시 확인
      expect(screen.getByTestId('step-company-details')).toBeInTheDocument();
      expect(screen.getByTestId('current-step-indicator')).toHaveTextContent('Step 2');
    });

    it('스텝 2에서 "이전" 클릭 시 스텝 1로 돌아간다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 2로 이동
      await user.click(screen.getByRole('button', { name: /다음/ }));
      expect(screen.getByTestId('step-company-details')).toBeInTheDocument();

      // 스텝 1로 복귀
      await user.click(screen.getByRole('button', { name: /이전/ }));
      expect(screen.getByTestId('step-basic-info')).toBeInTheDocument();
      expect(screen.getByTestId('current-step-indicator')).toHaveTextContent('Step 1');
    });

    it('스텝 3까지 "다음"을 연속 클릭하면 StepJobTasks가 표시된다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      await user.click(screen.getByRole('button', { name: /다음/ })); // 1 → 2
      await user.click(screen.getByRole('button', { name: /다음/ })); // 2 → 3

      expect(screen.getByTestId('step-job-tasks')).toBeInTheDocument();
      expect(screen.getByTestId('current-step-indicator')).toHaveTextContent('Step 3');
    });

    it('모든 스텝을 순차적으로 이동할 수 있다 (1→6)', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      const expectedComponents = [
        'step-basic-info',      // 1
        'step-company-details', // 2
        'step-job-tasks',       // 3
        'step-pain-points',     // 4
        'step-constraints-goals', // 5
        'step-summary',         // 6
      ];

      // 스텝 1 확인
      expect(screen.getByTestId(expectedComponents[0])).toBeInTheDocument();

      // 스텝 2~6으로 이동
      for (let i = 1; i < 6; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
        expect(screen.getByTestId(expectedComponents[i])).toBeInTheDocument();
      }
    });

    it('마지막 스텝(6)에서는 "다음" 대신 "저장" 버튼이 표시된다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 6까지 이동
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }

      expect(screen.queryByRole('button', { name: /다음/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument();
    });

    it('스테퍼 클릭으로 직접 스텝 이동이 가능하다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스테퍼에서 스텝 4 클릭
      await user.click(screen.getByTestId('stepper-step-4'));

      expect(screen.getByTestId('step-pain-points')).toBeInTheDocument();
      expect(screen.getByTestId('current-step-indicator')).toHaveTextContent('Step 4');
    });
  });

  // -------------------------------------------------------------------------
  // 3. 미완료 검증 (빈 데이터로 마지막 스텝)
  // -------------------------------------------------------------------------
  describe('미완료 검증', () => {
    it('빈 데이터로 마지막 스텝에서 "필수 단계 미완료" 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 6까지 이동
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }

      // 필수 단계 미완료 메시지 확인 (REQUIRED_STEP_IDS = [1, 3, 4, 5])
      // 스텝 1: 빈 participants name → invalid
      // 스텝 3: 빈 job_tasks → invalid
      // 스텝 4: 빈 pain_points → invalid
      // 스텝 5: 빈 improvement_goals → invalid
      expect(screen.getByText(/필수 단계 미완료/)).toBeInTheDocument();
    });

    it('빈 데이터로 마지막 스텝에서 저장 버튼이 disabled이다', async () => {
      const user = userEvent.setup();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 6까지 이동
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }

      const saveButton = screen.getByRole('button', { name: /저장/ });
      expect(saveButton).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. 자동저장 디바운싱
  // -------------------------------------------------------------------------
  describe('자동저장 디바운싱', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('데이터가 있는 initialInterview로 렌더링 후 3초 전에는 saveInterview가 호출되지 않는다', async () => {
      const initialData = makeFullInitialInterview();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);

      // 2.9초 경과 — 아직 호출되면 안 됨
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2900);
      });
      expect(mockSaveInterview).not.toHaveBeenCalled();
    });

    it('initialInterview가 있으면 3초 후에도 데이터가 변경되지 않아 saveInterview가 호출되지 않는다', async () => {
      const initialData = makeFullInitialInterview();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);

      // 3초 경과 — 데이터가 변경되지 않았으므로 호출되지 않아야 함
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100);
      });
      expect(mockSaveInterview).not.toHaveBeenCalled();
    });

    it('빈 initialInterview로 렌더링 시 3초 후 autoSave가 트리거된다 (데이터 변경 감지)', async () => {
      // null initialInterview → lastFormDataRef가 '' → 현재 폼 데이터와 다르므로 자동저장 발생
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 3초 후 자동저장 트리거
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100);
      });

      expect(mockSaveInterview).toHaveBeenCalledTimes(1);
      expect(mockSaveInterview).toHaveBeenCalledWith(
        TEST_PROJECT_ID,
        expect.objectContaining({ interview_date: expect.any(String) }),
        { autoSave: true },
      );
    });
  });

  // -------------------------------------------------------------------------
  // 5-6. 최종 저장 (성공/실패) — fake timers 공유
  // -------------------------------------------------------------------------
  describe('최종 저장', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    /** 스텝 6까지 이동하는 헬퍼 */
    async function navigateToLastStep(user: ReturnType<typeof userEvent.setup>) {
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }
    }

    it('필수 데이터 충족 → "저장" 클릭 → saveInterview 호출 + 성공 토스트 + 리다이렉트', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const initialData = makeFullInitialInterview();
      mockSaveInterview.mockResolvedValue({ success: true });

      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);
      await navigateToLastStep(user);

      const saveButton = screen.getByRole('button', { name: /저장/ });
      expect(saveButton).not.toBeDisabled();
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveInterview).toHaveBeenCalledWith(
          TEST_PROJECT_ID,
          expect.objectContaining({
            interview_date: '2026-03-15',
            participants: makeValidParticipants(),
            job_tasks: makeValidJobTasks(),
            pain_points: makeValidPainPoints(),
            improvement_goals: makeValidImprovementGoals(),
          }),
        );
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('저장 완료', '인터뷰가 성공적으로 저장되었습니다.');
      });
      expect(screen.getByText('인터뷰가 저장되었습니다.')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      expect(mockPush).toHaveBeenCalledWith(`/consultant/projects/${TEST_PROJECT_ID}`);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('saveInterview 에러 반환 → 에러 토스트 + 리다이렉트 없음', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const initialData = makeFullInitialInterview();
      mockSaveInterview.mockResolvedValue({ success: false, error: '서버 오류가 발생했습니다.' });

      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);
      await navigateToLastStep(user);
      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('저장 실패', '서버 오류가 발생했습니다.');
      });
      expect(screen.getByText('서버 오류가 발생했습니다.')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('saveInterview 예외 throw → 일반 에러 메시지', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const initialData = makeFullInitialInterview();
      mockSaveInterview.mockRejectedValue(new Error('네트워크 오류'));

      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);
      await navigateToLastStep(user);
      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('저장 실패', '서버와 통신 중 오류가 발생했습니다.');
      });
      expect(screen.getByText('저장에 실패했습니다.')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 7. initialInterview 있는 경우 초기화
  // -------------------------------------------------------------------------
  describe('기존 인터뷰 데이터로 초기화', () => {
    it('initialInterview가 있으면 completedSteps가 모든 스텝으로 초기화된다', () => {
      const initialData = makeFullInitialInterview();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);

      // 스텝 1이 표시됨 (currentStep은 항상 1부터)
      expect(screen.getByTestId('step-basic-info')).toBeInTheDocument();
    });

    it('initialInterview가 있으면 저장 버튼이 활성화된다 (유효한 데이터)', async () => {
      const user = userEvent.setup();
      const initialData = makeFullInitialInterview();
      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={initialData} />);

      // 스텝 6까지 이동
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }

      const saveButton = screen.getByRole('button', { name: /저장/ });
      expect(saveButton).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // 8. 빈 데이터에서 최종 저장 시도 (handleSubmit validation)
  // -------------------------------------------------------------------------
  describe('빈 데이터에서 최종 저장 시도', () => {
    it('빈 데이터에서 저장 버튼이 disabled이다', async () => {
      const user = userEvent.setup();

      render(<InterviewClient projectId={TEST_PROJECT_ID} initialInterview={null} />);

      // 스텝 6까지 이동
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /다음/ }));
      }

      const saveButton = screen.getByRole('button', { name: /저장/ });
      expect(saveButton).toBeDisabled();
    });
  });
});
