'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Label } from 'recharts';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface StatusDistributionChartProps {
  byStatus: Record<string, number>;
  total: number;
}

const CHART_COLORS: Record<string, string> = {
  ASSIGNED: '#3B82F6',        // blue-500
  INTERVIEWED: '#14B8A6',     // teal-500
  ROADMAP_DRAFTED: '#8B5CF6', // violet-500
  FINALIZED: '#10B981',       // emerald-500
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '배정됨',
  INTERVIEWED: '인터뷰 완료',
  ROADMAP_DRAFTED: '초안 작성',
  FINALIZED: '확정',
};

/** byStatus Record를 차트 데이터로 변환 */
function toChartData(byStatus: Record<string, number>): ChartDataItem[] {
  const order = ['ASSIGNED', 'INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED'];
  return order
    .filter((status) => (byStatus[status] || 0) > 0)
    .map((status) => ({
      name: status,
      value: byStatus[status],
      color: CHART_COLORS[status] || '#9CA3AF',
    }));
}

export function StatusDistributionChart({ byStatus, total }: StatusDistributionChartProps) {
  const data = useMemo(() => toChartData(byStatus), [byStatus]);

  const config = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    for (const item of data) {
      cfg[item.name] = { label: STATUS_LABELS[item.name] || item.name, color: item.color };
    }
    return cfg;
  }, [data]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        배정된 프로젝트가 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* 도넛 차트 */}
      <div className="flex items-center justify-center mb-5">
        <ChartContainer config={config} className="aspect-square w-full max-w-[180px]">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} dy="-0.3em" className="fill-foreground" fontSize={26} fontWeight={700}>
                          {total}
                        </tspan>
                        <tspan x={viewBox.cx} dy="1.4em" fill="#6B7280" fontSize={12}>
                          총 프로젝트
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      {/* 범례 */}
      <div className="space-y-2.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600">{STATUS_LABELS[item.name] || item.name}</span>
            </div>
            <span className="font-medium text-gray-900">{item.value}건</span>
          </div>
        ))}
      </div>
    </div>
  );
}
