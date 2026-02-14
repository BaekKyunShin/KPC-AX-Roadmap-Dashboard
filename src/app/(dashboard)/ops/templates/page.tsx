import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import TemplateList from './_components/TemplateList';
import type { TemplateWithUsage } from './_components/TemplateList';
import { fetchTemplates } from './actions';

export default async function TemplatesPage() {
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

  // 템플릿 목록 조회 (Server Action 활용)
  const result = await fetchTemplates();
  const templates = result.success ? (result.data as TemplateWithUsage[]) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="자가진단 템플릿"
        description="자가진단 문항 템플릿을 관리합니다. 활성화된 템플릿이 새 자가진단에 사용됩니다."
        actions={
          <Button asChild>
            <Link href="/ops/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              새 템플릿 생성
            </Link>
          </Button>
        }
      />
      <TemplateList templates={templates} />
    </div>
  );
}
