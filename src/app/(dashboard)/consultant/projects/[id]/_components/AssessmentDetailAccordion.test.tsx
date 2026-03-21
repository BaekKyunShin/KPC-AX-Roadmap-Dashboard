import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// =============================================================================
// 모킹 (최상단)
// =============================================================================

vi.mock('@/lib/constants/score-color', () => ({
  getScoreColor: (pct: number) => {
    if (pct > 60) return { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (pct >= 30) return { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
    return { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  },
}));

vi.mock('@/components/ops/self-assessment', () => ({
  MAX_SCALE: 5,
  SCALE_5_LABELS: ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'],
}));

// =============================================================================
// Import
// =============================================================================

import {
  AssessmentDetailAccordion,
  type AssessmentAnswer,
  type AssessmentQuestion,
} from './AssessmentDetailAccordion';

// =============================================================================
// 테스트 데이터
// =============================================================================

const questions: AssessmentQuestion[] = [
  { id: 'q-1', order: 1, dimension: '데이터 준비도', question_text: '데이터 수집 체계가 있나요?', weight: 1 },
  { id: 'q-2', order: 2, dimension: '데이터 준비도', question_text: '데이터 품질을 관리하나요?', weight: 1 },
  { id: 'q-3', order: 3, dimension: 'AI 전략', question_text: 'AI 도입 계획이 있나요?', weight: 1 },
];

const answers: AssessmentAnswer[] = [
  { question_id: 'q-1', answer_value: 4 },
  { question_id: 'q-2', answer_value: 3 },
  { question_id: 'q-3', answer_value: 2 },
];

// =============================================================================
// 테스트
// =============================================================================

describe('AssessmentDetailAccordion', () => {
  describe('빈 데이터', () => {
    it('answers가 빈 배열이면 렌더링하지 않는다', () => {
      const { container } = render(
        <AssessmentDetailAccordion answers={[]} questions={questions} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('questions가 빈 배열이면 렌더링하지 않는다', () => {
      const { container } = render(
        <AssessmentDetailAccordion answers={answers} questions={[]} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('아코디언 토글', () => {
    it('초기 상태에서 "항목별 응답 보기" 버튼이 표시된다', () => {
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);
      expect(screen.getByText('항목별 응답 보기')).toBeInTheDocument();
    });

    it('"항목별 응답 보기" 클릭 시 아코디언 내용이 펼쳐진다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));

      expect(screen.getByText('항목별 응답 접기')).toBeInTheDocument();
    });

    it('펼친 상태에서 버튼 클릭 시 다시 접힌다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));
      await user.click(screen.getByText('항목별 응답 접기'));

      expect(screen.getByText('항목별 응답 보기')).toBeInTheDocument();
    });
  });

  describe('영역 및 문항 정보 표시', () => {
    it('영역 개수와 문항 수를 표시한다', () => {
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);
      // "2개 영역 · 3문항"
      expect(screen.getByText('2개 영역 · 3문항')).toBeInTheDocument();
    });

    it('펼쳤을 때 영역 이름이 표시된다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));

      expect(screen.getByText('데이터 준비도')).toBeInTheDocument();
      expect(screen.getByText('AI 전략')).toBeInTheDocument();
    });
  });

  describe('점수 표시', () => {
    it('펼쳤을 때 영역별 점수(%)가 표시된다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));

      // 데이터 준비도: (4+3)/(5+5) = 70%, AI 전략: 2/5 = 40%
      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('펼쳤을 때 점수/최대점수 형식으로 표시된다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));

      // 데이터 준비도: 7/10
      expect(screen.getByText('7/10')).toBeInTheDocument();
    });
  });

  describe('질문별 응답 표시', () => {
    it('아코디언 항목 클릭 시 해당 영역의 질문이 표시된다', async () => {
      const user = userEvent.setup();
      render(<AssessmentDetailAccordion answers={answers} questions={questions} />);

      await user.click(screen.getByText('항목별 응답 보기'));
      // AccordionTrigger 클릭 — 데이터 준비도 영역
      await user.click(screen.getByText('데이터 준비도'));

      expect(screen.getByText('데이터 수집 체계가 있나요?')).toBeInTheDocument();
    });

    it('미응답 질문은 "미응답"으로 표시된다', async () => {
      const user = userEvent.setup();
      const unansweredQuestions: AssessmentQuestion[] = [
        { id: 'u-1', order: 1, dimension: '테스트 영역', question_text: '미응답 질문', weight: 1 },
      ];
      // answers에는 u-1 없음
      const noAnswers: AssessmentAnswer[] = [
        { question_id: 'other', answer_value: 3 },
      ];

      render(
        <AssessmentDetailAccordion
          answers={noAnswers}
          questions={unansweredQuestions}
        />,
      );

      await user.click(screen.getByText('항목별 응답 보기'));
      await user.click(screen.getByText('테스트 영역'));

      expect(screen.getByText('미응답')).toBeInTheDocument();
    });
  });
});
