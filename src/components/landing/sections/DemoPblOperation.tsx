'use client';

import { Target, TrendingUp, Wrench, BookOpen } from 'lucide-react';
import type { PBLOperationPlan } from '@/lib/services/pbl/pbl-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// 타입
// ============================================================================

interface DemoPblOperationProps {
  operation: PBLOperationPlan;
}

// ============================================================================
// 컴포넌트 — 랜딩 데모 전용 PBL 운영계획 요약 렌더
// ----------------------------------------------------------------------------
// result-v2 탭 컴포넌트를 재사용하지 않고, CoursesList 와 동일한 라이트 테마
// 디자인 토큰(Card·border-border·muted)으로 컴팩트하게 표현한다. 랜딩에서만 쓰며
// PBLOperationPlan 의 일부(훈련 목표·성과지표·AI 도구 활용·교과목)만 렌더링한다.
// ============================================================================

export function DemoPblOperation({ operation }: DemoPblOperationProps) {
  const { training_goal, outcome_metrics, ai_tool_usage_plan } = operation;
  const subject = operation.training_plan.subject_profile;

  return (
    <div className="space-y-4 break-keep break-words">
      {/* 헤더: 과정명 + PBL 배지 */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
          PBL 운영계획
        </Badge>
        <h3 className="text-base font-semibold text-foreground">{subject.course_name}</h3>
        <span className="text-xs text-muted-foreground">총 {subject.total_hours}H</span>
      </div>

      {/* 헤더 카드: 훈련 목표 + 성과지표 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="gap-3 py-4 shadow-sm">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-purple-500" />
              훈련 목표
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{training_goal}</p>
          </CardContent>
        </Card>

        <Card className="gap-3 py-4 shadow-sm">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              성과지표
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            <div className="flex flex-wrap gap-1.5">
              {outcome_metrics.selected_goals.map((goal) => (
                <Badge key={goal} variant="outline" className="text-xs">
                  {goal}
                </Badge>
              ))}
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-foreground">정량</dt>
                <dd className="text-muted-foreground">{outcome_metrics.quantitative}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-foreground">정성</dt>
                <dd className="text-muted-foreground">{outcome_metrics.qualitative}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* AI 도구 활용 계획 표 */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Wrench className="h-4 w-4 text-indigo-500" />
          AI 도구 활용 계획
        </h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="w-[72px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  단계
                </th>
                <th
                  scope="col"
                  className="w-[104px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  주요 활동
                </th>
                <th
                  scope="col"
                  className="w-[168px] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  AI 도구
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  활용 목적
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {ai_tool_usage_plan.map((item) => (
                <tr key={item.stage} className="align-top">
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">
                    {item.stage}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.main_activity}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {item.ai_tools.map((tool) => (
                        <Badge key={tool} variant="secondary" className="text-[11px]">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 교과목 구성 요약 */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          교과목 구성
        </h4>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {subject.training_contents.map((content) => (
            <li
              key={content.unit_name}
              className="flex items-start justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{content.unit_name}</p>
                <p className="text-xs text-muted-foreground">{content.detail}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {content.training_hours}H
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
