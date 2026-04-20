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
  // ChartTooltip — content prop(PieTooltipContent)을 active 분기 양쪽으로 직접 호출
  // samplePayload는 범례에 표시되지 않을 고정 값 사용 (중복 텍스트 방지)
  ChartTooltip: ({
    content,
  }: {
    content?: React.ReactElement<{ active?: boolean; payload?: unknown[] }>;
  }) => {
    if (!content) return <div data-testid="chart-tooltip" />;
    const resolvedContent = content;
    // __TOOLTIP_SAMPLE__ 은 범례와 겹치지 않는 값
    const samplePayload = [
      { payload: { name: '__TOOLTIP_SAMPLE__', value: 999, color: '#FF0000' } },
    ];
    type TooltipRenderer = (p: { active?: boolean; payload?: unknown[] }) => React.ReactNode;
    const renderTooltip = resolvedContent.type as TooltipRenderer;
    return (
      <div data-testid="chart-tooltip">
        {/* active=true: 툴팁 내용 렌더링 분기 */}
        <div data-testid="tooltip-active">
          {renderTooltip({ ...resolvedContent.props, active: true, payload: samplePayload })}
        </div>
        {/* active=false: null 반환 분기 */}
        <div data-testid="tooltip-inactive">
          {renderTooltip({ ...resolvedContent.props, active: false, payload: samplePayload }) ?? null}
        </div>
        {/* payload 빈 배열: null 반환 분기 */}
        <div data-testid="tooltip-empty-payload">
          {renderTooltip({ ...resolvedContent.props, active: true, payload: [] }) ?? null}
        </div>
      </div>
    );
  },
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
      // getAllByText — tooltip sample은 __TOOLTIP_SAMPLE__ 이므로 범례와 겹치지 않음
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

  // =====================================================================
  // 추가: getStatusLabel 오버라이드 분기 + PBL 상태 + 미지정 상태 커버리지
  // =====================================================================

  describe('getStatusLabel — 라벨 우선순위', () => {
    it('ROADMAP_DRAFTED는 오버라이드 라벨 "로드맵 작성 중"으로 표시된다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ ROADMAP_DRAFTED: 2 }}
          total={2}
        />,
      );
      expect(screen.getByText('로드맵 작성 중')).toBeInTheDocument();
    });

    it('PBL_DRAFTED는 오버라이드 라벨 "PBL 작성 중"으로 표시된다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ PBL_DRAFTED: 1 }}
          total={1}
        />,
      );
      expect(screen.getByText('PBL 작성 중')).toBeInTheDocument();
    });

    it('FINALIZED는 오버라이드 라벨 "양식 확정"으로 표시된다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ FINALIZED: 3 }}
          total={3}
        />,
      );
      // CHART_LABEL_OVERRIDES에 FINALIZED='양식 확정' 정의됨
      expect(screen.getByText('양식 확정')).toBeInTheDocument();
    });
  });

  describe('toChartData — CHART_COLORS에 없는 상태 필터링', () => {
    it('CHART_COLORS에 없는 상태는 차트 데이터에 포함되지 않는다', () => {
      // DIAGNOSED는 CHART_COLORS에 없으므로 범례에 표시 안 됨
      render(
        <StatusDistributionChart
          byStatus={{ ASSIGNED: 3, DIAGNOSED: 2 } as Record<string, number>}
          total={5}
        />,
      );
      // ASSIGNED는 표시됨
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
      // DIAGNOSED는 CHART_COLORS에 없으므로 범례에 없음
      expect(screen.queryByText('DIAGNOSED')).not.toBeInTheDocument();
    });
  });

  // =====================================================================
  // PieTooltipContent 분기 커버 (active/payload 조건)
  // =====================================================================

  describe('PieTooltipContent 분기', () => {
    const byStatus = { ASSIGNED: 3, INTERVIEWED: 2 };

    it('active=true이고 payload가 있을 때 툴팁 내용을 렌더링한다 (999건 표시)', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={5} />);
      // tooltip mock이 __TOOLTIP_SAMPLE__, 999건을 active=true로 렌더링
      const activeWrapper = screen.getByTestId('tooltip-active');
      // getStatusLabel '__TOOLTIP_SAMPLE__' → CONFIG에 없으므로 키 자체 표시
      expect(activeWrapper.textContent).toMatch(/999건/);
    });

    it('active=false이면 툴팁 내용이 없다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={5} />);
      const inactiveWrapper = screen.getByTestId('tooltip-inactive');
      expect(inactiveWrapper.textContent).toBe('');
    });

    it('payload가 빈 배열이면 툴팁 내용이 없다', () => {
      render(<StatusDistributionChart byStatus={byStatus} total={5} />);
      const emptyPayloadWrapper = screen.getByTestId('tooltip-empty-payload');
      expect(emptyPayloadWrapper.textContent).toBe('');
    });
  });

  // =====================================================================
  // getStatusLabel — CONSULTANT_PROJECT_STATUS_CONFIG 폴백 분기
  // =====================================================================

  describe('getStatusLabel — 폴백 분기', () => {
    it('PBL_DRAFTED는 CHART_LABEL_OVERRIDES에 정의된 "PBL 작성 중"을 반환한다', () => {
      render(
        <StatusDistributionChart
          byStatus={{ PBL_DRAFTED: 2 }}
          total={2}
        />,
      );
      expect(screen.getByText('PBL 작성 중')).toBeInTheDocument();
    });
  });
});
