import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UserManagementTable from '@/components/ops/UserManagementTable';
import { PageHeader } from '@/components/ui/page-header';
import {
  OPS_ADMIN_MANAGEABLE_ROLES,
  SYSTEM_ADMIN_MANAGEABLE_ROLES,
} from '@/lib/constants/status';

// =============================================================================
// Constants
// =============================================================================

/** 이 페이지에 접근 가능한 역할 */
const ALLOWED_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/** 페이지 설명 (로딩 상태와 일관성 유지를 위해 통일) */
const PAGE_DESCRIPTION = '컨설턴트 승인/정지 및 상태를 관리합니다.';

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
  const targetRoles = isSystemAdmin ? SYSTEM_ADMIN_MANAGEABLE_ROLES : OPS_ADMIN_MANAGEABLE_ROLES;

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

  return (
    <div className="space-y-6">
      <PageHeader title="사용자 관리" description={PAGE_DESCRIPTION} />
      <UserManagementTable users={users || []} />
    </div>
  );
}
