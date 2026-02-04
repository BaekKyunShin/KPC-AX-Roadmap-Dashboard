import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import TemplateList from './_components/TemplateList';

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

  // 템플릿 목록 조회
  const { data: templates } = await supabase
    .from('self_assessment_templates')
    .select('*')
    .order('version', { ascending: false });

  // 각 템플릿의 사용 현황 조회
  const templatesWithUsage = await Promise.all(
    (templates || []).map(async (template) => {
      const { count } = await supabase
        .from('self_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', template.id);
      return { ...template, usage_count: count || 0 };
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="자가진단 템플릿 관리"
        description="자가진단 문항 템플릿을 관리합니다. 활성화된 템플릿이 새 자가진단에 사용됩니다."
        actions={
          <Link
            href="/ops/templates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 새 템플릿 생성
          </Link>
        }
      />
      <TemplateList templates={templatesWithUsage} />
    </div>
  );
}
