import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">새 템플릿 생성</h1>
        <p className="mt-1 text-sm text-gray-500">
          자가진단 문항 템플릿을 생성합니다.
        </p>
      </div>

      <TemplateForm mode="create" />
    </div>
  );
}
