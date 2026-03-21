import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/constants/score-color', () => ({
  getScoreColor: (pct: number) => {
    if (pct > 60) return { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (pct >= 30) return { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
    return { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  },
}));

import { SelfAssessmentResult } from './SelfAssessmentResult';
import type { SelfAssessmentScores } from '@/lib/constants/score-color';

// =============================================================================
// 테스트 데이터 팩토리
// =============================================================================

function makeScores(overrides?: Partial<SelfAssessmentScores>): SelfAssessmentScores {
  return {
    total_score: 70,
    max_possible_score: 100,
    dimension_scores: [
      { dimension: '데이터 활용', score: 8, max_score: 10 },
      { dimension: 'AI 인식', score: 6, max_score: 10 },
    ],
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('SelfAssessmentResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('종합 점수 영역', () => {
    it('총점을 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('70')).toBeInTheDocument();
    });

    it('최대 점수를 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText(/\/ 100/)).toBeInTheDocument();
    });

    it('percentage를 계산하여 표시한다 (70/100 = 70%)', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('"종합 점수" 레이블을 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('종합 점수')).toBeInTheDocument();
    });

    it('progress bar width가 percentage와 일치한다', () => {
      const { container } = render(<SelfAssessmentResult scores={makeScores()} />);
      const progressBar = container.querySelector('[style*="width"]') as HTMLElement;
      expect(progressBar).not.toBeNull();
      expect(progressBar.style.width).toBe('70%');
    });

    it('total_score가 undefined이면 0으로 처리한다', () => {
      render(<SelfAssessmentResult scores={{ max_possible_score: 100 }} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('max_possible_score가 undefined이면 100으로 처리한다', () => {
      render(<SelfAssessmentResult scores={{ total_score: 50 }} />);
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText(/\/ 100/)).toBeInTheDocument();
    });

    it('소수점 점수를 반올림하여 표시한다', () => {
      render(
        <SelfAssessmentResult scores={{ total_score: 73.7, max_possible_score: 100 }} />,
      );
      expect(screen.getByText('74')).toBeInTheDocument();
    });
  });

  describe('createdAt 날짜 표시', () => {
    it('createdAt이 있으면 진단 날짜를 표시한다', () => {
      render(
        <SelfAssessmentResult
          scores={makeScores()}
          createdAt="2024-03-15T00:00:00Z"
        />,
      );
      expect(screen.getByText(/진단/)).toBeInTheDocument();
    });

    it('createdAt이 없으면 진단 날짜를 표시하지 않는다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.queryByText(/진단/)).not.toBeInTheDocument();
    });
  });

  describe('항목별 점수 영역', () => {
    it('dimension_scores가 있으면 "항목별 점수" 레이블을 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('항목별 점수')).toBeInTheDocument();
    });

    it('각 dimension 이름을 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('데이터 활용')).toBeInTheDocument();
      expect(screen.getByText('AI 인식')).toBeInTheDocument();
    });

    it('각 dimension 점수를 표시한다 (score/max_score)', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument();
    });

    it('각 dimension percentage를 표시한다', () => {
      render(<SelfAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('dimension_scores가 없으면 항목별 점수 영역이 없다', () => {
      render(
        <SelfAssessmentResult
          scores={{ total_score: 50, max_possible_score: 100 }}
        />,
      );
      expect(screen.queryByText('항목별 점수')).not.toBeInTheDocument();
    });
  });

  describe('색상 매핑', () => {
    it('60% 초과 점수에 green 색상이 적용된다', () => {
      const { container } = render(
        <SelfAssessmentResult scores={{ total_score: 70, max_possible_score: 100 }} />,
      );
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).not.toBeNull();
    });

    it('30~60% 점수에 amber 색상이 적용된다', () => {
      const { container } = render(
        <SelfAssessmentResult scores={{ total_score: 45, max_possible_score: 100 }} />,
      );
      const progressBar = container.querySelector('.bg-amber-500');
      expect(progressBar).not.toBeNull();
    });

    it('30% 미만 점수에 red 색상이 적용된다', () => {
      const { container } = render(
        <SelfAssessmentResult scores={{ total_score: 20, max_possible_score: 100 }} />,
      );
      const progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).not.toBeNull();
    });
  });
});
