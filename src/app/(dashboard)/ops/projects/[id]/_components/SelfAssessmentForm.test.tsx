import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SelfAssessmentForm from './SelfAssessmentForm';

// ============================================================================
// 모킹
// ============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/ops/projects',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockCreateSelfAssessment = vi.fn();
vi.mock('../../actions', () => ({
  createSelfAssessment: (...args: unknown[]) => mockCreateSelfAssessment(...args),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

function createTemplate(dimensions: string[] = ['데이터', '인프라'], questionsPerDim = 2) {
  const questions = dimensions.flatMap((dim, di) =>
    Array.from({ length: questionsPerDim }, (_, qi) => ({
      id: `q-${di}-${qi}`,
      order: qi + 1,
      dimension: dim,
      question_text: `${dim} 질문 ${qi + 1}`,
      weight: 1,
    }))
  );
  return {
    id: 'template-1',
    version: 1,
    name: '테스트 템플릿',
    questions,
  };
}

const defaultProps = {
  projectId: 'project-123',
  template: createTemplate(),
};

// ============================================================================
// 헬퍼
// ============================================================================

function renderForm(overrides = {}) {
  return render(<SelfAssessmentForm {...defaultProps} {...overrides} />);
}

/** 현재 스텝에 표시된 질문들의 첫 번째 점수(1점) 버튼을 모두 클릭 */
function answerAllCurrentQuestions() {
  const questionGrids = document.querySelectorAll('.grid.grid-cols-5');
  questionGrids.forEach((grid) => {
    const firstButton = grid.querySelector('button');
    if (firstButton) fireEvent.click(firstButton);
  });
}

// ============================================================================
// 테스트
// ============================================================================

describe('SelfAssessmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSelfAssessment.mockResolvedValue({ success: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  // --------------------------------------------------------------------------
  // 초기 렌더링
  // --------------------------------------------------------------------------

  describe('초기 렌더링', () => {
    it('첫 번째 차원의 질문들이 표시된다', () => {
      renderForm();
      expect(screen.getByText('데이터 질문 1')).toBeInTheDocument();
      expect(screen.getByText('데이터 질문 2')).toBeInTheDocument();
    });

    it('전체 진행률이 표시된다', () => {
      renderForm();
      expect(screen.getByText('전체 진행률')).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 4 문항/)).toBeInTheDocument();
    });

    it('스텝 인디케이터에 차원 이름들이 표시된다', () => {
      renderForm();
      expect(screen.getAllByText('데이터').length).toBeGreaterThan(0);
      expect(screen.getAllByText('인프라').length).toBeGreaterThan(0);
    });

    it('미응답 문항 수가 하단에 표시된다', () => {
      renderForm();
      expect(screen.getByText('4개 문항 미응답')).toBeInTheDocument();
    });

    it('차원 헤더에 현재 차원 이름과 완료 상태가 표시된다', () => {
      renderForm();
      // DimensionHeader 내의 차원 이름 (inline-flex 영역)
      const dimensionBadge = document.querySelector('.inline-flex .text-indigo-700');
      expect(dimensionBadge?.textContent).toBe('데이터');
      expect(screen.getByText('0 / 2 완료')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 스텝 네비게이션
  // --------------------------------------------------------------------------

  describe('스텝 네비게이션', () => {
    it('미응답 질문이 있으면 다음 스텝으로 이동하지 못한다', async () => {
      const user = userEvent.setup();
      renderForm();

      const nextButton = screen.getByText('다음', { selector: 'button' });
      await user.click(nextButton);

      expect(screen.getByText('현재 단계의 모든 문항에 응답해 주세요.')).toBeInTheDocument();
    });

    it('모든 질문에 답하면 다음 스텝으로 이동할 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      answerAllCurrentQuestions();

      const nextButton = screen.getByText('다음', { selector: 'button' });
      await user.click(nextButton);

      expect(screen.getByText('인프라 질문 1')).toBeInTheDocument();
    });

    it('이전 버튼으로 이전 스텝으로 돌아갈 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      answerAllCurrentQuestions();

      await user.click(screen.getByText('다음', { selector: 'button' }));
      expect(screen.getByText('인프라 질문 1')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /이전/ }));
      expect(screen.getByText('데이터 질문 1')).toBeInTheDocument();
    });

    it('첫 번째 스텝에서 이전 버튼이 비활성화된다', () => {
      renderForm();
      const prevButton = screen.getByRole('button', { name: /이전/ });
      expect(prevButton).toBeDisabled();
    });

    it('스텝 인디케이터를 클릭하여 특정 스텝으로 이동할 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      const stepButtons = screen.getAllByRole('button');
      const infraButton = stepButtons.find((btn) => btn.textContent?.includes('인프라'));
      if (infraButton) {
        await user.click(infraButton);
        expect(screen.getByText('인프라 질문 1')).toBeInTheDocument();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 질문 응답
  // --------------------------------------------------------------------------

  describe('질문 응답', () => {
    it('질문에 점수를 선택할 수 있다', () => {
      renderForm();

      // 첫 번째 질문의 3점 버튼 클릭
      const questionGrids = document.querySelectorAll('.grid.grid-cols-5');
      const thirdButton = questionGrids[0].querySelectorAll('button')[2];
      fireEvent.click(thirdButton);

      expect(screen.getByText(/1 \/ 4 문항/)).toBeInTheDocument();
    });

    it('응답 완료 시 차원 헤더의 완료 상태가 업데이트된다', () => {
      renderForm();

      answerAllCurrentQuestions();

      expect(screen.getByText('2 / 2 완료')).toBeInTheDocument();
    });

    it('모든 질문에 답하면 완료 메시지가 표시된다', () => {
      const template = createTemplate(['차원1'], 2);
      renderForm({ template });

      answerAllCurrentQuestions();

      expect(screen.getByText('모든 문항 응답 완료')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 진행률 표시
  // --------------------------------------------------------------------------

  describe('진행률 표시', () => {
    it('응답 후 진행률이 업데이트된다', () => {
      renderForm();

      const questionGrids = document.querySelectorAll('.grid.grid-cols-5');
      // 첫 번째, 두 번째 질문의 2점 버튼 클릭
      fireEvent.click(questionGrids[0].querySelectorAll('button')[1]);
      fireEvent.click(questionGrids[1].querySelectorAll('button')[1]);

      expect(screen.getByText(/2 \/ 4 문항/)).toBeInTheDocument();
    });

    it('진행률 백분율이 올바르게 계산된다', () => {
      renderForm();

      answerAllCurrentQuestions(); // 2개 응답

      // 2/4 = 50%
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 제출
  // --------------------------------------------------------------------------

  describe('제출', () => {
    it('모든 질문 응답 후 제출 버튼이 활성화된다', async () => {
      const _user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      expect(submitButton).not.toBeDisabled();
    });

    it('미응답 상태에서 제출 버튼이 비활성화된다', () => {
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      expect(submitButton).toBeDisabled();
    });

    it('성공적으로 제출하면 router.refresh가 호출된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSelfAssessment).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('제출 시 FormData에 올바른 값이 전달된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateSelfAssessment).toHaveBeenCalledTimes(1);
      });

      const formData = mockCreateSelfAssessment.mock.calls[0][0] as FormData;
      expect(formData.get('project_id')).toBe('project-123');
      expect(formData.get('template_id')).toBe('template-1');

      const answers = JSON.parse(formData.get('answers') as string);
      expect(answers).toHaveLength(1);
      expect(answers[0].answer_value).toBe(1);
    });

    it('제출 실패 시 에러 메시지가 표시된다', async () => {
      mockCreateSelfAssessment.mockResolvedValue({
        success: false,
        error: '저장 중 오류 발생',
      });

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('저장 중 오류 발생')).toBeInTheDocument();
      });
    });

    it('제출 실패 시 에러 메시지가 없으면 기본 메시지를 표시한다', async () => {
      mockCreateSelfAssessment.mockResolvedValue({
        success: false,
      });

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('자가진단 저장에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('제출 중 예외 발생 시 에러 메시지가 표시된다', async () => {
      mockCreateSelfAssessment.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('자가진단 저장에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('미응답 질문이 있으면 제출 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1', '차원2'], 1);
      renderForm({ template });

      // 첫 번째 차원만 응답
      answerAllCurrentQuestions();

      // 다음 스텝으로 이동
      await user.click(screen.getByText('다음', { selector: 'button' }));

      // 마지막 스텝이지만 미응답 → 제출 버튼 비활성화
      const submitButton = screen.getByRole('button', {
        name: '자가진단 저장',
      });
      expect(submitButton).toBeDisabled();

      expect(mockCreateSelfAssessment).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 입력 상태 유지
  // --------------------------------------------------------------------------

  describe('입력 상태 유지', () => {
    it('스텝을 이동해도 질문 응답값이 유지된다', async () => {
      const user = userEvent.setup();
      renderForm();

      answerAllCurrentQuestions();

      await user.click(screen.getByText('다음', { selector: 'button' }));
      await user.click(screen.getByRole('button', { name: /이전/ }));

      // 진행률에 응답한 수가 반영됨
      expect(screen.getByText(/2 \/ 4 문항/)).toBeInTheDocument();
      expect(screen.getByText('2 / 2 완료')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 다차원 템플릿
  // --------------------------------------------------------------------------

  describe('다차원 템플릿', () => {
    it('3개 차원 템플릿에서 모든 스텝을 순회할 수 있다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['A', 'B', 'C'], 1);
      renderForm({ template });

      // 차원 A
      expect(screen.getByText('A 질문 1')).toBeInTheDocument();
      answerAllCurrentQuestions();
      await user.click(screen.getByText('다음', { selector: 'button' }));

      // 차원 B
      expect(screen.getByText('B 질문 1')).toBeInTheDocument();
      answerAllCurrentQuestions();
      await user.click(screen.getByText('다음', { selector: 'button' }));

      // 차원 C (마지막)
      expect(screen.getByText('C 질문 1')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 폼 제출 방지
  // --------------------------------------------------------------------------

  describe('폼 제출 방지', () => {
    it('form 엘리먼트가 존재한다', () => {
      renderForm();
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });
});
