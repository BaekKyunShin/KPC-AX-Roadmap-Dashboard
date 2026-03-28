import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
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
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  const isAllowedRole =
    profile && ALLOWED_ROLES.includes(profile.role as (typeof ALLOWED_ROLES)[number]);

  if (!isAllowedRole) {
    redirect('/dashboard');
  }

  const isSystemAdmin = profile.role === 'SYSTEM_ADMIN';
  const targetRoles = isSystemAdmin ? SYSTEM_ADMIN_MANAGEABLE_ROLES : OPS_ADMIN_MANAGEABLE_ROLES;

  // Admin 클라이언트 생성 (RLS 우회)
  const adminSupabase = createAdminClient();

  // 사용자 + 프로필 병렬 조회
  const [
    { data: usersData, error: usersError },
    { data: profilesData, error: profilesError },
  ] = await Promise.all([
    adminSupabase
      .from('users')
      .select('id, email, name, role, status, phone, created_at, updated_at')
      .in('role', targetRoles)
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('consultant_profiles')
      .select('id, user_id, expertise_domains, available_industries, sub_industries, teaching_levels, coaching_methods, skill_tags, years_of_experience, affiliation, representative_experience, portfolio, strengths_constraints, created_at, updated_at'),
  ]);

  if (usersError) {
    console.error('[Users Query Error]', usersError);
  }
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
