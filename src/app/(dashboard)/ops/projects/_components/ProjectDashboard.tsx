'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  fetchProjectStats,
  fetchMonthlyCompletions,
  fetchConsultantProgress,
  fetchStalledProjects,
  type ProjectStats,
  type MonthlyCompletion,
  type ConsultantProgress,
  type StalledProject,
} from '../actions';
import { PROJECT_STATUS_CONFIG, PROJECT_WORKFLOW_STEPS } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// 상수 정의
// ============================================================================

/** 워크플로우 단계별 차트 색상 */
const WORKFLOW_STEP_COLORS: Record<string, string> = {
  new: '#9CA3AF',        // 신규 등록 완료 - 회색
  diagnosed: '#3B82F6',  // 진단결과 입력 완료 - 파랑
  assigned: '#22C55E',   // 컨설턴트 배정 완료 - 초록
  interviewed: '#F59E0B', // 현장 인터뷰 완료 - 주황
  drafted: '#F97316',    // 로드맵 초안 완료 - 오렌지
  finalized: '#10B981',  // 로드맵 최종 확정 - 에메랄드
};

/** 컨설턴트 진행 상태 색상 */
const PROGRESS_COLORS = {
  assigned: '#F59E0B',
  interviewing: '#3B82F6',
  drafting: '#8B5CF6',
  completed: '#10B981',
} as const;

/** 진행 상태 세그먼트 순서 및 라벨 */
const PROGRESS_SEGMENTS: Array<{
  key: keyof typeof PROGRESS_COLORS;
  label: string;
}> = [
  { key: 'assigned', label: '배정대기' },
  { key: 'interviewing', label: '인터뷰' },
  { key: 'drafting', label: '로드맵작업' },
  { key: 'completed', label: '완료' },
];

/** 스켈레톤 표시 항목 수 */
const SKELETON_COUNTS = {
  chartCards: 2,
  legendItems: 4,
  consultantRows: 3,
  stalledProjectRows: 3,
} as const;

