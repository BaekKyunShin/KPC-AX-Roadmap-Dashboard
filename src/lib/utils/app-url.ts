/**
 * 애플리케이션 base URL 반환 (메일 링크 등 외부 노출 절대 URL 생성 전용).
 *
 * - `NEXT_PUBLIC_APP_URL` 환경변수를 우선 사용
 * - 트레일링 슬래시 자동 제거 (이중 슬래시 `//reset-password` 방지)
 * - 환경변수 누락·잘못된 URL 형식 시 명시적 에러 throw
 *
 * Why: Supabase resetPasswordForEmail 의 redirectTo 등은 절대 URL 이 필요하며,
 *   빈 문자열 fallback 은 메일 링크가 상대 경로로 깨지거나 localhost 로 가는 사고를 유발한다.
 *   env 누락은 silent 처리하지 않고 호출 측에서 명시적으로 처리하도록 강제한다.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw || raw.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL 환경변수가 설정되지 않았습니다. 운영 환경에서는 절대 URL 이 필요합니다.'
    );
  }
  const trimmed = raw.trim().replace(/\/+$/, '');
  try {
    new URL(trimmed);
  } catch {
    throw new Error(`NEXT_PUBLIC_APP_URL 값이 유효한 URL 이 아닙니다: ${raw}`);
  }
  return trimmed;
}
