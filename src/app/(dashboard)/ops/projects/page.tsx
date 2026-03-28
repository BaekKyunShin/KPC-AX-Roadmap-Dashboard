import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import ProjectManagementTabs from './_components/ProjectManagementTabs';
import { fetchProjectStats } from './actions/dashboard';
import { fetchProjectsWithTimeline } from './actions/queries';

export default async function OPSProjectsPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Server Component에서 데이터 프리페치 — 클라이언트 useEffect 워터폴 제거
  const [initialStats, initialProjectsResult] = await Promise.all([
    fetchProjectStats(),
    fetchProjectsWithTimeline({ page: 1, limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="프로젝트 관리"
        description="기업 프로젝트를 생성하고 관리합니다."
        actions={
          <Button asChild>
            <Link href="/ops/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              새 프로젝트 생성
            </Link>
          </Button>
        }
      />

      {/* Stats + Tabs */}
      <ProjectManagementTabs
        initialStats={initialStats}
        initialProjects={initialProjectsResult}
      />
    </div>
  );
}
