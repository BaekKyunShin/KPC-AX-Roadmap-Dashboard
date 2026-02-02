import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UserManagementTable from '@/components/ops/UserManagementTable';

// =============================================================================
// Constants
// =============================================================================

/** 이 페이지에 접근 가능한 역할 */
const ALLOWED_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/** 운영관리자가 관리할 수 있는 역할 (컨설턴트만) */
const OPS_ADMIN_TARGET_ROLES = ['USER_PENDING', 'CONSULTANT_APPROVED'] as const;

/** 시스템관리자가 관리할 수 있는 역할 (컨설턴트 + 운영관리자) */
const SYSTEM_ADMIN_TARGET_ROLES = [
  ...OPS_ADMIN_TARGET_ROLES,
  'OPS_ADMIN',
] as const;

const PAGE_DESCRIPTIONS = {
  SYSTEM_ADMIN: '컨설턴트 및 운영관리자의 승인/정지 및 상태를 관리합니다.',
  OPS_ADMIN: '컨설턴트 승인/정지 및 상태를 관리합니다.',
} as const;

// =============================================================================
// Page Component
// =============================================================================

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

  const isAllowedRole =
    currentUser && ALLOWED_ROLES.includes(currentUser.role as (typeof ALLOWED_ROLES)[number]);

  if (!isAllowedRole) {
    redirect('/dashboard');
  }

  const isSystemAdmin = currentUser.role === 'SYSTEM_ADMIN';
  const targetRoles = isSystemAdmin ? SYSTEM_ADMIN_TARGET_ROLES : OPS_ADMIN_TARGET_ROLES;

  // Admin 클라이언트 생성 (RLS 우회)
  const adminSupabase = createAdminClient();

  // 사용자 목록 조회 (admin 클라이언트로 RLS 우회)
  const { data: usersData, error: usersError } = await adminSupabase
    .from('users')
    .select('*')
    .in('role', targetRoles)
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

  const pageDescription = isSystemAdmin
    ? PAGE_DESCRIPTIONS.SYSTEM_ADMIN
    : PAGE_DESCRIPTIONS.OPS_ADMIN;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">{pageDescription}</p>
        </div>
      </div>

      <UserManagementTable users={users || []} />
    </div>
  );
}
