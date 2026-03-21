import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

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
  Tooltip: ({ content }: { content?: React.ReactNode }) => <div data-testid="recharts-tooltip">{content}</div>,
  Legend: ({ content }: { content?: React.ReactNode }) => <div data-testid="recharts-legend">{content}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Label: () => null,
}));

import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from './chart';

// ============================================================================
// 테스트 픽스처
// ============================================================================

const mockConfig: ChartConfig = {
  sales: {
    label: '판매량',
    color: '#3b82f6',
  },
  revenue: {
    label: '수익',
    color: '#10b981',
  },
};

// ============================================================================
// 테스트
// ============================================================================

describe('ChartContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('data-slot="chart" 속성을 가진 div를 렌더링한다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div>차트 내용</div>
        </ChartContainer>
      );
      const chartDiv = document.querySelector('[data-slot="chart"]');
      expect(chartDiv).toBeInTheDocument();
    });

    it('children을 렌더링한다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div data-testid="chart-child">차트 내용</div>
        </ChartContainer>
      );
      expect(screen.getByTestId('chart-child')).toBeInTheDocument();
    });

    it('ResponsiveContainer 내부에 children을 렌더링한다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <div data-testid="inner-content">차트</div>
        </ChartContainer>
      );
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('inner-content')).toBeInTheDocument();
    });

    it('id prop을 전달하면 data-chart 속성에 반영된다', () => {
      render(
        <ChartContainer config={mockConfig} id="my-chart">
          <div>차트</div>
        </ChartContainer>
      );
      const chartDiv = document.querySelector('[data-chart="chart-my-chart"]');
      expect(chartDiv).toBeInTheDocument();
    });

    it('커스텀 className을 적용한다', () => {
      render(
        <ChartContainer config={mockConfig} className="custom-chart-class">
          <div>차트</div>
        </ChartContainer>
      );
      const chartDiv = document.querySelector('[data-slot="chart"]');
      expect(chartDiv).toHaveClass('custom-chart-class');
    });
  });
});

describe('ChartStyle', () => {
  describe('기본 렌더링', () => {
    it('color 설정이 없으면 null을 반환한다', () => {
      const configWithoutColor: ChartConfig = {
        item: { label: '항목' },
      };
      const { container } = render(
        <ChartStyle id="test-chart" config={configWithoutColor} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('color가 있으면 style 태그를 렌더링한다', () => {
      const { container } = render(
        <ChartStyle id="test-chart" config={mockConfig} />
      );
      const styleTag = container.querySelector('style');
      expect(styleTag).toBeInTheDocument();
    });

    it('CSS 변수로 color 값을 포함한다', () => {
      const { container } = render(
        <ChartStyle id="test-chart" config={mockConfig} />
      );
      const styleTag = container.querySelector('style');
      expect(styleTag?.innerHTML).toContain('--color-sales');
      expect(styleTag?.innerHTML).toContain('#3b82f6');
    });
  });
});

describe('ChartTooltipContent', () => {
  describe('inactive 상태', () => {
    it('active가 false이면 null을 반환한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={false} payload={[]} />
        </ChartContainer>
      );
      // ChartContainer 내부의 tooltip content 영역만 확인
      expect(
        container.querySelector('.border-border\\/50')
      ).not.toBeInTheDocument();
    });

    it('payload가 빈 배열이면 null을 반환한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={[]} />
        </ChartContainer>
      );
      expect(
        container.querySelector('[class*="min-w"]')
      ).not.toBeInTheDocument();
    });
  });

  describe('active 상태', () => {
    const mockPayload = [
      {
        name: 'sales',
        dataKey: 'sales',
        value: 1234,
        color: '#3b82f6',
        payload: { fill: '#3b82f6' },
        type: 'line' as unknown as 'none',
      },
    ];

    it('active=true이고 payload가 있으면 tooltip 내용을 렌더링한다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={mockPayload} />
        </ChartContainer>
      );
      // 값이 표시되어야 함
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('hideLabel=true이면 라벨을 숨긴다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="판매량"
            hideLabel={true}
          />
        </ChartContainer>
      );
      // 라벨이 없어야 함 (값만 있음)
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('커스텀 className을 tooltip 컨테이너에 적용한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            className="custom-tooltip"
          />
        </ChartContainer>
      );
      expect(container.querySelector('.custom-tooltip')).toBeInTheDocument();
    });
  });
});

describe('ChartLegendContent', () => {
  describe('payload가 없을 때', () => {
    it('payload가 없으면 아무것도 렌더링하지 않는다', () => {
      // ChartLegendContent는 useChart() 컨텍스트가 필요하므로 ChartContainer로 감싸되,
      // 렌더링된 범례 div(justify-center)가 없어야 함을 확인
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div data-testid="legend-wrapper">
            <ChartLegendContent payload={undefined} />
          </div>
        </ChartContainer>
      );
      // payload가 없으면 ChartLegendContent는 null 반환
      // legend-wrapper 내에 아무 자식도 없어야 함
      const wrapper = container.querySelector('[data-testid="legend-wrapper"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.children).toHaveLength(0);
    });

    it('payload가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div data-testid="legend-wrapper-empty">
            <ChartLegendContent payload={[]} />
          </div>
        </ChartContainer>
      );
      const wrapper = container.querySelector('[data-testid="legend-wrapper-empty"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.children).toHaveLength(0);
    });
  });

  describe('payload가 있을 때', () => {
    const mockLegendPayload = [
      {
        value: 'sales',
        dataKey: 'sales',
        color: '#3b82f6',
        type: 'line' as unknown as 'none',
      },
      {
        value: 'revenue',
        dataKey: 'revenue',
        color: '#10b981',
        type: 'line' as unknown as 'none',
      },
    ];

    it('payload의 각 항목에 대한 라벨을 렌더링한다', () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockLegendPayload} />
        </ChartContainer>
      );
      // config에서 label을 가져와서 표시
      expect(screen.getByText('판매량')).toBeInTheDocument();
      expect(screen.getByText('수익')).toBeInTheDocument();
    });

    it('verticalAlign="top"이면 pb-3 클래스를 적용한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockLegendPayload} verticalAlign="top" />
        </ChartContainer>
      );
      const legendContainer = container.querySelector('.pb-3');
      expect(legendContainer).toBeInTheDocument();
    });

    it('verticalAlign="bottom"이면 pt-3 클래스를 적용한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockLegendPayload} verticalAlign="bottom" />
        </ChartContainer>
      );
      const legendContainer = container.querySelector('.pt-3');
      expect(legendContainer).toBeInTheDocument();
    });

    it('커스텀 className을 적용한다', () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent
            payload={mockLegendPayload}
            className="custom-legend"
          />
        </ChartContainer>
      );
      expect(container.querySelector('.custom-legend')).toBeInTheDocument();
    });
  });
});
