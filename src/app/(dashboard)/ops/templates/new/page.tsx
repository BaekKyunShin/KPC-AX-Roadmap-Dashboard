import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/server';
import { isOpsManager } from '@/lib/constants/status';
import { PageHeader } from '@/components/ui/page-header';
import { TemplateFormSkeleton } from '@/components/ui/Skeleton';

const TemplateForm = dynamic(() => import('../_components/TemplateForm'), {
  loading: () => <TemplateFormSkeleton questionCount={1} />,
});

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

  if (!currentUser || !isOpsManager(currentUser.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="새 템플릿 생성"
        description="자가진단 문항 템플릿을 생성합니다."
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로', useBack: true }}
      />
      <TemplateForm mode="create" />
    </div>
  );
}
