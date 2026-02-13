import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectStats } from '../actions';
import { PROJECT_WORKFLOW_STEPS } from '@/lib/constants/status';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

/** 파이 차트 데이터 항목 */
interface PieChartDataItem {
  name: string;
  value: number;
  stepKey: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 워크플로우 단계별 차트 색상 */
const WORKFLOW_STEP_COLORS: Record<string, string> = {
  new: '#9CA3AF',
  diagnosed: '#3B82F6',
  assigned: '#22C55E',
  interviewed: '#F59E0B',
  drafted: '#F97316',
  finalized: '#10B981',
} as const;

/** 차트 높이 (px) */
const CHART_HEIGHT = 200;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 프로젝트 통계를 파이 차트 데이터로 변환
 */
function transformToPieChartData(stats: ProjectStats): PieChartDataItem[] {
  return PROJECT_WORKFLOW_STEPS.map((step) => {
    const count = step.statuses.reduce((sum, status) => {
      return sum + (stats.byStatus[status] || 0);
    }, 0);
    return {
      name: step.label,
      value: count,
      stepKey: step.key,
    };
  }).filter((item) => item.value > 0);
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 도넛 차트 중앙 라벨 */
function DonutCenterLabel({ total }: { total: number }) {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-foreground"
    >
      <tspan x="50%" dy="-0.5em" className="text-2xl font-bold">
        {total}
      </tspan>
      <tspan x="50%" dy="1.4em" className="text-xs fill-muted-foreground">
        전체 프로젝트
      </tspan>
    </text>
  );
}

/** 상태별 분포 차트 범례 항목 */
function ChartLegendItem({
  item,
  total,
}: {
  item: PieChartDataItem;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: WORKFLOW_STEP_COLORS[item.stepKey] }}
        />
        <span className="text-muted-foreground">{item.name}</span>
      </div>
      <span className="font-medium tabular-nums">
        {item.value}건 ({percentage}%)
      </span>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function StatusDistributionChart({
  stats,
}: {
  stats: ProjectStats | null;
}) {
  const pieChartData = stats ? transformToPieChartData(stats) : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          상태별 프로젝트 분포
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pieChartData.length > 0 ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={CHART_HEIGHT}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={WORKFLOW_STEP_COLORS[entry.stepKey]}
                    />
                  ))}
                  <Label
                    content={<DonutCenterLabel total={stats?.total || 0} />}
                    position="center"
                  />
                </Pie>
                <Tooltip formatter={(value) => [`${value}건`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {pieChartData.map((item) => (
                <ChartLegendItem
                  key={item.stepKey}
                  item={item}
                  total={stats?.total || 0}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-muted-foreground h-48">
            데이터가 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