/** 스켈레톤 색상 */
const SKELETON_COLORS = {
  primary: 'bg-gray-200',
  secondary: 'bg-gray-100',
} as const;

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 대시보드 로딩 스켈레톤 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 첫 번째 행: 상태별 분포 + 월별 추이 (2컬럼) */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: SKELETON_COUNTS.chartCards }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className={`h-6 w-40 ${SKELETON_COLORS.primary} rounded`} />
            </CardHeader>
            <CardContent>
              <div className={`h-[200px] ${SKELETON_COLORS.secondary} rounded`} />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 두 번째 행: 컨설턴트별 현황 (전체 너비) */}
      <Card>
        <CardHeader className="pb-2">
          <div className={`h-6 w-48 ${SKELETON_COLORS.primary} rounded`} />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              {Array.from({ length: SKELETON_COUNTS.legendItems }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 ${SKELETON_COLORS.primary} rounded`} />
                  <div className={`h-3 w-12 ${SKELETON_COLORS.secondary} rounded`} />
                </div>
              ))}
            </div>
            {Array.from({ length: SKELETON_COUNTS.consultantRows }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className={`h-4 w-20 ${SKELETON_COLORS.primary} rounded`} />
                  <div className={`h-4 w-16 ${SKELETON_COLORS.secondary} rounded`} />
                </div>
                <div className={`h-6 ${SKELETON_COLORS.secondary} rounded-md`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* 세 번째 행: 주의 필요 프로젝트 (전체 너비) */}
      <Card>
        <CardHeader className="pb-2">
          <div className={`h-6 w-36 ${SKELETON_COLORS.primary} rounded`} />
          <div className={`h-4 w-56 ${SKELETON_COLORS.secondary} rounded mt-1`} />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: SKELETON_COUNTS.stalledProjectRows }, (_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 ${SKELETON_COLORS.primary} rounded-full`} />
                  <div>
                    <div className={`h-4 w-24 ${SKELETON_COLORS.primary} rounded mb-1`} />
                    <div className={`h-3 w-32 ${SKELETON_COLORS.secondary} rounded`} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`h-5 w-16 ${SKELETON_COLORS.primary} rounded`} />
                  <div className={`h-4 w-12 ${SKELETON_COLORS.secondary} rounded`} />
                  <div className={`h-4 w-4 ${SKELETON_COLORS.primary} rounded`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ProjectDashboard() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyCompletion[]>([]);
  const [consultantData, setConsultantData] = useState<ConsultantProgress[]>([]);
  const [stalledProjects, setStalledProjects] = useState<StalledProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchProjectStats(),
      fetchMonthlyCompletions(),
      fetchConsultantProgress(),
      fetchStalledProjects(),
    ]).then(([statsData, monthly, consultant, stalled]) => {
      setStats(statsData);
      setMonthlyData(monthly);
      setConsultantData(consultant);
      setStalledProjects(stalled);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // 파이 차트 데이터 변환 (워크플로우 단계별로 합산, 순서대로 정렬)
  const pieChartData = stats
    ? PROJECT_WORKFLOW_STEPS.map((step) => {
        // 해당 워크플로우 단계에 속한 모든 상태의 카운트 합산
        const count = step.statuses.reduce((sum, status) => {
          return sum + (stats.byStatus[status] || 0);
        }, 0);
        return {
          name: step.label,
          value: count,
          stepKey: step.key,
        };
      }).filter((item) => item.value > 0) // 0인 항목 제외
    : [];

  return (
    <div className="space-y-6">
      {/* 첫 번째 행: 상태별 분포 + 월별 추이 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 상태별 프로젝트 분포 */}
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
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
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
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}건`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieChartData.map((item) => (
                    <div
                      key={item.stepKey}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: WORKFLOW_STEP_COLORS[item.stepKey] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {item.value}건 ({stats && stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 월별 로드맵 확정 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              월별 로드맵 확정 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
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
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 두 번째 행: 컨설턴트별 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-purple-600" />
            컨설턴트별 진행 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultantData.length > 0 ? (
            <div className="space-y-4">
              {/* 범례 */}
              <div className="flex flex-wrap gap-4 text-sm">
                {PROGRESS_SEGMENTS.map((segment) => (
                  <div key={segment.key} className="flex items-center gap-1.5">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: PROGRESS_COLORS[segment.key] }}
                    />
                    <span className="text-muted-foreground">{segment.label}</span>
                  </div>
                ))}
              </div>

              {/* 컨설턴트 목록 */}
              <div className="space-y-3">
                {consultantData.map((consultant) => {
                  const maxCount = Math.max(...consultantData.map((c) => c.total));
                  const widthPercent = (consultant.total / maxCount) * 100;

                  return (
                    <div key={consultant.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{consultant.name}</span>
                        <span className="text-muted-foreground">
                          총 {consultant.total}건
                        </span>
                      </div>
                      <div className="flex h-6 overflow-hidden rounded-md bg-gray-100">
                        {PROGRESS_SEGMENTS.map((segment) => {
                          const count = consultant[segment.key];
                          if (count <= 0) return null;
                          return (
                            <div
                              key={segment.key}
                              className="flex items-center justify-center text-xs text-white"
                              style={{
                                width: `${(count / consultant.total) * widthPercent}%`,
                                backgroundColor: PROGRESS_COLORS[segment.key],
                              }}
                            >
                              {count}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              배정된 프로젝트가 있는 컨설턴트가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 세 번째 행: 주의 필요 프로젝트 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            주의 필요 프로젝트
            {stalledProjects.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stalledProjects.length}건
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            7일 이상 동일 단계에서 정체 중인 프로젝트
          </p>
        </CardHeader>
        <CardContent>
          {stalledProjects.length > 0 ? (
            <div className="space-y-2">
              {stalledProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        project.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium">{project.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.contact_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.color ||
                          'bg-gray-100'
                        }
                      >
                        {PROJECT_STATUS_CONFIG[project.status as ProjectStatus]?.label ||
                          project.status}
                      </Badge>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          project.severity === 'high'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {project.days_stalled}일 경과
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {project.assigned_consultant?.name || '미배정'}
                    </div>
                    <Link
                      href={`/ops/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
              {stalledProjects.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  외 {stalledProjects.length - 5}건 더 있음
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              정체 중인 프로젝트가 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
