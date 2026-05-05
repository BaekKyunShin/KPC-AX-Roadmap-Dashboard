import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createAdminClient } from '@/lib/supabase/admin';
import UserManagementTable from '@/components/ops/UserManagementTable';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  OPS_ADMIN_MANAGEABLE_ROLES,
  SYSTEM_ADMIN_MANAGEABLE_ROLES,
} from '@/lib/constants/status';
import { RefreshButton } from './_components/RefreshButton';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

// =============================================================================
// Constants
// =============================================================================

/** 이 페이지에 접근 가능한 역할 */
const ALLOWED_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

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

  if (usersError || profilesError) {
    // 운영팀 추적용 로깅 — 기존 동작 유지
    if (usersError) console.error('[Users Query Error]', usersError);
    if (profilesError) console.error('[Profiles Query Error]', profilesError);

    return (
      <div className="space-y-6">
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <EmptyState
          icon={<AlertTriangle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-amber-500" />}
          title="사용자 데이터를 불러올 수 없습니다"
          description="잠시 후 다시 시도해주세요. 계속되면 운영팀에 문의해주세요."
          action={<RefreshButton />}
        />
      </div>
    );
  }

  // 프로필을 user_id로 매핑
  const profileMap = new Map(
    profilesData?.map((profile) => [profile.user_id, profile]) || []
  );

  // 사용자 데이터에 프로필 병합
  const managedUsers = (usersData ?? []).map((u) => ({
    ...u,
    consultant_profile: profileMap.get(u.id) || null,
  }));

  // #003 — 본인(OPS_ADMIN/SYSTEM_ADMIN) 행을 목록 맨 앞에 명시적으로 추가.
  // SYSTEM_ADMIN 이 OPS_ADMIN 본인을 보는 경우는 targetRoles 에 이미 포함될 수 있으므로
  // 중복 제거.
  const { data: selfUserRow } = await adminSupabase
    .from('users')
    .select('id, email, name, role, status, phone, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  const users = selfUserRow
    ? [
        { ...selfUserRow, consultant_profile: profileMap.get(selfUserRow.id) || null },
        ...managedUsers.filter((u) => u.id !== selfUserRow.id),
      ]
    : managedUsers;

  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <UserManagementTable users={users} currentUserId={user.id} />
    </div>
  );
}
