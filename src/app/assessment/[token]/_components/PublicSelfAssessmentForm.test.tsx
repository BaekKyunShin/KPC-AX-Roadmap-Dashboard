import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicSelfAssessmentForm from './PublicSelfAssessmentForm';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/assessment',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockSubmitPublicAssessment = vi.fn();
vi.mock('../../actions', () => ({
  submitPublicAssessment: (...args: unknown[]) => mockSubmitPublicAssessment(...args),
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
  token: 'test-token-123',
  template: createTemplate(),
  onComplete: vi.fn(),
};

// ============================================================================
// 헬퍼
// ============================================================================

function renderForm(overrides = {}) {
  return render(<PublicSelfAssessmentForm {...defaultProps} {...overrides} />);
}

async function fillWriterInfo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/이름/), '홍길동');
  await user.type(screen.getByLabelText(/직책/), '부장');
  await user.type(screen.getByLabelText(/이메일/), 'hong@company.com');
}

/** 현재 스텝에 표시된 질문들의 첫 번째 점수(1점) 버튼을 모두 클릭 */
function answerAllCurrentQuestions() {
  // QuestionInput의 grid 컨테이너에 있는 점수 버튼만 선택
  const questionGrids = document.querySelectorAll('.grid.grid-cols-5');
  questionGrids.forEach((grid) => {
    const firstButton = grid.querySelector('button');
    if (firstButton) fireEvent.click(firstButton);
  });
}

// ============================================================================
// 테스트
// ============================================================================

