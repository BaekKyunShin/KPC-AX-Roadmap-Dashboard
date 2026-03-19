import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NavigationButtons } from './NavigationButtons';

// ============================================================================
// 테스트 헬퍼
// ============================================================================

function defaultProps(): Parameters<typeof NavigationButtons>[0] {
  return {
    currentStep: 1,
    totalSteps: 3,
    isLastStep: false,
    isCurrentStepComplete: false,
    allQuestionsAnswered: false,
    isLoading: false,
    isPending: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onSubmit: vi.fn(),
    onGoToStep: vi.fn(),
  };
}

function renderNav(overrides: Partial<Parameters<typeof NavigationButtons>[0]> = {}) {
  const props = { ...defaultProps(), ...overrides };
  return { ...render(<NavigationButtons {...props} />), props };
}

// ============================================================================
// 테스트
// ============================================================================

describe('NavigationButtons', () => {
  describe('이전 버튼', () => {
    it('"이전" 텍스트를 표시한다', () => {
      renderNav();
      expect(screen.getByText('이전')).toBeInTheDocument();
    });

    it('첫 번째 스텝(currentStep=0)에서 이전 버튼이 비활성화된다', () => {
      renderNav({ currentStep: 0 });
      const prevButton = screen.getByText('이전').closest('button')!;
      expect(prevButton).toBeDisabled();
    });

    it('두 번째 스텝 이후에는 이전 버튼이 활성화된다', () => {
      renderNav({ currentStep: 1 });
      const prevButton = screen.getByText('이전').closest('button')!;
      expect(prevButton).toBeEnabled();
    });

    it('이전 버튼 클릭 시 onPrev가 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderNav({ currentStep: 1 });

      await user.click(screen.getByText('이전').closest('button')!);
      expect(props.onPrev).toHaveBeenCalledOnce();
    });

    it('비활성화 상태에서 클릭해도 onPrev가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      const { props } = renderNav({ currentStep: 0 });

      await user.click(screen.getByText('이전').closest('button')!);
      expect(props.onPrev).not.toHaveBeenCalled();
    });
  });

  describe('다음 버튼 (마지막 스텝 아닐 때)', () => {
    it('"다음" 텍스트를 표시한다', () => {
      renderNav({ isLastStep: false });
      expect(screen.getByText('다음')).toBeInTheDocument();
    });

    it('다음 버튼 클릭 시 onNext가 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderNav({ isLastStep: false });

      await user.click(screen.getByText('다음').closest('button')!);
      expect(props.onNext).toHaveBeenCalledOnce();
    });

    it('마지막 스텝이 아닐 때 제출 버튼은 표시되지 않는다', () => {
      renderNav({ isLastStep: false });
      expect(screen.queryByText('자가진단 저장')).not.toBeInTheDocument();
    });
  });

  describe('제출 버튼 (마지막 스텝)', () => {
    it('"자가진단 저장" 텍스트를 표시한다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: true });
      expect(screen.getByText('자가진단 저장')).toBeInTheDocument();
    });

    it('마지막 스텝일 때 다음 버튼은 표시되지 않는다', () => {
      renderNav({ isLastStep: true });
      expect(screen.queryByText('다음')).not.toBeInTheDocument();
    });

    it('모든 문항 미완료 시 제출 버튼이 비활성화된다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: false });
      const submitButton = screen.getByText('자가진단 저장').closest('button')!;
      expect(submitButton).toBeDisabled();
    });

    it('모든 문항 완료 시 제출 버튼이 활성화된다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: true });
      const submitButton = screen.getByText('자가진단 저장').closest('button')!;
      expect(submitButton).toBeEnabled();
    });

    it('isLoading일 때 제출 버튼이 비활성화된다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: true, isLoading: true });
      const submitButton = screen.getByText('저장 중...').closest('button')!;
      expect(submitButton).toBeDisabled();
    });

    it('isPending일 때 제출 버튼이 비활성화된다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: true, isPending: true });
      const submitButton = screen.getByText('저장 중...').closest('button')!;
      expect(submitButton).toBeDisabled();
    });

    it('로딩 중일 때 "저장 중..." 텍스트를 표시한다', () => {
      renderNav({ isLastStep: true, allQuestionsAnswered: true, isLoading: true });
      expect(screen.getByText('저장 중...')).toBeInTheDocument();
    });

    it('제출 버튼 클릭 시 onSubmit이 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderNav({ isLastStep: true, allQuestionsAnswered: true });

      await user.click(screen.getByText('자가진단 저장').closest('button')!);
      expect(props.onSubmit).toHaveBeenCalledOnce();
    });
  });

  describe('페이지 도트 내비게이션', () => {
    it('totalSteps 수만큼 도트 버튼을 렌더링한다', () => {
      renderNav({ totalSteps: 5 });
      const buttons = screen.getAllByRole('button');
      // 이전(1) + 도트(5) + 다음(1) = 7
      expect(buttons).toHaveLength(7);
    });

    it('도트 클릭 시 onGoToStep이 해당 인덱스로 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderNav({ totalSteps: 3 });

      const buttons = screen.getAllByRole('button');
      // 도트: 인덱스 1, 2, 3 (0=이전, 4=다음)
      await user.click(buttons[2]);
      expect(props.onGoToStep).toHaveBeenCalledWith(1);
    });
  });
});
