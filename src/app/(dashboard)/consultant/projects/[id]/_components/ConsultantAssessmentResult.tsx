'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Label } from 'recharts';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  type SelfAssessmentScores,
  getScoreColor,
} from '@/lib/constants/score-color';

interface Props {
  scores: SelfAssessmentScores;
}

export function ConsultantAssessmentResult({ scores }: Props) {
  const totalScore = Math.round(scores.total_score || 0);
  const maxScore = Math.round(scores.max_possible_score || 100);
  const pct = Math.round((totalScore / maxScore) * 100);
  const totalColor = getScoreColor(pct);

  const dimensions = useMemo(
    () =>
      scores.dimension_scores?.map((ds) => {
        const score = Math.round(ds.score);
        const max = Math.round(ds.max_score);
        const dimPct = Math.round((score / max) * 100);
        return { ...ds, score, max_score: max, pct: dimPct, color: getScoreColor(dimPct) };
      }) ?? [],
    [scores.dimension_scores]
  );

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      {/* 상단: 종합 점수 막대 그래프 */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <h3 className="mb-3 text-sm font-medium text-gray-500">종합 점수</h3>
        <div className="mb-3 flex items-end gap-2">
          <span className="text-4xl font-bold text-gray-900">{totalScore}</span>
          <span className="mb-1 text-lg text-gray-400">/ {maxScore}</span>
        </div>
        <div className="mb-3 h-2.5 w-full rounded-full bg-gray-200">
          <div
            className={`h-2.5 rounded-full ${totalColor.bg} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${totalColor.light} ${totalColor.text}`}
        >
          {pct}%
        </span>
      </div>

      {/* 하단: 항목별 PieChart 일렬 */}
      {dimensions.length > 0 && (
        <div className="flex gap-2">
          {dimensions.map((ds) => {
            const config: ChartConfig = {
              score: { label: ds.dimension, color: ds.color.hex },
            };
            const data = [
              { name: 'score', value: ds.pct },
              { name: 'rest', value: 100 - ds.pct },
            ];

            return (
              <div
                key={ds.dimension}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <ChartContainer
                  config={config}
                  className="aspect-square w-full max-w-[90px]"
                >
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      innerRadius="58%"
                      outerRadius="85%"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                    >
                      <Cell fill="var(--color-score)" />
                      <Cell fill="#f3f4f6" />
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  className="fill-foreground"
                                  fontSize={14}
                                  fontWeight={700}
                                >
                                  {ds.pct}%
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <span className="mt-1 w-full truncate text-center text-xs font-medium text-gray-700">
                  {ds.dimension}
                </span>
                <span className="text-[11px] text-gray-400">
                  {ds.score}/{ds.max_score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
