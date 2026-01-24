import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
      redirect('/ops/projects');
    case 'CONSULTANT_APPROVED':
      redirect('/consultant/projects');
    case 'USER_PENDING': {
      // 컨설턴트 프로필 유무 확인
      const adminSupabase = createAdminClient();
      const { data: consultantProfile } = await adminSupabase
        .from('consultant_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      return (
        <div className="max-w-2xl mx-auto mt-8">
          <PendingApprovalCard
            userName={profile.name}
            userEmail={profile.email}
            userRole="CONSULTANT"
            hasProfile={!!consultantProfile}
          />
        </div>
      );
    }
    case 'OPS_ADMIN_PENDING':
      return (
        <div className="max-w-2xl mx-auto mt-8">
          <PendingApprovalCard
            userName={profile.name}
            userEmail={profile.email}
            userRole="OPS_ADMIN"
            hasProfile={false}
          />
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
