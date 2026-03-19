import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QuestionInput } from './QuestionInputs';
import type { Question } from './types';
import { SCALE_5_LABELS } from './constants';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================================================
// 테스트 헬퍼
// ============================================================================

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1',
    order: 1,
    dimension: '데이터',
    question_text: '데이터 수집 체계가 잘 구축되어 있습니까?',
    weight: 1,
    ...overrides,
  };
}

function renderInput(overrides: {
  question?: Partial<Question>;
  value?: number | undefined;
  onChange?: (questionId: string, value: number) => void;
} = {}) {
  const question = createQuestion(overrides.question);
  const onChange = overrides.onChange ?? vi.fn();
  const value = overrides.value;
  return {
    ...render(<QuestionInput question={question} value={value} onChange={onChange} />),
    question,
    onChange,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('QuestionInput', () => {
  describe('점수 버튼 렌더링', () => {
    it('1~5점 버튼을 모두 표시한다', () => {
      renderInput();
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    it('5개의 점수 버튼이 존재한다', () => {
      renderInput();
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });
  });

  describe('라벨 표시', () => {
    it('스케일 라벨을 표시한다 (데스크톱)', () => {
      renderInput();
      // SCALE_5_LABELS = ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다']
      // 데스크톱에서는 hidden sm:inline 클래스로 표시됨
      SCALE_5_LABELS.forEach((label) => {
        // getAllByText because the first and last labels also appear in mobile footer
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('모바일 하단에 첫 번째와 마지막 라벨을 표시한다', () => {
      renderInput();
      // 모바일 영역에 첫 번째/마지막 라벨이 별도로 표시됨
      expect(screen.getAllByText(SCALE_5_LABELS[0]).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(SCALE_5_LABELS[SCALE_5_LABELS.length - 1]).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('값 선택 상태', () => {
    it('선택된 값이 없으면 모든 버튼이 기본 스타일이다', () => {
      renderInput({ value: undefined });
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        // 선택 안 된 상태: border-gray-200 포함
        expect(btn.className).toContain('border-gray-200');
      });
    });

    it('value=3이면 3번 버튼이 선택 스타일을 가진다', () => {
      renderInput({ value: 3 });
      const buttons = screen.getAllByRole('button');
      // 3번 버튼 (인덱스 2)
      expect(buttons[2].className).toContain('border-blue-500');
    });

    it('선택되지 않은 버튼은 기본 스타일이다', () => {
      renderInput({ value: 3 });
      const buttons = screen.getAllByRole('button');
      // 1번 버튼 (인덱스 0)은 선택 안 됨
      expect(buttons[0].className).toContain('border-gray-200');
    });
  });

  describe('클릭 콜백', () => {
    it('점수 버튼 클릭 시 onChange가 (questionId, value)로 호출된다', async () => {
      const user = userEvent.setup();
      const { onChange, question } = renderInput();

      await user.click(screen.getByText('4').closest('button')!);
      expect(onChange).toHaveBeenCalledWith(question.id, 4);
    });

    it('1점 버튼 클릭 시 값 1로 호출된다', async () => {
      const user = userEvent.setup();
      const { onChange, question } = renderInput();

      await user.click(screen.getByText('1').closest('button')!);
      expect(onChange).toHaveBeenCalledWith(question.id, 1);
    });

    it('5점 버튼 클릭 시 값 5로 호출된다', async () => {
      const user = userEvent.setup();
      const { onChange, question } = renderInput();

      await user.click(screen.getByText('5').closest('button')!);
      expect(onChange).toHaveBeenCalledWith(question.id, 5);
    });

    it('이미 선택된 값을 다시 클릭해도 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const { onChange, question } = renderInput({ value: 2 });

      await user.click(screen.getByText('2').closest('button')!);
      expect(onChange).toHaveBeenCalledWith(question.id, 2);
    });

    it('다른 질문 ID로도 정상 동작한다', async () => {
      const user = userEvent.setup();
      const { onChange } = renderInput({ question: { id: 'custom-q' } });

      await user.click(screen.getByText('3').closest('button')!);
      expect(onChange).toHaveBeenCalledWith('custom-q', 3);
    });
  });
});
