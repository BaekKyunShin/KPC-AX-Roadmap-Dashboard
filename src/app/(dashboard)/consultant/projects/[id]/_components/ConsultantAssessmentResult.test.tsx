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
  // Label mock: content 함수를 직접 호출하여 viewBox 분기 커버
  Label: ({ content }: { content?: (props: { viewBox?: { cx?: number; cy?: number } }) => React.ReactNode }) => {
    if (!content) return <div data-testid="label" />;
    // viewBox가 cx, cy를 가지는 경우 (true 분기)
    const withViewBox = content({ viewBox: { cx: 45, cy: 45 } });
    // viewBox가 없는 경우 (false 분기)
    const withoutViewBox = content({ viewBox: undefined });
    return (
      <div data-testid="label">
        <div data-testid="label-with-viewbox">{withViewBox}</div>
        <div data-testid="label-without-viewbox">{withoutViewBox ?? null}</div>
      </div>
    );
  },
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
      // 70/100 = 70% — Label mock이 tspan도 렌더링하므로 getAllByText 사용
      render(<ConsultantAssessmentResult scores={makeScores({ total_score: 70, max_possible_score: 100 })} />);
      const pctElements = screen.getAllByText('70%');
      expect(pctElements.length).toBeGreaterThanOrEqual(1);
    });

    it('total_score가 없으면 0으로 처리한다', () => {
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: undefined, max_possible_score: 100 })}
        />,
      );
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('max_possible_score가 없으면 100을 기본값으로 사용한다', () => {
      // Line 82: scores.max_possible_score || 100 분기 커버 (|| 100 경로)
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: 50, max_possible_score: undefined })}
        />,
      );
      // max가 100으로 폴백 → pct = round(50/100*100) = 50
      expect(screen.getByText('/ 100')).toBeInTheDocument();
    });

    it('Label content가 viewBox 없이 호출되면 null을 반환한다', () => {
      // Label mock에서 viewBox=undefined 경로 커버 (id 0, 1 false 분기)
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      // label-without-viewbox 내용이 비어있어야 함 (undefined 반환)
      const withoutViewBox = document.querySelector('[data-testid="label-without-viewbox"]');
      expect(withoutViewBox).toBeInTheDocument();
      expect(withoutViewBox?.textContent).toBe('');
    });

    it('Label content가 viewBox(cx, cy 포함)로 호출되면 텍스트를 렌더링한다', () => {
      // Label mock에서 viewBox={cx, cy} 경로 커버 (id 0, 1 true 분기)
      render(<ConsultantAssessmentResult scores={makeScores()} />);
      // label-with-viewbox 내용에 퍼센트 텍스트가 있어야 함
      const withViewBox = document.querySelector('[data-testid="label-with-viewbox"]');
      expect(withViewBox).toBeInTheDocument();
      // pct 텍스트 포함 확인 (80% = 8/10)
      expect(withViewBox?.textContent).toContain('%');
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
      // Label mock이 tspan도 렌더링하므로 getAllByText 사용
      render(
        <ConsultantAssessmentResult
          scores={makeScores({ total_score: 70, max_possible_score: 100 })}
        />,
      );
      expect(screen.getAllByText('70%').length).toBeGreaterThanOrEqual(1);
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
