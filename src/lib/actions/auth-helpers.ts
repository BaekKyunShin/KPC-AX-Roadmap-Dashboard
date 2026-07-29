import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isOpsManager } from '@/lib/constants/status';
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
 * 세션 확인 — getCachedUser/getCachedProfile로 인증 상태를 확인합니다.
 * 성공 시 { user, supabase, role, status }, 실패 시 { error }를 반환합니다.
 * role/status는 캐시된 프로필에서 가져오며, 행이 없으면 null입니다.
 */
export async function requireAuth(
  errorMessage = '로그인이 필요합니다.'
): Promise<AuthSuccess | AuthFailure> {
  const user = await getCachedUser();
  if (!user) {
    return { error: errorMessage };
  }

  const profile = await getCachedProfile();
  const supabase = await createClient();

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
  options?: { authError?: string; roleError?: string }
): Promise<RoleSuccess | AuthFailure> {
  const auth = await requireAuth(options?.authError);
  if ('error' in auth) return auth;

  if (!auth.role || !allowedRoles.includes(auth.role) || auth.status !== 'ACTIVE') {
    return { error: options?.roleError ?? '권한이 없습니다.' };
  }

  return { ...auth, role: auth.role };
}

/**
 * 행정 종결(projects.closed_at NOT NULL)된 프로젝트의 컨설턴트 mutation 차단 메시지.
 * 잠금 판정은 status가 아니라 closed_at 기준 — 정식 확정(FINALIZED + 메타 NULL)
 * 프로젝트의 기존 동작(새 DRAFT 생성·재확정·편집)은 불변이다.
 */
export const PROJECT_CLOSED_ERROR = '종결된 프로젝트는 수정할 수 없습니다.';

/**
 * 컨설턴트 로드맵 접근 검증 — roadmapId에서 프로젝트를 조회하고 배정 여부를 확인합니다.
 * 성공 시 { projectId }를 반환하여 호출부에서 활용할 수 있습니다.
 *
 * 이 헬퍼는 mutation 게이트웨이 — 행정 종결 프로젝트는 기본 차단합니다.
 * 열람·내보내기 경로만 { allowClosed: true }로 명시적으로 허용하세요.
 */

interface RoadmapAccessRow {
  project_id: string;
  projects: { assigned_consultant_id: string; closed_at: string | null };
}

export async function requireConsultantRoadmapAccess(
  supabase: SupabaseServerClient,
  userId: string,
  roadmapId: string,
  options?: { allowClosed?: boolean }
): Promise<{ projectId: string } | AuthFailure> {
  const { data } = await supabase
    .from('roadmap_versions')
    .select('project_id, projects!inner(assigned_consultant_id, closed_at)')
    .eq('id', roadmapId)
    .returns<RoadmapAccessRow[]>()
    .single();

  if (!data) {
    return { error: '로드맵을 찾을 수 없습니다.' };
  }

  if (data.projects.assigned_consultant_id !== userId) {
    return { error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
  }

  if (!options?.allowClosed && data.projects.closed_at != null) {
    return { error: PROJECT_CLOSED_ERROR };
  }

  return { projectId: data.project_id };
}

/**
 * 컨설턴트 프로젝트 접근 검증 — assigned_consultant_id와 userId를 비교합니다.
 *
 * 저수준 배정 검증 헬퍼 — 기본은 행정 종결 여부를 판정하지 않습니다(열람 경로 호환).
 * mutation 호출부는 { blockClosed: true }로 종결 차단을 명시적으로 켜세요.
 */
export async function requireConsultantProjectAccess(
  supabase: SupabaseServerClient,
  userId: string,
  projectId: string,
  errorMessage = '배정되지 않은 프로젝트입니다.',
  options?: { blockClosed?: boolean }
): Promise<true | AuthFailure> {
  const { data: projectData } = await supabase
    .from('projects')
    .select('id, closed_at')
    .eq('id', projectId)
    .eq('assigned_consultant_id', userId)
    .single();

  if (!projectData) {
    return { error: errorMessage };
  }

  if (options?.blockClosed && projectData.closed_at != null) {
    return { error: PROJECT_CLOSED_ERROR };
  }

  return true;
}

/**
 * 프로젝트 산출물(로드맵·PBL) 접근 인가 판정 — 순수 함수(DB 조회 없음).
 *
 * - 컨설턴트(CONSULTANT_APPROVED): 본인에게 배정된 프로젝트만 접근 가능
 * - 운영/시스템관리자(OPS_ADMIN/SYSTEM_ADMIN): 배정 무관 전체 접근
 * - 그 외 역할: 불가
 *
 * track('PBL'/'ROADMAP')·프로젝트 상태(EXPORT_ELIGIBLE 등) 같은 부가 조건은
 * 이 함수가 다루지 않는다 — '누가 접근하는가'만 판정하므로 호출부에서 별도 검사한다.
 * `assignedConsultantId`는 호출부가 이미 조회한 projects.assigned_consultant_id 값을 전달한다.
 */
export function canAccessProjectArtifact(
  role: UserRole,
  assignedConsultantId: string | null | undefined,
  userId: string
): boolean {
  if (role === 'CONSULTANT_APPROVED') {
    return assignedConsultantId === userId;
  }
  return isOpsManager(role);
}
