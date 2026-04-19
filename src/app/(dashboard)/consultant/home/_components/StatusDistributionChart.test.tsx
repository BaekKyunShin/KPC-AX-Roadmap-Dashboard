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
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
}));

vi.mock('@/lib/constants/status', () => ({
  CONSULTANT_PROJECT_STATUS_CONFIG: {
    ASSIGNED: { label: '인터뷰 대기', color: 'bg-blue-100 text-blue-800' },
    INTERVIEWED: { label: '인터뷰 완료', color: 'bg-amber-100 text-amber-800' },
    ROADMAP_DRAFTED: { label: '로드맵 작성 중', color: 'bg-purple-100 text-purple-800' },
    FINALIZED: { label: '로드맵 완료', color: 'bg-green-100 text-green-800' },
  },
}));

// =============================================================================
// Import
// =============================================================================

import { StatusDistributionChart } from './StatusDistributionChart';

// =============================================================================
// 테스트
// =============================================================================

describe('StatusDistributionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('빈 상태', () => {
    it('total이 0이면 "배정된 프로젝트가 없습니다." 메시지를 표시한다', () => {
      render(<StatusDistributionChart byStatus={{}} total={0} />);
      expect(screen.getByText('배정된 프로젝트가 없습니다.')).toBeInTheDocument();
    });

    it('total이 0이면 차트가 렌더링되지 않는다', () => {
      render(<StatusDistributionChart byStatus={{}} total={0} />);
      expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
    });
  });

  describe('데이터가 있을 때', () => {
    const byStatus = {
      ASSIGNED: 3,
      INTERVIEWED: 2,
      ROADMAP_DRAFTED: 1,
      FINALIZED: 4,
    };

    it('차트 컨테이너가 렌더링된다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={10} />);
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('파이 차트가 렌더링된다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={10} />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('범례에 한글 상태 라벨을 표시한다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={10} />);
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
      expect(screen.getByText('인터뷰 완료')).toBeInTheDocument();
      expect(screen.getByText('로드맵 작성 중')).toBeInTheDocument();
      expect(screen.getByText('양식 확정')).toBeInTheDocument();
    });

    it('범례에 건수를 표시한다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={10} />);
      expect(screen.getByText('3건')).toBeInTheDocument();
      expect(screen.getByText('2건')).toBeInTheDocument();
      expect(screen.getByText('1건')).toBeInTheDocument();
      expect(screen.getByText('4건')).toBeInTheDocument();
    });
  });

  describe('일부 상태만 존재할 때', () => {
    it('값이 0인 상태는 범례에 표시하지 않는다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ ASSIGNED: 5, FINALIZED: 0 }}
          total={5}
        />,
      );
      // FINALIZED는 0이므로 범례에 없어야 함
      expect(screen.queryByText('로드맵 완료')).not.toBeInTheDocument();
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
    });

    it('ASSIGNED 상태만 있어도 차트가 정상 렌더링된다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ ASSIGNED: 7 }}
          total={7}
        />,
      );
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
      expect(screen.getByText('7건')).toBeInTheDocument();
    });
  });
});
