/**
 * pdf-constants.ts 테스트
 * LAYOUT/FONT 상수 일관성 및 계층 구조 검증
 */

import { describe, it, expect } from 'vitest';
import { LAYOUT, FONT } from './pdf-constants';

describe('LAYOUT 상수', () => {
  it('CONTENT_WIDTH === PAGE_WIDTH - MARGIN * 2', () => {
    expect(LAYOUT.CONTENT_WIDTH).toBe(LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN * 2);
  });

  it('A4 규격 크기를 사용한다 (210 x 297)', () => {
    expect(LAYOUT.PAGE_WIDTH).toBe(210);
    expect(LAYOUT.PAGE_HEIGHT).toBe(297);
  });

  it('MARGIN이 양수이다', () => {
    expect(LAYOUT.MARGIN).toBeGreaterThan(0);
  });

  it('색상 배열은 [R, G, B] 형태로 3개 요소를 가진다', () => {
    const colorFields = [
      LAYOUT.HEADER_COLOR,
      LAYOUT.HEADER_TEXT_COLOR,
      LAYOUT.DIVIDER_COLOR,
      LAYOUT.LIGHT_BG,
      LAYOUT.LABEL_BG,
      LAYOUT.BODY_COLOR,
      LAYOUT.MUTED_COLOR,
    ];

    colorFields.forEach((color) => {
      expect(color).toHaveLength(3);
      color.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      });
    });
  });
});

describe('FONT 상수', () => {
  it('REGULAR/BOLD 폰트 이름이 정의되어 있다', () => {
    expect(typeof FONT.REGULAR).toBe('string');
    expect(typeof FONT.BOLD).toBe('string');
    expect(FONT.REGULAR.length).toBeGreaterThan(0);
    expect(FONT.BOLD.length).toBeGreaterThan(0);
  });

  it('SIZE 계층 구조: TITLE > SECTION > SUBSECTION > TABLE_TITLE > BODY > TABLE_HEAD > TABLE_BODY > CAPTION > FOOTER', () => {
    const { SIZE } = FONT;
    expect(SIZE.TITLE).toBeGreaterThan(SIZE.SECTION);
    expect(SIZE.SECTION).toBeGreaterThan(SIZE.SUBSECTION);
    expect(SIZE.SUBSECTION).toBeGreaterThan(SIZE.TABLE_TITLE);
    expect(SIZE.TABLE_TITLE).toBeGreaterThan(SIZE.BODY);
    expect(SIZE.BODY).toBeGreaterThan(SIZE.TABLE_HEAD);
    expect(SIZE.TABLE_HEAD).toBeGreaterThan(SIZE.TABLE_BODY);
    expect(SIZE.TABLE_BODY).toBeGreaterThan(SIZE.CAPTION);
    expect(SIZE.CAPTION).toBeGreaterThan(SIZE.FOOTER);
  });

  it('LINE_HEIGHT 값이 모두 양수이다', () => {
    expect(FONT.LINE_HEIGHT.BODY).toBeGreaterThan(0);
    expect(FONT.LINE_HEIGHT.TIGHT).toBeGreaterThan(0);
  });

  it('LINE_HEIGHT.BODY > LINE_HEIGHT.TIGHT', () => {
    expect(FONT.LINE_HEIGHT.BODY).toBeGreaterThan(FONT.LINE_HEIGHT.TIGHT);
  });
});
