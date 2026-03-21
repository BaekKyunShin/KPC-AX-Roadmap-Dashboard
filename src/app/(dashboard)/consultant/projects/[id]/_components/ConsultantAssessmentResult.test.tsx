import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" data-fill={fill} />
  ),
  Label: () => <div data-testid="label" />,
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
}));

vi.mock('@/lib/constants/score-color', () => ({
  getScoreColor: (pct: number) => {
    if (pct > 60) return { hex: '#22c55e', bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    if (pct >= 30) return { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
    return { hex: '#ef4444', bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
  },
}));

// =============================================================================
// Import
// =============================================================================

import { ConsultantAssessmentResult } from './ConsultantAssessmentResult';
import type { SelfAssessmentScores } from '@/lib/constants/score-color';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeScores(overrides: Partial<SelfAssessmentScores> = {}): SelfAssessmentScores {
  return {
    total_score: 70,
    max_possible_score: 100,
    dimension_scores: [
      { dimension: '데이터 역량', score: 8, max_score: 10 },
      { dimension: 'AI 이해도', score: 7, max_score: 10 },
      { dimension: '조직 준비도', score: 6, max_score: 10 },
    ],
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('ConsultantAssessmentResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('종합 점수 영역', () => {
    it('"종합 점수" 제목을 표시한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('종합 점수')).toBeInTheDocument();
    });

    it('총점을 표시한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores({ total_score: 70 })} />);
      expect(screen.getByText('70')).toBeInTheDocument();
    });

    it('최대 점수를 표시한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores({ max_possible_score: 100 })} />);
      expect(screen.getByText('/ 100')).toBeInTheDocument();
    });

    it('백분율을 표시한다', () => {
      // 70/100 = 70%
      render(<ConsultantAssessmentResult scores={makeScores({ total_score: 70, max_possible_score: 100 })} />);
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('total_score가 없으면 0으로 처리한다', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: undefined, max_possible_score: 100 })}
        />,
      );
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('항목별 차트', () => {
    it('dimension_scores가 있으면 항목별 차트를 렌더링한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      const chartContainers = screen.getAllByTestId('chart-container');
      expect(chartContainers.length).toBeGreaterThan(0);
    });

    it('각 항목의 dimension 이름을 표시한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('데이터 역량')).toBeInTheDocument();
      expect(screen.getByText('AI 이해도')).toBeInTheDocument();
      expect(screen.getByText('조직 준비도')).toBeInTheDocument();
    });

    it('각 항목의 점수를 표시한다', () => {
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument();
    });

    it('dimension_scores가 없으면 항목별 차트를 렌더링하지 않는다', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ dimension_scores: undefined })}
        />,
      );
      // 종합 점수 영역만 존재하고 항목별 그리드는 없음
      expect(screen.queryByText('데이터 역량')).not.toBeInTheDocument();
    });

    it('dimension_scores가 빈 배열이면 항목별 차트를 렌더링하지 않는다', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ dimension_scores: [] })}
        />,
      );
      expect(screen.queryByText('데이터 역량')).not.toBeInTheDocument();
    });
  });

  describe('점수 범주별 색상', () => {
    it('60% 초과 점수는 그린 계열 퍼센트를 표시한다 (70%)', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: 70, max_possible_score: 100 })}
        />,
      );
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('30~60% 점수는 앰버 계열 퍼센트를 표시한다 (50%)', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: 50, max_possible_score: 100 })}
        />,
      );
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('30% 미만 점수는 레드 계열 퍼센트를 표시한다 (20%)', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: 20, max_possible_score: 100 })}
        />,
      );
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });
});
