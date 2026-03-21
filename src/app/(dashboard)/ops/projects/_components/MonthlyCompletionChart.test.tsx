import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MonthlyCompletionChart from './MonthlyCompletionChart';
import type { MonthlyCompletion } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('카드 타이틀 "월별 로드맵 확정 현황"을 표시한다', () => {
      render(<MonthlyCompletionChart data={mockData} />);
      expect(screen.getByText('월별 로드맵 확정 현황')).toBeInTheDocument();
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
      render(<MonthlyCompletionChart data={[{ month: '2026-03', label: '3월', count: 1 }]} />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});
