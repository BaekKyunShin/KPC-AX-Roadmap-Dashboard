/**
 * 페이지 메타데이터 — page.tsx 와 loading.tsx 가 동일 헤더 텍스트를 사용하기 위한 단일 출처.
 * 헤더 텍스트 변경은 본 파일 한 곳에서만 수행.
 *
 * description 은 사용자 역할 (isAdmin) 에 따라 동적이라 page.tsx 에서 분기 사용.
 * loading.tsx 는 정적 노출 불가하므로 PAGE_TITLE 만 사용.
 */
export const PAGE_TITLE = '로드맵·PBL 갤러리';
export const PAGE_DESCRIPTION_ADMIN =
  '모든 컨설턴트의 로드맵과 PBL 보고서를 열람하고 관리할 수 있습니다.';
export const PAGE_DESCRIPTION_CONSULTANT =
  '다른 컨설턴트가 공유한 로드맵과 PBL 보고서를 탐색하고 활용할 수 있습니다.';
