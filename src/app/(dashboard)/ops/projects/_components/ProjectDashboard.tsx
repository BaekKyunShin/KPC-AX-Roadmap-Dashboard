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
import { PROJECT_STATUS_CONFIG } from '@/lib/constants/status';
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

// 상태별 차트 색상
const STATUS_COLORS: Record<ProjectStatus, string> = {
  NEW: '#9CA3AF',
  DIAGNOSED: '#3B82F6',
  MATCH_RECOMMENDED: '#8B5CF6',
  ASSIGNED: '#22C55E',
  INTERVIEWED: '#F59E0B',
  ROADMAP_DRAFTED: '#F97316',
  FINALIZED: '#10B981',
};

// 컨설턴트 진행 상태 색상
const PROGRESS_COLORS = {
  assigned: '#F59E0B',
  interviewing: '#3B82F6',
  drafting: '#8B5CF6',
  completed: '#10B981',
};

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
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 파이 차트 데이터 변환
  const pieChartData = stats
    ? Object.entries(stats.byStatus).map(([status, count]) => ({
        name: PROJECT_STATUS_CONFIG[status as ProjectStatus]?.label || status,
        value: count,
        status: status as ProjectStatus,
      }))
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
                          fill={STATUS_COLORS[entry.status]}
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
                      key={item.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[item.status] }}
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
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: PROGRESS_COLORS.assigned }} />
                  <span className="text-muted-foreground">배정대기</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: PROGRESS_COLORS.interviewing }} />
                  <span className="text-muted-foreground">인터뷰</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: PROGRESS_COLORS.drafting }} />
                  <span className="text-muted-foreground">로드맵작업</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded" style={{ backgroundColor: PROGRESS_COLORS.completed }} />
                  <span className="text-muted-foreground">완료</span>
                </div>
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
                        {consultant.assigned > 0 && (
                          <div
                            className="flex items-center justify-center text-xs text-white"
                            style={{
                              width: `${(consultant.assigned / consultant.total) * widthPercent}%`,
                              backgroundColor: PROGRESS_COLORS.assigned,
                            }}
                          >
                            {consultant.assigned}
                          </div>
                        )}
                        {consultant.interviewing > 0 && (
                          <div
                            className="flex items-center justify-center text-xs text-white"
                            style={{
                              width: `${(consultant.interviewing / consultant.total) * widthPercent}%`,
                              backgroundColor: PROGRESS_COLORS.interviewing,
                            }}
                          >
                            {consultant.interviewing}
                          </div>
                        )}
                        {consultant.drafting > 0 && (
                          <div
                            className="flex items-center justify-center text-xs text-white"
                            style={{
                              width: `${(consultant.drafting / consultant.total) * widthPercent}%`,
                              backgroundColor: PROGRESS_COLORS.drafting,
                            }}
                          >
                            {consultant.drafting}
                          </div>
                        )}
                        {consultant.completed > 0 && (
                          <div
                            className="flex items-center justify-center text-xs text-white"
                            style={{
                              width: `${(consultant.completed / consultant.total) * widthPercent}%`,
                              backgroundColor: PROGRESS_COLORS.completed,
                            }}
                          >
                            {consultant.completed}
                          </div>
                        )}
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
