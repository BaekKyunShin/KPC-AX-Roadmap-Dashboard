import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import ProjectManagementTabs from './_components/ProjectManagementTabs';
import { fetchProjectStats } from './actions/dashboard';
import { fetchProjectsWithTimeline } from './actions/queries';
import { isOpsManager, getStatusesByFilterKey } from '@/lib/constants/status';

/**
 * 운영관리 > 프로젝트 관리
 *
 * 북마크·공유 링크(`?industry=IT%2FSW`, `?status=finalized&page=2`)로 진입할 수 있으므로
 * Server Component 단계에서 searchParams 를 읽어 `fetchProjectsWithTimeline` 에 전달해야 한다.
 *
 * 주의: `ProjectList` 는 initialData 가 있으면 초기 마운트 fetch 를 skip 하므로,
 * 여기서 필터를 반영하지 않으면 '드롭다운은 선택돼 있는데 목록은 전체'가 되는
 * 불일치가 생긴다(consultant/projects/page.tsx 와 동일한 제약).
 *
 * 주의: URL 의 status 값은 ProjectStatus 가 아니라 워크플로 단계 키다
 * (예: 'diagnosed' → ['DIAGNOSED','MATCH_RECOMMENDED']). 반드시
 * getStatusesByFilterKey 로 변환해 statuses 로 넘긴다. 단계 키를 그대로
 * status 에 넘기면 .eq('status','diagnosed') 가 되어 항상 0건이 된다.
 */
export default async function OPSProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : '';

  // 'all' 은 클라이언트 드롭다운의 '전체' 값 — 필터 미적용과 같다.
  const industryParam = typeof params.industry === 'string' ? params.industry : '';
  const industry = industryParam === 'all' ? '' : industryParam;

  // 워크플로 단계 키 → 실제 상태 배열. 알 수 없는 키면 undefined(전체 표시).
  const statusKey = typeof params.status === 'string' ? params.status : '';
  const statuses = statusKey ? getStatusesByFilterKey(statusKey) : undefined;

  // 잘못된 page 값을 그대로 넘기면 range(NaN, NaN) 으로 조회가 실패한다.
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  // Server Component에서 데이터 프리페치 — 클라이언트 useEffect 워터폴 제거
  const [initialStats, initialProjectsResult] = await Promise.all([
    fetchProjectStats(),
    fetchProjectsWithTimeline({ page, limit: 10, search, industry, statuses }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="프로젝트 관리"
        description="기업 프로젝트를 생성하고 관리합니다."
        actions={
          <Button asChild>
            <Link href="/ops/projects/new">
              <Plus className="mr-2 h-4 w-4" />새 프로젝트 생성
            </Link>
          </Button>
        }
      />

      {/* Stats + Tabs */}
      <ProjectManagementTabs initialStats={initialStats} initialProjects={initialProjectsResult} />
    </div>
  );
}
