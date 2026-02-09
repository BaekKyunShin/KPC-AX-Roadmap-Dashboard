import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';
import { aggregateProjectStats, formatRelativeTime } from '@/lib/utils/consultant-home';
import { SummaryCards } from './_components/SummaryCards';
import { StatusDistributionChart } from './_components/StatusDistributionChart';
import { RecentProjects, type RecentProjectItem } from './_components/RecentProjects';
import { RecentActivity, type RecentActivityItem } from './_components/RecentActivity';

/** 기업 규모 라벨을 간략화 (괄호 안의 분류만 추출) */
function shortSizeLabel(size: string): string {
  const full = COMPANY_SIZE_LABELS[size as CompanySizeValue];
  if (!full) return size;
  const match = full.match(/\((.+)\)/);
  return match ? match[1] : full;
}

export default async function ConsultantHomePage() {
  const supabase = await createClient();

  // 1. 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  // 3. 프로젝트 목록 조회
  const { data: projects } = await supabase
    .from('projects')
    .select('id, company_name, industry, company_size, status, updated_at')
    .eq('assigned_consultant_id', user.id)
    .order('updated_at', { ascending: false });

  const projectList = projects ?? [];

  // 4. 통계 집계
  const stats = aggregateProjectStats(projectList);

  // 5. 최근 프로젝트 5개
  const recentProjects: RecentProjectItem[] = projectList.slice(0, 5).map((p) => ({
    id: p.id,
    companyName: p.company_name,
    industry: p.industry,
    companySizeLabel: shortSizeLabel(p.company_size),
    status: p.status,
    relativeTime: formatRelativeTime(p.updated_at),
  }));

  // 6. 최근 활동 로그 5건
  const projectIds = projectList.map((p) => p.id);
  let recentActivities: RecentActivityItem[] = [];

  if (projectIds.length > 0) {
    const { data: logs } = await supabase
      .from('consultant_activity_logs')
      .select('id, project_id, type, content, created_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(5);

    // 프로젝트 ID → 회사명 맵
    const companyNameMap = new Map(projectList.map((p) => [p.id, p.company_name]));

    recentActivities = (logs ?? []).map((log) => ({
      id: log.id,
      projectId: log.project_id,
      companyName: companyNameMap.get(log.project_id) || '알 수 없음',
      content: log.content,
      logType: log.type,
      relativeTime: formatRelativeTime(log.created_at),
    }));
  }

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
          inProgress={stats.inProgress}
          completed={stats.completed}
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
