/**
 * 사용자 역할에 따른 기본 랜딩 페이지를 반환합니다.
 * 로그인 후 리다이렉트 체인을 제거하여 직접 이동할 수 있도록 합니다.
 */
export function getDefaultRouteForRole(role?: string | null): string {
  switch (role) {
    case 'OPS_ADMIN':
    case 'SYSTEM_ADMIN':
      return '/ops/projects';
    case 'CONSULTANT_APPROVED':
      return '/consultant/home';
    default:
      return '/dashboard';
  }
}