describe('PublicSelfAssessmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitPublicAssessment.mockResolvedValue({ success: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  // --------------------------------------------------------------------------
  // 초기 렌더링
  // --------------------------------------------------------------------------

  describe('초기 렌더링', () => {
    it('작성자 정보 폼이 처음에 표시된다', () => {
      renderForm();
      // h2 태그로 특정
      expect(screen.getByRole('heading', { name: '작성자 정보' })).toBeInTheDocument();
      expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
      expect(screen.getByLabelText(/직책/)).toBeInTheDocument();
      expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    });

    it('다음 버튼이 표시된다', () => {
      renderForm();
      expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    });

    it('스텝 인디케이터에 작성자 정보와 차원들이 표시된다', () => {
      renderForm();
      // 스텝 인디케이터에 텍스트가 존재하는지 (getAllBy를 사용하여 다수 매칭 허용)
      expect(screen.getAllByText('작성자 정보').length).toBeGreaterThan(0);
      expect(screen.getAllByText('데이터').length).toBeGreaterThan(0);
      expect(screen.getAllByText('인프라').length).toBeGreaterThan(0);
    });

    it('진단 결과 안내 문구가 표시된다', () => {
      renderForm();
      expect(
        screen.getByText('진단 결과 안내를 위해 작성자 정보를 입력해 주세요.')
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 작성자 정보 검증
  // --------------------------------------------------------------------------

  describe('작성자 정보 검증', () => {
    it('이름이 2자 미만이면 검증 실패한다', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/이름/), '홍');
      await user.type(screen.getByLabelText(/직책/), '부장');
      await user.type(screen.getByLabelText(/이메일/), 'hong@company.com');
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('이름을 2자 이상 입력하세요.')).toBeInTheDocument();
    });

    it('직책이 비어있으면 검증 실패한다', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/이름/), '홍길동');
      await user.type(screen.getByLabelText(/이메일/), 'hong@company.com');
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('직책을 입력하세요.')).toBeInTheDocument();
    });

    it('이메일이 유효하지 않으면 검증 실패한다', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/이름/), '홍길동');
      await user.type(screen.getByLabelText(/직책/), '부장');
      await user.type(screen.getByLabelText(/이메일/), 'invalid-email');
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('유효한 이메일 주소를 입력하세요.')).toBeInTheDocument();
    });

    it('모든 작성자 정보가 비어있으면 다중 에러가 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('이름을 2자 이상 입력하세요.')).toBeInTheDocument();
      expect(screen.getByText('직책을 입력하세요.')).toBeInTheDocument();
      expect(screen.getByText('유효한 이메일 주소를 입력하세요.')).toBeInTheDocument();
    });

    it('에러 메시지 영역에 안내 텍스트가 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('작성자 정보를 모두 입력해 주세요.')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 스텝 네비게이션
  // --------------------------------------------------------------------------

  describe('스텝 네비게이션', () => {
    it('작성자 정보 입력 후 다음 스텝으로 이동한다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('데이터 질문 1')).toBeInTheDocument();
    });

    it('차원별 질문이 표시되면 전체 진행률이 보인다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('전체 진행률')).toBeInTheDocument();
    });

    it('이전 버튼으로 작성자 정보 스텝으로 돌아갈 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('데이터 질문 1')).toBeInTheDocument();

      // NavigationButtons의 이전 버튼
      const prevButton = screen.getByRole('button', { name: /이전/ });
      await user.click(prevButton);

      expect(screen.getByLabelText(/이름/)).toBeInTheDocument();
    });

    it('미응답 질문이 있으면 다음 스텝으로 이동하지 못한다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      // NavigationButtons의 다음 버튼 (ChevronRight 아이콘 포함)
      const navButtons = screen.getByText('다음', { selector: 'button' });
      await user.click(navButtons);

      expect(screen.getByText('현재 단계의 모든 문항에 응답해 주세요.')).toBeInTheDocument();
    });

    it('모든 질문에 답하면 다음 스텝으로 이동할 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const navNextButton = screen.getByText('다음', { selector: 'button' });
      await user.click(navNextButton);

      expect(screen.getByText('인프라 질문 1')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 질문 응답
  // --------------------------------------------------------------------------

  describe('질문 응답', () => {
    it('질문에 점수를 선택할 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      // 첫 번째 질문의 3점 버튼 클릭
      const questionGrids = document.querySelectorAll('.grid.grid-cols-5');
      const thirdButton = questionGrids[0].querySelectorAll('button')[2]; // 3점 (0-indexed)
      fireEvent.click(thirdButton);

      expect(screen.getByText(/1 \/ 4 문항/)).toBeInTheDocument();
    });

    it('미응답 문항 수가 올바르게 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText('4개 문항 미응답')).toBeInTheDocument();
    });

    it('모든 질문에 답하면 완료 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 2);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      expect(screen.getByText('모든 문항 응답 완료')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 진행률 표시
  // --------------------------------------------------------------------------

  describe('진행률 표시', () => {
    it('진행률 바에 응답 수와 총 수가 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByText(/0 \/ 4 문항/)).toBeInTheDocument();
    });

    it('차원 헤더에 현재 차원 이름이 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      // DimensionHeader 내에서 차원 이름 확인 (inline-flex 영역)
      const dimensionBadge = document.querySelector('.inline-flex .text-indigo-700');
      expect(dimensionBadge?.textContent).toBe('데이터');
    });
  });

  // --------------------------------------------------------------------------
  // 제출
  // --------------------------------------------------------------------------

  describe('제출', () => {
    it('성공적으로 제출하면 onComplete가 호출된다', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template, onComplete });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitPublicAssessment).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('제출 시 FormData에 올바른 값이 전달된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitPublicAssessment).toHaveBeenCalledTimes(1);
      });

      const formData = mockSubmitPublicAssessment.mock.calls[0][0] as FormData;
      expect(formData.get('token')).toBe('test-token-123');
      expect(formData.get('submitted_by_name')).toBe('홍길동');
      expect(formData.get('submitted_by_title')).toBe('부장');
      expect(formData.get('submitted_by_email')).toBe('hong@company.com');
      expect(formData.get('template_id')).toBe('template-1');

      const answers = JSON.parse(formData.get('answers') as string);
      expect(answers).toHaveLength(1);
      expect(answers[0].answer_value).toBe(1);
    });

    it('제출 실패 시 에러 메시지가 표시된다', async () => {
      mockSubmitPublicAssessment.mockResolvedValue({
        success: false,
        error: '서버 오류입니다.',
      });

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('서버 오류입니다.')).toBeInTheDocument();
      });
    });

    it('제출 중 예외 발생 시 에러 메시지가 표시된다', async () => {
      mockSubmitPublicAssessment.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('진단 제출에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('작성자 정보 미입력 상태에서는 제출 버튼이 비활성화된다', async () => {
      const _user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      // 스텝 인디케이터 클릭으로 질문 스텝으로 직접 이동
      const stepButtons = screen.getAllByRole('button');
      const dim1Buttons = stepButtons.filter((btn) => btn.textContent?.includes('차원1'));
      if (dim1Buttons.length > 0) {
        fireEvent.click(dim1Buttons[0]);
      }

      answerAllCurrentQuestions();

      // 작성자 정보 미입력 → allQuestionsAnswered && isWriterInfoComplete가 false
      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      expect(submitButton).toBeDisabled();
    });

    it('미응답 질문이 있으면 제출 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1', '차원2'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      // 차원1 응답
      answerAllCurrentQuestions();

      const navNextButton = screen.getByText('다음', { selector: 'button' });
      await user.click(navNextButton);

      // 차원2 미응답 상태 → 마지막 스텝이지만 제출 버튼 비활성화
      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      expect(submitButton).toBeDisabled();

      expect(mockSubmitPublicAssessment).not.toHaveBeenCalled();
    });

    it('제출 실패 후 에러 메시지가 없을 때 기본 메시지를 표시한다', async () => {
      mockSubmitPublicAssessment.mockResolvedValue({
        success: false,
      });

      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      const submitButton = screen.getByRole('button', { name: '자가진단 저장' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('진단 제출에 실패했습니다.')).toBeInTheDocument();
      });
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

  // --------------------------------------------------------------------------
  // 스텝 직접 이동
  // --------------------------------------------------------------------------

  describe('스텝 직접 이동', () => {
    it('스텝 인디케이터를 클릭하여 특정 스텝으로 이동할 수 있다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원A', '차원B'], 1);
      renderForm({ template });

      const stepButtons = screen.getAllByRole('button');
      const targetButton = stepButtons.find((btn) => btn.textContent?.includes('차원A'));
      if (targetButton) {
        await user.click(targetButton);
        expect(screen.getByText('차원A 질문 1')).toBeInTheDocument();
      }
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

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

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
  // 입력 상태 유지
  // --------------------------------------------------------------------------

  describe('입력 상태 유지', () => {
    it('스텝을 이동해도 작성자 정보 입력값이 유지된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      // 다시 작성자 정보로 돌아감
      const prevButton = screen.getByRole('button', { name: /이전/ });
      await user.click(prevButton);

      expect(screen.getByLabelText(/이름/)).toHaveValue('홍길동');
      expect(screen.getByLabelText(/직책/)).toHaveValue('부장');
      expect(screen.getByLabelText(/이메일/)).toHaveValue('hong@company.com');
    });

    it('스텝을 이동해도 질문 응답값이 유지된다', async () => {
      const user = userEvent.setup();
      const template = createTemplate(['차원1', '차원2'], 1);
      renderForm({ template });

      await fillWriterInfo(user);
      await user.click(screen.getByRole('button', { name: '다음' }));

      answerAllCurrentQuestions();

      await user.click(screen.getByText('다음', { selector: 'button' }));
      // 차원2에서 이전으로 돌아감
      await user.click(screen.getByRole('button', { name: /이전/ }));

      // 진행률에 응답한 수가 반영됨
      expect(screen.getByText(/1 \/ 2 문항/)).toBeInTheDocument();
    });
  });
});
