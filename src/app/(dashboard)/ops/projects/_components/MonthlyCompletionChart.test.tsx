import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonthlyCompletionChart from './MonthlyCompletionChart';
import type { MonthlyCompletion } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  // Tooltip — formatter/labelFormatter 콜백을 실제로 호출하여 branches 커버
  Tooltip: ({
    formatter,
    labelFormatter,
  }: {
    formatter?: (value: number) => [string, string];
    labelFormatter?: (label: string) => string;
  }) => {
    const formattedValue = formatter ? formatter(5) : null;
    const formattedLabel = labelFormatter ? labelFormatter('1월') : null;
    return (
      <div data-testid="tooltip">
        {formattedValue && (
          <span data-testid="tooltip-value">{formattedValue[0]}</span>
        )}
        {formattedLabel && (
          <span data-testid="tooltip-label">{formattedLabel}</span>
        )}
      </div>
    );
  },
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Label: () => null,
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockData: MonthlyCompletion[] = [
  { month: '2026-01', label: '1월', count: 3 },
  { month: '2026-02', label: '2월', count: 5 },
  { month: '2025-12', label: '12월', count: 2 },
];

// ============================================================================
// 테스트
// ============================================================================

describe('MonthlyCompletionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('카드 타이틀 "월별 양식 확정 현황"을 표시한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      expect(screen.getByText('월별 양식 확정 현황')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 빈 데이터
  // --------------------------------------------------------------------------
  describe('빈 데이터', () => {
    it('데이터가 없으면 "데이터가 없습니다"를 표시한다', () => {
      render(<MonthlyCompletionChart data={[]} />);
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    });

    it('데이터가 없으면 BarChart를 렌더링하지 않는다', () => {
      render(<MonthlyCompletionChart data={[]} />);
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 차트 렌더링
  // --------------------------------------------------------------------------
  describe('차트 렌더링', () => {
    it('데이터가 있을 때 BarChart를 렌더링한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('데이터가 있을 때 Bar 컴포넌트를 렌더링한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    it('데이터가 있을 때 "데이터가 없습니다"를 표시하지 않는다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      expect(screen.queryByText('데이터가 없습니다')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 단일 데이터
  // --------------------------------------------------------------------------
  describe('단일 데이터', () => {
    it('단일 월 데이터도 정상적으로 차트를 렌더링한다', () => {
      render(
        <MonthlyCompletionChart
          data={[{ month: '2026-03', label: '3월', count: 1 }]}
        />,
      );
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Tooltip formatter/labelFormatter 콜백 커버 (branches)
  // --------------------------------------------------------------------------
  describe('Tooltip 콜백', () => {
    it('formatter가 "5건" 형식으로 값을 반환한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      // tooltip mock이 formatter(5)를 호출 → "5건" 렌더링
      expect(screen.getByTestId('tooltip-value').textContent).toBe('5건');
    });

    it('labelFormatter가 레이블을 그대로 반환한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      // tooltip mock이 labelFormatter('1월')를 호출 → "1월" 렌더링
      expect(screen.getByTestId('tooltip-label').textContent).toBe('1월');
    });
  });
});
