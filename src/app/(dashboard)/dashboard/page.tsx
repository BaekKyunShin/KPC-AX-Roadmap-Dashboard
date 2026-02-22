import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import PendingApprovalCard from '@/components/PendingApprovalCard';

export default async function DashboardPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile) {
    redirect('/login');
  }

  // 역할별 리다이렉트
  switch (profile.role) {
    case 'OPS_ADMIN':
    case 'SYSTEM_ADMIN':
      redirect('/ops/projects');
    case 'CONSULTANT_APPROVED':
      redirect('/consultant/home');
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
        <div className="py-12">
          <PageHeader
            title="대시보드"
            description={`환영합니다, ${profile.name}님!`}
          />
        </div>
      );
  }
}
