import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { formatCompanySizeShort } from '@/lib/constants/company-size';
import { aggregateProjectStats, formatRelativeTime } from '@/lib/utils/consultant-home';
import { inferTrack } from '@/lib/utils/project-track';
import { SummaryCards } from './_components/SummaryCards';
import { RecentProjects, type RecentProjectItem } from './_components/RecentProjects';
import { RecentActivity, type RecentActivityItem } from './_components/RecentActivity';

const StatusDistributionChart = dynamic(
  () => import('./_components/StatusDistributionChart').then(mod => ({ default: mod.StatusDistributionChart })),
  { loading: () => <div className="h-[260px] animate-pulse rounded bg-gray-100" /> }
);

export default async function ConsultantHomePage() {
  // 인증/역할 검증은 consultant/layout.tsx에서 일괄 처리
  const user = (await getCachedUser())!;
  const profile = (await getCachedProfile())!;

  // 프로젝트 + 활동 로그 병렬 조회 (consultant_id 직접 조회로 의존성 제거)
  const supabase = await createClient();
  const [{ data: projects }, { data: logs }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, company_name, industry, company_size, status, track, updated_at')
      .eq('assigned_consultant_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('consultant_activity_logs')
      .select('id, project_id, type, content, created_at')
      .eq('consultant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const projectList = projects ?? [];

  // 통계 집계
  const stats = aggregateProjectStats(projectList);

  // 최근 프로젝트 5개
  const recentProjects: RecentProjectItem[] = projectList.slice(0, 5).map((p) => ({
    id: p.id,
    companyName: p.company_name,
    industry: p.industry,
    companySizeLabel: formatCompanySizeShort(p.company_size),
    status: p.status,
    track: inferTrack((p as { track?: string }).track),
    relativeTime: formatRelativeTime(p.updated_at),
  }));

  // 프로젝트 ID → 회사명 맵
  const companyNameMap = new Map(projectList.map((p) => [p.id, p.company_name]));

  const recentActivities: RecentActivityItem[] = (logs ?? []).map((log) => ({
    id: log.id,
    projectId: log.project_id,
    companyName: companyNameMap.get(log.project_id) || '알 수 없음',
    content: log.content,
    logType: log.type,
    relativeTime: formatRelativeTime(log.created_at),
  }));

  // 7. 이름에서 성 추출
  const displayName = profile.name;

  return (
    <div className="space-y-6">
      {/* Row 1: 인사말 + 숫자 카드 */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요, {displayName} 컨설턴트님
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            현재 담당 프로젝트 현황을 한눈에 확인하세요.
          </p>
        </div>

        <SummaryCards
          total={stats.total}
          waitingInterview={stats.waitingInterview}
          interviewDone={stats.interviewDone}
          draftingRoadmap={stats.draftingRoadmap}
          roadmapCompleted={stats.roadmapCompleted}
        />
      </div>

      {/* Row 2: 상태 분포 차트 + 최근 프로젝트 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 프로젝트 상태 분포 (2col) */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">프로젝트 상태 분포</h2>
          <StatusDistributionChart byStatus={stats.byStatus} total={stats.total} />
        </div>

        {/* 최근 프로젝트 (3col) */}
        <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 프로젝트</h2>
            <Link
              href="/consultant/projects"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              전체 보기 &rarr;
            </Link>
          </div>
          <RecentProjects projects={recentProjects} />
        </div>
      </div>

      {/* Row 3: 최근 활동 (풀 너비) */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
        </div>
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  );
}
