'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useProjectDashboard } from './useProjectDashboard';
import ConsultantProgressTable from './ConsultantProgressTable';
import StalledProjectsSection from './StalledProjectsSection';

/** 차트 카드 로딩 스켈레톤 (dynamic import용) */
function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-6 w-40 animate-shimmer rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-[200px] animate-shimmer rounded" />
      </CardContent>
    </Card>
  );
}

const StatusDistributionChart = dynamic(() => import('./StatusDistributionChart'), {
  ssr: false,
  loading: () => <ChartCardSkeleton />,
});
const MonthlyCompletionChart = dynamic(() => import('./MonthlyCompletionChart'), {
  ssr: false,
  loading: () => <ChartCardSkeleton />,
});

/** 대시보드 로딩 스켈레톤 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 차트 영역 스켈레톤 */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-6 w-40 animate-shimmer rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] animate-shimmer rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 컨설턴트 테이블 스켈레톤 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-6 w-48 animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] animate-shimmer rounded" />
        </CardContent>
      </Card>
      {/* 정체 프로젝트 스켈레톤 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-6 w-36 animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[140px] animate-shimmer rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDashboard() {
  const { stats, monthlyData, consultantData, stalledProjects, loading } =
    useProjectDashboard();

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 첫 번째 행: 상태별 분포 + 월별 추이 */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatusDistributionChart stats={stats} />
        <MonthlyCompletionChart data={monthlyData} />
      </div>

      {/* 두 번째 행: 컨설턴트별 현황 */}
      <ConsultantProgressTable data={consultantData} />

      {/* 세 번째 행: 정체 프로젝트 */}
      <StalledProjectsSection projects={stalledProjects} />
    </div>
  );
}
