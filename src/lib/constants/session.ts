/**
 * 세션 관련 상수
 *
 * JWT 만료 시간은 Supabase 대시보드에서 설정:
 * → Authentication → Settings → JWT Expiry (기본값: 3600초 = 1시간)
 *
 * B2B 내부 도구 권장: 28800초 (8시간)
 * 현재 설정: Supabase 기본값 (3600초)
 */

/** Supabase 세션 쿠키 옵션 */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
