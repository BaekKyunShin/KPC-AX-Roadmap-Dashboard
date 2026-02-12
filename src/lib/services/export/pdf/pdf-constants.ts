/**
 * PDF 레이아웃/스타일 상수
 */

export const LAYOUT = {
  MARGIN: 20,
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  get CONTENT_WIDTH() { return this.PAGE_WIDTH - this.MARGIN * 2; },
  HEADER_COLOR: [102, 51, 153] as [number, number, number],
  HEADER_TEXT_COLOR: [255, 255, 255] as [number, number, number],
  DIVIDER_COLOR: [200, 200, 200] as [number, number, number],
  LIGHT_BG: [248, 247, 252] as [number, number, number],
  LABEL_BG: [245, 243, 249] as [number, number, number],
  BODY_COLOR: [51, 51, 51] as [number, number, number],
  MUTED_COLOR: [120, 120, 120] as [number, number, number],
} as const;

export const FONT = {
  REGULAR: 'Pretendard',
  BOLD: 'PretendardBold',
  SIZE: {
    TITLE: 20,
    SECTION: 13,
    SUBSECTION: 11,
    TABLE_TITLE: 9.5,
    BODY: 9,
    TABLE_HEAD: 8.5,
    TABLE_BODY: 8,
    CAPTION: 7.5,
    FOOTER: 7,
  },
  LINE_HEIGHT: {
    BODY: 4.8,
    TIGHT: 3.5,
  },
} as const;
