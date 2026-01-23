import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TemplateForm from '../_components/TemplateForm';
import TemplatePreview from '../_components/TemplatePreview';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // 템플릿 조회
  const { data: template, error } = await supabase
    .from('self_assessment_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !template) {
    notFound();
  }

  // 사용 현황 조회
  const { count: usageCount } = await supabase
    .from('self_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', id);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              템플릿 상세 - v{template.version}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {template.name}
              {template.is_active && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  활성
                </span>
              )}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            사용 현황: <span className="font-medium">{usageCount || 0}건</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">템플릿 편집</h2>
          <TemplateForm
            mode="edit"
            template={template}
            isInUse={(usageCount || 0) > 0}
          />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">미리보기</h2>
          <TemplatePreview template={template} />
        </div>
      </div>
    </div>
  );
}
