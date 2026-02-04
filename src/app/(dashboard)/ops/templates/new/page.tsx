import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import TemplateForm from '../_components/TemplateForm';

export default async function NewTemplatePage() {
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
        title="새 템플릿 생성"
        description="자가진단 문항 템플릿을 생성합니다."
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로' }}
      />
      <TemplateForm mode="create" />
    </div>
  );
}
