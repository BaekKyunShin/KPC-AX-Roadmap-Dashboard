/**
 * 페이지 메타데이터 — page.tsx 와 loading.tsx 가 동일 헤더 텍스트를 사용하기 위한 단일 출처.
 * 헤더 텍스트 변경은 본 파일 한 곳에서만 수행.
 */
export const PAGE_TITLE = '계정 설정';
export const PAGE_DESCRIPTION = '비밀번호 변경 및 계정 관리';
export const BACK_LINK = {
  href: '/dashboard',
  label: '대시보드',
  useBack: true,
} as const;
