import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Plus } from 'lucide-react';
import ProjectManagementTabs from './_components/ProjectManagementTabs';

export default async function OPSProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 현재 사용자 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    redirect('/dashboard');
  }

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
      <ProjectManagementTabs />
    </div>
  );
}
