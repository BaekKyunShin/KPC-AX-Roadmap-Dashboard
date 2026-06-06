import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isOpsManager } from '@/lib/constants/status';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import TemplateList from './_components/TemplateList';
import type { TemplateWithUsage } from './_components/TemplateList';
import { fetchTemplates } from './actions';

export default async function TemplatesPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
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
              <Plus className="mr-2 h-4 w-4" />새 템플릿 생성
            </Link>
          </Button>
        }
      />
      <TemplateList templates={templates} />
    </div>
  );
}
