'use client';

import { PieChart, Pie, Cell, Label } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { CONSULTANT_PROJECT_STATUS_CONFIG } from '@/lib/constants/status';

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface StatusDistributionChartProps {
  byStatus: Record<string, number>;
  total: number;
}

/** 차트 전용 hex 색상 (KPI/차트용 -400톤) — 순서가 곧 표시 순서 */
const CHART_COLORS: Record<string, string> = {
  ASSIGNED: '#60A5FA',        // blue-400
  INTERVIEWED: '#FBBF24',     // amber-400
  ROADMAP_DRAFTED: '#A78BFA', // purple-400
  FINALIZED: '#4ADE80',       // green-400
};

/** byStatus Record를 차트 데이터로 변환 */
function toChartData(byStatus: Record<string, number>): ChartDataItem[] {
  return Object.keys(CHART_COLORS)
    .filter((status) => (byStatus[status] || 0) > 0)
    .map((status) => ({
      name: status,
      value: byStatus[status],
      color: CHART_COLORS[status],
    }));
}

/** 상태 키 → 한글 라벨 (CONSULTANT_PROJECT_STATUS_CONFIG에서 파생) */
function getStatusLabel(statusKey: string): string {
  return CONSULTANT_PROJECT_STATUS_CONFIG[statusKey]?.label || statusKey;
}

export function StatusDistributionChart({ byStatus, total }: StatusDistributionChartProps) {
  const data = toChartData(byStatus);

  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [item.name, { label: getStatusLabel(item.name), color: item.color }]),
  );

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
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as ChartDataItem;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{getStatusLabel(item.name)}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {item.value}건
                      </span>
                    </div>
                  </div>
                );
              }}
            />
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
              <span className="text-gray-600">{getStatusLabel(item.name)}</span>
            </div>
            <span className="font-medium text-gray-900">{item.value}건</span>
          </div>
        ))}
      </div>
    </div>
  );
}
