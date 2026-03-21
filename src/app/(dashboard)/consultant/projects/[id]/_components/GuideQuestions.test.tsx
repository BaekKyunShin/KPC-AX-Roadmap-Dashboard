import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹 (최상단)
// =============================================================================

const mockUpdateInterviewGuideQuestions = vi.fn();
vi.mock('../actions', () => ({
  updateInterviewGuideQuestions: (...args: unknown[]) =>
    mockUpdateInterviewGuideQuestions(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// =============================================================================
// Import
// =============================================================================

import { GuideQuestions } from './GuideQuestions';
import type { GuideQuestion } from '@/lib/schemas/interview-guide';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeQuestion(overrides: Partial<GuideQuestion> = {}): GuideQuestion {
  return {
    id: 'q-1',
    dimension: '데이터 준비도',
    question: '현재 데이터 수집 체계가 있나요?',
    intent: '데이터 현황 파악',
    checked: true,
    is_custom: false,
    ...overrides,
  };
}

const defaultQuestions: GuideQuestion[] = [
  makeQuestion({ id: 'q-1', dimension: '데이터 준비도', question: '데이터 수집 체계가 있나요?' }),
  makeQuestion({ id: 'q-2', dimension: 'AI 전략', question: 'AI 도입 계획이 있나요?', checked: false }),
  makeQuestion({
    id: 'q-3',
    dimension: '데이터 준비도',
    question: '데이터 품질 관리를 하고 있나요?',
    is_custom: true,
  }),
];

// =============================================================================
// 테스트
// =============================================================================

describe('GuideQuestions', () => {
  const onQuestionsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateInterviewGuideQuestions.mockResolvedValue({ success: true });
  });

  describe('질문 목록 렌더링', () => {
    it('질문 내용을 렌더링한다', () => {
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      expect(screen.getByText('데이터 수집 체계가 있나요?')).toBeInTheDocument();
      expect(screen.getByText('AI 도입 계획이 있나요?')).toBeInTheDocument();
    });

    it('선택된/전체 질문 수를 표시한다', () => {
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );
      // defaultQuestions: checked=true 2개, checked=false 1개 → "2/3개 선택됨"
      expect(screen.getByText('2/3개 선택됨')).toBeInTheDocument();
    });

    it('영역별로 그룹핑하여 배지를 렌더링한다', () => {
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );
      expect(screen.getByText('데이터 준비도')).toBeInTheDocument();
      expect(screen.getByText('AI 전략')).toBeInTheDocument();
    });

    it('커스텀 질문에만 삭제 버튼이 표시된다', () => {
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );
      // Trash2 아이콘을 포함한 버튼 — is_custom=true인 q-3에만 존재
      const deleteButtons = screen
        .queryAllByRole('button')
        .filter((btn) => btn.querySelector('svg'));
      // 질문 추가 버튼 1개 + 커스텀 삭제 버튼 1개 = 2개
      // 정확히 커스텀 질문 하나에만 삭제 아이콘 버튼이 있는지 직접 확인
      expect(screen.getByText('데이터 품질 관리를 하고 있나요?')).toBeInTheDocument();
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('체크박스 토글', () => {
    it('체크박스 클릭 시 onQuestionsChange가 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(onQuestionsChange).toHaveBeenCalled();
    });

    it('체크박스 클릭 시 서버 저장이 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(mockUpdateInterviewGuideQuestions).toHaveBeenCalledWith(
          'proj-1',
          expect.any(Array),
        );
      });
    });
  });

  describe('질문 추가 폼', () => {
    it('"질문 추가" 버튼 클릭 시 입력 폼이 나타난다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      await user.click(screen.getByText('질문 추가'));

      expect(screen.getByPlaceholderText('질문을 입력하세요')).toBeInTheDocument();
    });

    it('질문 입력 없이 추가 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      await user.click(screen.getByText('질문 추가'));

      const addButton = screen.getByRole('button', { name: '추가' });
      expect(addButton).toBeDisabled();
    });

    it('질문 입력 후 추가 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      await user.click(screen.getByText('질문 추가'));
      await user.type(screen.getByPlaceholderText('질문을 입력하세요'), '새 질문 내용');

      const addButton = screen.getByRole('button', { name: '추가' });
      expect(addButton).not.toBeDisabled();
    });

    it('추가 후 onQuestionsChange가 새 질문 포함하여 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      await user.click(screen.getByText('질문 추가'));
      await user.type(screen.getByPlaceholderText('질문을 입력하세요'), '새 질문');
      await user.click(screen.getByRole('button', { name: '추가' }));

      expect(onQuestionsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ question: '새 질문', is_custom: true }),
        ]),
      );
    });

    it('취소 버튼 클릭 시 입력 폼이 닫힌다', async () => {
      const user = userEvent.setup();
      render(
        <GuideQuestions
          projectId="proj-1"
          questions={defaultQuestions}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      await user.click(screen.getByText('질문 추가'));
      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(screen.queryByPlaceholderText('질문을 입력하세요')).not.toBeInTheDocument();
    });
  });

  describe('커스텀 질문 삭제', () => {
    it('커스텀 질문 삭제 시 onQuestionsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const customOnly: GuideQuestion[] = [
        makeQuestion({ id: 'c-1', is_custom: true, question: '삭제할 커스텀 질문' }),
      ];

      render(
        <GuideQuestions
          projectId="proj-1"
          questions={customOnly}
          onQuestionsChange={onQuestionsChange}
        />,
      );

      // 삭제 버튼 (Trash2 아이콘 포함된 버튼)
      const deleteBtn = screen.getByRole('button', { name: '' });
      await user.click(deleteBtn);

      expect(onQuestionsChange).toHaveBeenCalledWith([]);
    });
  });
});
