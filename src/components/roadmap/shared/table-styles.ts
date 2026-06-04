/**
 * 로드맵 표 공용 스타일 상수.
 *
 * 공용 컴포넌트(TableTextCell 등)가 내부적으로 사용하며,
 * colSpan/2단 label td 등 공용 컴포넌트를 쓸 수 없는 특수 케이스에서도
 * 일관된 스타일을 적용할 수 있도록 export한다.
 */

/** 긴 텍스트 셀 td. 자동 줄바꿈 + 상단 정렬. */
export const TABLE_CELL_TEXT_CLASS =
  'px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

/** 읽기 모드 span 내부 텍스트 자동 줄바꿈. */
export const READ_ONLY_TEXT_CLASS = 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

/** 섹션 Card의 CardHeader 공통 스타일. */
export const CARD_HEADER_CLASS = 'pt-5 pb-3 bg-gradient-to-r from-gray-50 to-white';
