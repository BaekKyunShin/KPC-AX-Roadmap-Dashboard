import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusDistributionChart from './StatusDistributionChart';
import type { ProjectStats } from '../actions';

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

const mockStats: ProjectStats = {
  total: 15,
  byStatus: {
    NEW: 3,
    DIAGNOSED: 2,
    MATCH_RECOMMENDED: 1,
    ASSIGNED: 4,
    INTERVIEWED: 2,
    ROADMAP_DRAFTED: 1,
    FINALIZED: 2,
  },
};

const singleStatusStats: ProjectStats = {
  total: 5,
  byStatus: {
    NEW: 5,
  },
};

// ============================================================================
// 테스트
// ============================================================================

describe('StatusDistributionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('카드 타이틀 "상태별 프로젝트 분포"를 표시한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      expect(screen.getByText('상태별 프로젝트 분포')).toBeInTheDocument();
    });

    it('stats가 null이면 "데이터가 없습니다"를 표시한다', () => {
      render(<StatusDistributionChart stats={null} />);
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    });

    it('stats.total이 0이고 byStatus가 비어있으면 "데이터가 없습니다"를 표시한다', () => {
      render(<StatusDistributionChart stats={{ total: 0, byStatus: {} }} />);
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 차트 렌더링
  // --------------------------------------------------------------------------
  describe('차트 렌더링', () => {
    it('데이터가 있을 때 PieChart를 렌더링한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('데이터가 있을 때 Pie 컴포넌트를 렌더링한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('데이터가 있을 때 Cell 컴포넌트들을 렌더링한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. 범례(Legend) 렌더링
  // --------------------------------------------------------------------------
  describe('범례 렌더링', () => {
    it('값이 0보다 큰 단계의 라벨만 범례에 표시한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      // byStatus에 값이 있는 단계들의 라벨 확인
      expect(screen.getByText('신규 등록 완료')).toBeInTheDocument();
      expect(screen.getByText('컨설턴트 배정 완료')).toBeInTheDocument();
      expect(screen.getByText('현장 인터뷰 완료')).toBeInTheDocument();
      expect(screen.getByText('초안 완료')).toBeInTheDocument();
      expect(screen.getByText('최종 확정')).toBeInTheDocument();
    });

    it('범례에 "건" 단위가 포함된 수치를 표시한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      // 예: "3건 (20%)"
      const legendItems = screen.getAllByText(/건/);
      expect(legendItems.length).toBeGreaterThan(0);
    });

    it('퍼센트(%) 표시가 있다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      const pctItems = screen.getAllByText(/%/);
      expect(pctItems.length).toBeGreaterThan(0);
    });

    it('단일 상태만 있을 때 해당 상태 라벨을 표시한다', () => {
      render(<StatusDistributionChart stats={singleStatusStats} />);
      expect(screen.getByText('신규 등록 완료')).toBeInTheDocument();
    });

    it('단일 상태일 때 100%를 표시한다', () => {
      render(<StatusDistributionChart stats={singleStatusStats} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 진단결과 단계 집계 (DIAGNOSED + MATCH_RECOMMENDED)
  // --------------------------------------------------------------------------
  describe('진단결과 단계 집계', () => {
    it('진단결과 입력 완료 라벨을 표시한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      expect(screen.getByText('진단결과 입력 완료')).toBeInTheDocument();
    });

    it('DIAGNOSED(2) + MATCH_RECOMMENDED(1) = 3건을 합산하여 표시한다', () => {
      render(<StatusDistributionChart stats={mockStats} />);
      // 진단결과 범례 항목에서 3건이 표시됨
      const legendTexts = screen.getAllByText(/건/);
      const diagnosedEntry = legendTexts.find(el => el.textContent === '3건 (20%)');
      expect(diagnosedEntry).toBeTruthy();
    });
  });
});
