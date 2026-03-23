import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyCompletion } from '../actions';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

/** 차트 높이 (px) */
const CHART_HEIGHT = 200;

export default function MonthlyCompletionChart({
  data,
}: {
  data: MonthlyCompletion[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          월별 로드맵 확정 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div role="img" aria-label="월별 로드맵 확정 현황 바 차트">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data}>
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                tickLine={false}
                axisLine={false}
                height={40}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [`${value}건`, '확정']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar
                dataKey="count"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
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
