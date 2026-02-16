import { createClient } from '@/lib/supabase/server';
import type { UserRole, UserStatus } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface AuthUser {
  id: string;
  email: string;
}

export type AuthSuccess = {
  user: AuthUser;
  supabase: SupabaseServerClient;
  role: UserRole | null;
  status: UserStatus | null;
};

export type RoleSuccess = AuthSuccess & {
  role: UserRole;
};

export type AuthFailure = { error: string };

// ============================================================================
// 인증 헬퍼
// ============================================================================

/**
 * 세션 확인 — supabase 클라이언트를 생성하고 getUser()로 인증 상태를 확인합니다.
 * 성공 시 { user, supabase, role, status }, 실패 시 { error }를 반환합니다.
 * role/status는 users 테이블에서 조회하며, 행이 없으면 null입니다.
 */
export async function requireAuth(
  errorMessage = '로그인이 필요합니다.',
): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: errorMessage };
  }

  // 역할·상태 조회 (users 테이블 PK 조회 — 빠름)
  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? '' },
    supabase,
    role: (profile?.role as UserRole) ?? null,
    status: (profile?.status as UserStatus) ?? null,
  };
}

/**
 * 인증 + 역할 검사를 한 번에 수행합니다.
 * requireAuth()가 이미 role/status를 반환하므로 추가 DB 조회 없이 검증합니다.
 */
export async function requireAuthWithRole(
  allowedRoles: readonly UserRole[],
  options?: { authError?: string; roleError?: string },
): Promise<RoleSuccess | AuthFailure> {
  const auth = await requireAuth(options?.authError);
  if ('error' in auth) return auth;

  if (
    !auth.role ||
    !allowedRoles.includes(auth.role) ||
    auth.status !== 'ACTIVE'
  ) {
    return { error: options?.roleError ?? '권한이 없습니다.' };
  }

  return { ...auth, role: auth.role };
}

/**
 * 컨설턴트 로드맵 접근 검증 — roadmapId에서 프로젝트를 조회하고 배정 여부를 확인합니다.
 * 성공 시 { projectId }를 반환하여 호출부에서 활용할 수 있습니다.
 */
export async function requireConsultantRoadmapAccess(
  supabase: SupabaseServerClient,
  userId: string,
  roadmapId: string,
): Promise<{ projectId: string } | AuthFailure> {
  const { data: roadmapData } = await supabase
    .from('roadmap_versions')
    .select('project_id')
    .eq('id', roadmapId)
    .single();

  if (!roadmapData) {
    return { error: '로드맵을 찾을 수 없습니다.' };
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('assigned_consultant_id')
    .eq('id', roadmapData.project_id)
    .single();

  if (!projectData || projectData.assigned_consultant_id !== userId) {
    return { error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
  }

  return { projectId: roadmapData.project_id };
}

/**
 * 컨설턴트 프로젝트 접근 검증 — assigned_consultant_id와 userId를 비교합니다.
 */
export async function requireConsultantProjectAccess(
  supabase: SupabaseServerClient,
  userId: string,
  projectId: string,
  errorMessage = '배정되지 않은 프로젝트입니다.',
): Promise<true | AuthFailure> {
  const { data: projectData } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('assigned_consultant_id', userId)
    .single();

  if (!projectData) {
    return { error: errorMessage };
  }

  return true;
}
