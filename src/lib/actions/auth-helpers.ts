import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface AuthUser {
  id: string;
  email: string;
}

export type AuthSuccess = {
  user: AuthUser;
  supabase: SupabaseServerClient;
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
 * 성공 시 { user, supabase }, 실패 시 { error }를 반환합니다.
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

  return {
    user: { id: user.id, email: user.email ?? '' },
    supabase,
  };
}

/**
 * 역할 권한 검사 — users 테이블에서 역할을 조회하고 허용 목록과 비교합니다.
 */
export async function requireRole(
  supabase: SupabaseServerClient,
  userId: string,
  allowedRoles: UserRole[],
  errorMessage = '권한이 없습니다.',
): Promise<{ role: UserRole } | AuthFailure> {
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    return { error: errorMessage };
  }

  return { role: profile.role as UserRole };
}

/**
 * 인증 + 역할 검사를 한 번에 수행합니다.
 * 가장 빈번한 조합 패턴(getUser → role 조회 → 권한 비교)을 단축합니다.
 */
export async function requireAuthWithRole(
  allowedRoles: UserRole[],
  options?: { authError?: string; roleError?: string },
): Promise<RoleSuccess | AuthFailure> {
  const auth = await requireAuth(options?.authError);
  if ('error' in auth) return auth;

  const roleCheck = await requireRole(
    auth.supabase,
    auth.user.id,
    allowedRoles,
    options?.roleError,
  );
  if ('error' in roleCheck) return roleCheck;

  return { ...auth, role: roleCheck.role };
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
