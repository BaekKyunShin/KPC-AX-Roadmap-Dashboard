import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  // 사용자 목록 조회
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      consultant_profile:consultant_profiles(*)
    `)
    .order('created_at', { ascending: false });

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
