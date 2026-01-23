import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PendingApprovalCard from '@/components/PendingApprovalCard';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

  if (!profile) {
    redirect('/login');
  }

  // 역할별 리다이렉트
  switch (profile.role) {
    case 'OPS_ADMIN':
    case 'SYSTEM_ADMIN':
      redirect('/ops/cases');
    case 'CONSULTANT_APPROVED':
      redirect('/consultant/cases');
    case 'USER_PENDING':
      return (
        <div className="max-w-2xl mx-auto mt-8">
          <PendingApprovalCard userName={profile.name} userEmail={profile.email} />
        </div>
      );
    default:
      return (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">환영합니다, {profile.name}님!</p>
        </div>
      );
  }
}
