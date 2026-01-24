import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProjectList from './_components/ProjectList';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <FolderKanban className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="text-base text-muted-foreground">기업 프로젝트를 생성하고 관리합니다</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/ops/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트 생성
          </Link>
        </Button>
      </div>

      {/* Project List */}
      <ProjectList />
    </div>
  );
}
