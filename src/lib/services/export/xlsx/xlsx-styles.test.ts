import { describe, expect, it } from 'vitest';
import { COLOR, THIN_BORDER, STYLE, tableBodyStyle, tableBodyCenterStyle } from './xlsx-styles';

// =============================================================================
// COLOR 상수
// =============================================================================

describe('COLOR 상수', () => {
  it('모든 색상 키가 정의되어 있다', () => {
    const expectedKeys = [
      'HEADER_BG', 'HEADER_TEXT', 'SECTION_BG', 'LABEL_BG',
      'ALT_ROW', 'BORDER', 'BODY_TEXT', 'MUTED_TEXT', 'ACCENT', 'TOTAL_BG',
    ];
    for (const key of expectedKeys) {
      expect(COLOR).toHaveProperty(key);
    }
  });

  it('모든 색상 값은 6자리 HEX 문자열이다', () => {
    for (const value of Object.values(COLOR)) {
      expect(value).toMatch(/^[0-9A-Fa-f]{6}$/);
    }
  });

  it('HEADER_BG와 ACCENT는 같은 브랜드 색상이다', () => {
    expect(COLOR.HEADER_BG).toBe(COLOR.ACCENT);
  });
});

// =============================================================================
// THIN_BORDER 상수
// =============================================================================

describe('THIN_BORDER 상수', () => {
  it('4방향 테두리가 모두 정의되어 있다', () => {
    expect(THIN_BORDER).toHaveProperty('top');
    expect(THIN_BORDER).toHaveProperty('bottom');
    expect(THIN_BORDER).toHaveProperty('left');
    expect(THIN_BORDER).toHaveProperty('right');
  });

  it('모든 테두리 스타일은 thin이다', () => {
    for (const dir of ['top', 'bottom', 'left', 'right'] as const) {
      expect(THIN_BORDER[dir].style).toBe('thin');
      expect(THIN_BORDER[dir].color.rgb).toBe(COLOR.BORDER);
    }
  });
});

// =============================================================================
// STYLE 상수 스냅샷
// =============================================================================

describe('STYLE 상수', () => {
  it('모든 스타일 프리셋 키가 정의되어 있다', () => {
    const expectedKeys = [
      'title', 'company', 'sectionHeader', 'subSection', 'label',
      'value', 'tableHeader', 'total', 'totalLabel', 'metaLabel',
      'metaValue', 'diagnosis', 'blank', 'courseHeader',
    ];
    for (const key of expectedKeys) {
      expect(STYLE).toHaveProperty(key);
    }
  });

  it('헤더 계열 스타일은 bold 폰트를 가진다', () => {
    expect(STYLE.sectionHeader.font.bold).toBe(true);
    expect(STYLE.tableHeader.font.bold).toBe(true);
    expect(STYLE.courseHeader.font.bold).toBe(true);
  });

  it('title 스타일은 가장 큰 폰트 크기를 가진다', () => {
    expect(STYLE.title.font.sz).toBe(18);
    expect(STYLE.title.font.sz).toBeGreaterThan(STYLE.company.font.sz);
  });
});

// =============================================================================
// tableBodyStyle
// =============================================================================

describe('tableBodyStyle', () => {
  it('alt=false이면 배경색이 없다', () => {
    const style = tableBodyStyle(false);
    expect(style.fill).toBeUndefined();
  });

  it('alt=true이면 ALT_ROW 배경색이 적용된다', () => {
    const style = tableBodyStyle(true);
    expect(style.fill?.fgColor?.rgb).toBe(COLOR.ALT_ROW);
  });

  it('양쪽 모두 좌측 정렬이다', () => {
    expect(tableBodyStyle(false).alignment?.horizontal).toBe('left');
    expect(tableBodyStyle(true).alignment?.horizontal).toBe('left');
  });
});

// =============================================================================
// tableBodyCenterStyle
// =============================================================================

describe('tableBodyCenterStyle', () => {
  it('alt=false이면 배경색이 없다', () => {
    const style = tableBodyCenterStyle(false);
    expect(style.fill).toBeUndefined();
  });

  it('alt=true이면 ALT_ROW 배경색이 적용된다', () => {
    const style = tableBodyCenterStyle(true);
    expect(style.fill?.fgColor?.rgb).toBe(COLOR.ALT_ROW);
  });

  it('양쪽 모두 중앙 정렬이다', () => {
    expect(tableBodyCenterStyle(false).alignment?.horizontal).toBe('center');
    expect(tableBodyCenterStyle(true).alignment?.horizontal).toBe('center');
  });
});
