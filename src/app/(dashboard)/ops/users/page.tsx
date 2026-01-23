import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UserManagementTable from '@/components/ops/UserManagementTable';

export default async function UsersPage() {
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

  // Admin 클라이언트 생성 (RLS 우회)
  const adminSupabase = createAdminClient();

  // 사용자 목록 조회 (admin 클라이언트로 RLS 우회)
  const { data: usersData, error: usersError } = await adminSupabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('[Users Query Error]', usersError);
  }

  // 컨설턴트 프로필 목록 조회 (admin 클라이언트로 RLS 우회)
  const { data: profilesData, error: profilesError } = await adminSupabase
    .from('consultant_profiles')
    .select('*');

  if (profilesError) {
    console.error('[Profiles Query Error]', profilesError);
  }

  // 프로필을 user_id로 매핑
  const profileMap = new Map(
    profilesData?.map((profile) => [profile.user_id, profile]) || []
  );

  // 사용자 데이터에 프로필 병합
  const users = usersData?.map((user) => ({
    ...user,
    consultant_profile: profileMap.get(user.id) || null,
  }));

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            컨설턴트 승인/정지 및 상태를 관리합니다.
          </p>
        </div>
      </div>

      <UserManagementTable users={users || []} />
    </div>
  );
}
