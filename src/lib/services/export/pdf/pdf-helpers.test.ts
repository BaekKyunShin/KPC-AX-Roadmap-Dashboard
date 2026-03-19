/**
 * pdf-helpers.ts 테스트
 * DocContext 기반 렌더링/포맷 유틸리티 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  type DocContext,
  setRegular,
  setBold,
  checkPageBreak,
  drawDivider,
  drawSectionTitle,
  drawSubsectionTitle,
  drawTableTitle,
  drawBodyText,
  drawBulletItem,
  drawLabelValue,
  getTableFinalY,
  getAutoTableStyles,
  formatBulletList,
} from './pdf-helpers';
import { LAYOUT, FONT } from './pdf-constants';

// ─── jsPDF Mock 헬퍼 ─────────────────────────────────────────────────────────

function createMockDoc() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 40),
    internal: { pageSize: { height: 297, width: 210 } },
    lastAutoTable: undefined as { finalY: number } | undefined,
  };
}

type MockDoc = ReturnType<typeof createMockDoc>;

function createCtx(overrides: Partial<{ y: number; hasFonts: boolean; doc: MockDoc }> = {}): DocContext {
  return {
    doc: overrides.doc ?? createMockDoc(),
    y: overrides.y ?? 50,
    hasFonts: overrides.hasFonts ?? true,
  } as unknown as DocContext;
}

// ─── setRegular ──────────────────────────────────────────────────────────────

describe('setRegular', () => {
  it('한글 폰트가 있으면 Pretendard를 사용한다', () => {
    const ctx = createCtx({ hasFonts: true });
    setRegular(ctx, 10);

    expect(ctx.doc.setFont).toHaveBeenCalledWith(FONT.REGULAR, 'normal');
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(10);
  });

  it('한글 폰트가 없으면 helvetica를 사용한다', () => {
    const ctx = createCtx({ hasFonts: false });
    setRegular(ctx, 12);

    expect(ctx.doc.setFont).toHaveBeenCalledWith('helvetica', 'normal');
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(12);
  });

  it('지정한 사이즈로 폰트 크기를 설정한다', () => {
    const ctx = createCtx();
    setRegular(ctx, 8);

    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(8);
  });
});

// ─── setBold ─────────────────────────────────────────────────────────────────

describe('setBold', () => {
  it('한글 폰트가 있으면 PretendardBold, normal을 사용한다', () => {
    const ctx = createCtx({ hasFonts: true });
    setBold(ctx, 14);

    expect(ctx.doc.setFont).toHaveBeenCalledWith(FONT.BOLD, 'normal');
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(14);
  });

  it('한글 폰트가 없으면 helvetica, bold를 사용한다', () => {
    const ctx = createCtx({ hasFonts: false });
    setBold(ctx, 14);

    expect(ctx.doc.setFont).toHaveBeenCalledWith('helvetica', 'bold');
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(14);
  });

  it('지정한 사이즈로 폰트 크기를 설정한다', () => {
    const ctx = createCtx();
    setBold(ctx, 20);

    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(20);
  });
});

// ─── checkPageBreak ──────────────────────────────────────────────────────────

describe('checkPageBreak', () => {
  it('공간이 충분하면 addPage를 호출하지 않는다', () => {
    const ctx = createCtx({ y: 50 });
    checkPageBreak(ctx, 10);

    expect(ctx.doc.addPage).not.toHaveBeenCalled();
    expect(ctx.y).toBe(50); // y 변경 없음
  });

  it('공간이 부족하면 addPage를 호출하고 y를 리셋한다', () => {
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 20 }); // 297 - 20 = 277
    checkPageBreak(ctx, 10); // 277 + 10 = 287 > 297 - 25 = 272

    expect(ctx.doc.addPage).toHaveBeenCalledTimes(1);
    expect(ctx.y).toBe(LAYOUT.MARGIN + 5);
  });

  it('needed가 정확히 남은 공간과 같으면 addPage를 호출하지 않는다', () => {
    // y + needed === PAGE_HEIGHT - 25 → 경계값
    const threshold = LAYOUT.PAGE_HEIGHT - 25;
    const y = threshold - 10;
    const ctx = createCtx({ y });
    checkPageBreak(ctx, 10); // y + needed === threshold → 넘지 않음

    expect(ctx.doc.addPage).not.toHaveBeenCalled();
  });

  it('needed가 남은 공간보다 1만큼 클 때 addPage를 호출한다', () => {
    const threshold = LAYOUT.PAGE_HEIGHT - 25;
    const y = threshold - 9;
    const ctx = createCtx({ y });
    checkPageBreak(ctx, 10); // y + needed = threshold + 1 → 넘음

    expect(ctx.doc.addPage).toHaveBeenCalledTimes(1);
  });

  it('y가 0일 때 큰 needed도 addPage를 호출하지 않는다', () => {
    const ctx = createCtx({ y: 0 });
    checkPageBreak(ctx, LAYOUT.PAGE_HEIGHT - 26);

    expect(ctx.doc.addPage).not.toHaveBeenCalled();
  });
});

// ─── drawDivider ─────────────────────────────────────────────────────────────

describe('drawDivider', () => {
  it('구분선을 그리고 y를 6만큼 증가시킨다', () => {
    const ctx = createCtx({ y: 100 });
    drawDivider(ctx);

    expect(ctx.doc.setDrawColor).toHaveBeenCalledWith(...LAYOUT.DIVIDER_COLOR);
    expect(ctx.doc.setLineWidth).toHaveBeenCalledWith(0.3);
    expect(ctx.doc.line).toHaveBeenCalledWith(
      LAYOUT.MARGIN, 100,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, 100,
    );
    expect(ctx.y).toBe(106);
  });
});

// ─── drawSectionTitle ────────────────────────────────────────────────────────

describe('drawSectionTitle', () => {
  it('제목을 출력하고 밑줄을 그린다', () => {
    const ctx = createCtx({ y: 50 });
    drawSectionTitle(ctx, '진단 요약');

    expect(ctx.doc.text).toHaveBeenCalledWith('진단 요약', LAYOUT.MARGIN, 50);
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(FONT.SIZE.SECTION);
  });

  it('y를 올바르게 업데이트한다 (제목 후 +2, 밑줄 후 +6)', () => {
    const ctx = createCtx({ y: 50 });
    drawSectionTitle(ctx, '제목');

    // 50 + 2 (제목 후) + 6 (밑줄 후) = 58
    expect(ctx.y).toBe(58);
  });

  it('공간이 부족하면 페이지 브레이크를 수행한다', () => {
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 30 }); // 267, 267+20=287 > 272
    drawSectionTitle(ctx, '제목');

    expect(ctx.doc.addPage).toHaveBeenCalled();
  });

  it('BODY_COLOR로 텍스트 색상을 설정한다', () => {
    const ctx = createCtx({ y: 50 });
    drawSectionTitle(ctx, '제목');

    expect(ctx.doc.setTextColor).toHaveBeenCalledWith(...LAYOUT.BODY_COLOR);
  });

  it('HEADER_COLOR로 밑줄 색상을 설정한다', () => {
    const ctx = createCtx({ y: 50 });
    drawSectionTitle(ctx, '제목');

    expect(ctx.doc.setDrawColor).toHaveBeenCalledWith(...LAYOUT.HEADER_COLOR);
  });
});

// ─── drawSubsectionTitle ─────────────────────────────────────────────────────

describe('drawSubsectionTitle', () => {
  it('소제목을 출력하고 구분선을 그린다', () => {
    const ctx = createCtx({ y: 80 });
    drawSubsectionTitle(ctx, '과정 1');

    expect(ctx.doc.text).toHaveBeenCalledWith('과정 1', LAYOUT.MARGIN, 80);
    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(FONT.SIZE.SUBSECTION);
  });

  it('y를 올바르게 업데이트한다 (제목 후 +2, 구분선 후 +5)', () => {
    const ctx = createCtx({ y: 80 });
    drawSubsectionTitle(ctx, '과정 1');

    // 80 + 2 + 5 = 87
    expect(ctx.y).toBe(87);
  });

  it('공간이 부족하면 페이지 브레이크를 수행한다', () => {
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 20 }); // 277, 277+15=292 > 272
    drawSubsectionTitle(ctx, '과정 1');

    expect(ctx.doc.addPage).toHaveBeenCalled();
  });

  it('HEADER_COLOR로 텍스트와 선 색상을 설정한다', () => {
    const ctx = createCtx({ y: 50 });
    drawSubsectionTitle(ctx, '과정 1');

    expect(ctx.doc.setTextColor).toHaveBeenCalledWith(...LAYOUT.HEADER_COLOR);
    expect(ctx.doc.setDrawColor).toHaveBeenCalledWith(...LAYOUT.HEADER_COLOR);
  });

  it('구분선을 전체 너비로 그린다', () => {
    const ctx = createCtx({ y: 50 });
    drawSubsectionTitle(ctx, '과정 1');

    expect(ctx.doc.line).toHaveBeenCalledWith(
      LAYOUT.MARGIN, 52,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, 52,
    );
  });
});

// ─── drawTableTitle ──────────────────────────────────────────────────────────

describe('drawTableTitle', () => {
  it('블록 심볼(■)과 함께 제목을 출력한다', () => {
    const ctx = createCtx({ y: 100 });
    drawTableTitle(ctx, '커리큘럼');

    expect(ctx.doc.text).toHaveBeenCalledWith('\u25A0 커리큘럼', LAYOUT.MARGIN, 100);
  });

  it('FONT.SIZE.TABLE_TITLE 크기를 사용한다', () => {
    const ctx = createCtx({ y: 100 });
    drawTableTitle(ctx, '커리큘럼');

    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(FONT.SIZE.TABLE_TITLE);
  });

  it('y를 5만큼 증가시킨다', () => {
    const ctx = createCtx({ y: 100 });
    drawTableTitle(ctx, '커리큘럼');

    expect(ctx.y).toBe(105);
  });

  it('공간이 부족하면 페이지 브레이크를 수행한다', () => {
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 30 }); // 267+12=279 > 272
    drawTableTitle(ctx, '커리큘럼');

    expect(ctx.doc.addPage).toHaveBeenCalled();
  });
});

// ─── drawBodyText ────────────────────────────────────────────────────────────

describe('drawBodyText', () => {
  it('한 줄 텍스트를 출력한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBodyText(ctx, '본문 텍스트입니다.');

    expect(ctx.doc.text).toHaveBeenCalledWith('본문 텍스트입니다.', LAYOUT.MARGIN, 50);
    expect(ctx.y).toBe(50 + FONT.LINE_HEIGHT.BODY);
  });

  it('splitTextToSize를 CONTENT_WIDTH로 호출한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBodyText(ctx, '텍스트');

    expect(ctx.doc.splitTextToSize).toHaveBeenCalledWith('텍스트', LAYOUT.CONTENT_WIDTH);
  });

  it('indent를 적용하면 maxWidth가 줄어든다', () => {
    const ctx = createCtx({ y: 50 });
    drawBodyText(ctx, '텍스트', 10);

    expect(ctx.doc.splitTextToSize).toHaveBeenCalledWith('텍스트', LAYOUT.CONTENT_WIDTH - 10);
    expect(ctx.doc.text).toHaveBeenCalledWith('텍스트', LAYOUT.MARGIN + 10, 50);
  });

  it('여러 줄로 분할되면 줄마다 y가 LINE_HEIGHT.BODY만큼 증가한다', () => {
    const doc = createMockDoc();
    doc.splitTextToSize.mockReturnValue(['첫 번째 줄', '두 번째 줄', '세 번째 줄']);
    const ctx = createCtx({ y: 50, doc });

    drawBodyText(ctx, '긴 텍스트');

    expect(ctx.doc.text).toHaveBeenCalledTimes(3);
    expect(ctx.y).toBeCloseTo(50 + FONT.LINE_HEIGHT.BODY * 3, 10);
  });

  it('각 줄마다 checkPageBreak를 수행한다', () => {
    const doc = createMockDoc();
    // 여러 줄, 페이지 끝에 가까운 y
    doc.splitTextToSize.mockReturnValue(['줄1', '줄2', '줄3', '줄4', '줄5']);
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 30, doc });

    drawBodyText(ctx, '긴 텍스트');

    // addPage가 최소 1회 호출되어야 함
    expect(ctx.doc.addPage).toHaveBeenCalled();
  });

  it('BODY_COLOR로 텍스트 색상을 설정한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBodyText(ctx, '텍스트');

    expect(ctx.doc.setTextColor).toHaveBeenCalledWith(...LAYOUT.BODY_COLOR);
  });

  it('FONT.SIZE.BODY 크기를 사용한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBodyText(ctx, '텍스트');

    expect(ctx.doc.setFontSize).toHaveBeenCalledWith(FONT.SIZE.BODY);
  });
});

// ─── drawBulletItem ──────────────────────────────────────────────────────────

describe('drawBulletItem', () => {
  it('불릿(•)과 텍스트를 출력한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBulletItem(ctx, '항목 1');

    const textCalls = (ctx.doc.text as ReturnType<typeof vi.fn>).mock.calls;
    // 불릿 호출
    const bulletCall = textCalls.find((c: unknown[]) => c[0] === '\u2022');
    expect(bulletCall).toBeDefined();
    // 텍스트 호출
    const itemCall = textCalls.find((c: unknown[]) => c[0] === '항목 1');
    expect(itemCall).toBeDefined();
  });

  it('기본 indent는 4이다', () => {
    const ctx = createCtx({ y: 50 });
    drawBulletItem(ctx, '항목');

    const textCalls = (ctx.doc.text as ReturnType<typeof vi.fn>).mock.calls;
    const bulletCall = textCalls.find((c: unknown[]) => c[0] === '\u2022');
    expect(bulletCall![1]).toBe(LAYOUT.MARGIN + 4); // bulletX
  });

  it('커스텀 indent를 적용한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBulletItem(ctx, '항목', 8);

    const textCalls = (ctx.doc.text as ReturnType<typeof vi.fn>).mock.calls;
    const bulletCall = textCalls.find((c: unknown[]) => c[0] === '\u2022');
    expect(bulletCall![1]).toBe(LAYOUT.MARGIN + 8); // bulletX
  });

  it('첫 줄에만 불릿이 표시된다', () => {
    const doc = createMockDoc();
    doc.splitTextToSize.mockReturnValue(['첫 줄', '둘째 줄']);
    const ctx = createCtx({ y: 50, doc });

    drawBulletItem(ctx, '긴 항목');

    const textCalls = (ctx.doc.text as ReturnType<typeof vi.fn>).mock.calls;
    const bulletCalls = textCalls.filter((c: unknown[]) => c[0] === '\u2022');
    expect(bulletCalls).toHaveLength(1);
  });

  it('여러 줄일 때 y가 줄 수만큼 증가한다', () => {
    const doc = createMockDoc();
    doc.splitTextToSize.mockReturnValue(['줄1', '줄2']);
    const ctx = createCtx({ y: 50, doc });

    drawBulletItem(ctx, '항목');

    expect(ctx.y).toBeCloseTo(50 + FONT.LINE_HEIGHT.BODY * 2, 10);
  });

  it('BODY_COLOR로 텍스트 색상을 설정한다', () => {
    const ctx = createCtx({ y: 50 });
    drawBulletItem(ctx, '항목');

    expect(ctx.doc.setTextColor).toHaveBeenCalledWith(...LAYOUT.BODY_COLOR);
  });
});

// ─── drawLabelValue ──────────────────────────────────────────────────────────

describe('drawLabelValue', () => {
  it('라벨을 볼드로, 값을 일반체로 출력한다', () => {
    const ctx = createCtx({ y: 50 });
    drawLabelValue(ctx, '이름:', '홍길동');

    const setFontCalls = (ctx.doc.setFont as ReturnType<typeof vi.fn>).mock.calls;
    // 첫 호출은 setBold (라벨)
    expect(setFontCalls[0]).toEqual([FONT.BOLD, 'normal']);
    // 두 번째 호출은 setRegular (값)
    expect(setFontCalls[1]).toEqual([FONT.REGULAR, 'normal']);
  });

  it('라벨은 MUTED_COLOR, 값은 BODY_COLOR를 사용한다', () => {
    const ctx = createCtx({ y: 50 });
    drawLabelValue(ctx, '이름:', '홍길동');

    const colorCalls = (ctx.doc.setTextColor as ReturnType<typeof vi.fn>).mock.calls;
    expect(colorCalls[0]).toEqual([...LAYOUT.MUTED_COLOR]);
    expect(colorCalls[1]).toEqual([...LAYOUT.BODY_COLOR]);
  });

  it('기본 indent는 4이다', () => {
    const ctx = createCtx({ y: 50 });
    drawLabelValue(ctx, '라벨:', '값');

    expect(ctx.doc.text).toHaveBeenCalledWith('라벨:', LAYOUT.MARGIN + 4, 50);
  });

  it('커스텀 indent를 적용한다', () => {
    const ctx = createCtx({ y: 50 });
    drawLabelValue(ctx, '라벨:', '값', 10);

    expect(ctx.doc.text).toHaveBeenCalledWith('라벨:', LAYOUT.MARGIN + 10, 50);
  });

  it('값이 여러 줄로 분할되면 줄마다 y가 증가한다', () => {
    const doc = createMockDoc();
    doc.splitTextToSize.mockReturnValue(['첫 줄', '둘째 줄', '셋째 줄']);
    const ctx = createCtx({ y: 50, doc });

    drawLabelValue(ctx, '설명:', '긴 값');

    expect(ctx.y).toBeCloseTo(50 + FONT.LINE_HEIGHT.BODY * 3, 10);
  });

  it('값의 x좌표는 라벨 폭 + 2만큼 오른쪽이다', () => {
    const doc = createMockDoc();
    doc.getTextWidth.mockReturnValue(30);
    const ctx = createCtx({ y: 50, doc });

    drawLabelValue(ctx, '라벨:', '값');

    // 라벨폭 30 + 2 = 32, x = MARGIN + 4 + 32 = MARGIN + 36
    expect(ctx.doc.text).toHaveBeenCalledWith('값', LAYOUT.MARGIN + 4 + 32, 50);
  });

  it('공간이 부족하면 페이지 브레이크를 수행한다', () => {
    const ctx = createCtx({ y: LAYOUT.PAGE_HEIGHT - 20 });
    drawLabelValue(ctx, '라벨:', '값');

    expect(ctx.doc.addPage).toHaveBeenCalled();
  });
});

// ─── getTableFinalY ──────────────────────────────────────────────────────────

describe('getTableFinalY', () => {
  it('lastAutoTable이 있으면 finalY를 반환한다', () => {
    const doc = createMockDoc();
    doc.lastAutoTable = { finalY: 150 };

    const result = getTableFinalY(doc as never);
    expect(result).toBe(150);
  });

  it('lastAutoTable이 없으면 0을 반환한다', () => {
    const doc = createMockDoc();
    doc.lastAutoTable = undefined;

    const result = getTableFinalY(doc as never);
    expect(result).toBe(0);
  });
});

// ─── getAutoTableStyles ──────────────────────────────────────────────────────

describe('getAutoTableStyles', () => {
  it('hasFonts=true일 때 Pretendard 폰트를 사용한다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.styles.font).toBe(FONT.REGULAR);
    expect(styles.headStyles.font).toBe(FONT.BOLD);
    expect(styles.headStyles.fontStyle).toBe('normal');
  });

  it('hasFonts=false일 때 helvetica 폰트를 사용한다', () => {
    const styles = getAutoTableStyles(false);

    expect(styles.styles.font).toBe('helvetica');
    expect(styles.headStyles.font).toBe('helvetica');
    expect(styles.headStyles.fontStyle).toBe('bold');
  });

  it('styles에 올바른 fontSize가 설정된다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.styles.fontSize).toBe(FONT.SIZE.TABLE_BODY);
    expect(styles.headStyles.fontSize).toBe(FONT.SIZE.TABLE_HEAD);
  });

  it('headStyles에 HEADER_COLOR와 HEADER_TEXT_COLOR가 설정된다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.headStyles.fillColor).toEqual(LAYOUT.HEADER_COLOR);
    expect(styles.headStyles.textColor).toEqual(LAYOUT.HEADER_TEXT_COLOR);
  });

  it('alternateRowStyles에 LIGHT_BG가 설정된다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.alternateRowStyles.fillColor).toEqual(LAYOUT.LIGHT_BG);
  });

  it('cellPadding이 올바르게 설정된다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.styles.cellPadding).toEqual({ top: 2.5, bottom: 2.5, left: 3, right: 3 });
    expect(styles.headStyles.cellPadding).toEqual({ top: 3, bottom: 3, left: 3, right: 3 });
  });

  it('lineColor와 lineWidth가 설정된다', () => {
    const styles = getAutoTableStyles(true);

    expect(styles.styles.lineColor).toEqual([220, 220, 220]);
    expect(styles.styles.lineWidth).toBe(0.2);
  });

  it('BODY_COLOR가 textColor로 설정된다', () => {
    const styles = getAutoTableStyles(false);

    expect(styles.styles.textColor).toEqual(LAYOUT.BODY_COLOR);
  });
});

// ─── formatBulletList ────────────────────────────────────────────────────────

describe('formatBulletList', () => {
  let doc: MockDoc;

  beforeEach(() => {
    doc = createMockDoc();
  });

  it('빈 배열이면 "-"를 반환한다', () => {
    const result = formatBulletList(doc as never, [], 100, true);
    expect(result).toBe('-');
  });

  it('null/undefined items는 "-"를 반환한다', () => {
    const result = formatBulletList(doc as never, null as unknown as string[], 100, true);
    expect(result).toBe('-');
  });

  it('한 개의 항목에 불릿을 붙인다', () => {
    const result = formatBulletList(doc as never, ['항목1'], 100, true);
    expect(result).toBe('\u2022 항목1');
  });

  it('여러 항목을 개행으로 연결한다', () => {
    const result = formatBulletList(doc as never, ['항목1', '항목2'], 100, true);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('\u2022 항목1');
    expect(lines[1]).toBe('\u2022 항목2');
  });

  it('hasFonts=true이면 Pretendard 폰트를 설정한다', () => {
    formatBulletList(doc as never, ['항목'], 100, true);

    expect(doc.setFont).toHaveBeenCalledWith(FONT.REGULAR, 'normal');
  });

  it('hasFonts=false이면 helvetica 폰트를 설정한다', () => {
    formatBulletList(doc as never, ['항목'], 100, false);

    expect(doc.setFont).toHaveBeenCalledWith('helvetica', 'normal');
  });

  it('TABLE_BODY 크기로 폰트를 설정한다', () => {
    formatBulletList(doc as never, ['항목'], 100, true);

    expect(doc.setFontSize).toHaveBeenCalledWith(FONT.SIZE.TABLE_BODY);
  });

  it('긴 항목은 자동 줄바꿈되며 두 번째 줄부터 들여쓰기된다', () => {
    doc.splitTextToSize.mockReturnValue(['첫 줄', '둘째 줄']);
    (doc.getTextWidth as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
      if (text === '\u2022 ') return 6;
      if (text === ' ') return 2;
      return 40;
    });

    const result = formatBulletList(doc as never, ['긴 텍스트'], 100, true);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('\u2022 ');
    // 두 번째 줄은 불릿 대신 공백 들여쓰기
    expect(lines[1]).not.toContain('\u2022');
  });

  it('여러 항목이 각각 여러 줄로 분할될 수 있다', () => {
    (doc.splitTextToSize as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
      if (text === '짧은') return ['짧은'];
      return ['줄1', '줄2'];
    });
    (doc.getTextWidth as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
      if (text === '\u2022 ') return 6;
      if (text === ' ') return 2;
      return 40;
    });

    const result = formatBulletList(doc as never, ['짧은', '긴 텍스트'], 100, true);
    const lines = result.split('\n');

    // 짧은: 1줄, 긴 텍스트: 2줄 = 총 3줄
    expect(lines).toHaveLength(3);
  });

  it('columnWidth에서 패딩(6)과 불릿 폭을 뺀 너비로 splitTextToSize를 호출한다', () => {
    (doc.getTextWidth as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
      if (text === '\u2022 ') return 8;
      if (text === ' ') return 2;
      return 40;
    });

    formatBulletList(doc as never, ['텍스트'], 100, true);

    // textWidth = 100 - 6 - bulletW(8) = 86
    expect(doc.splitTextToSize).toHaveBeenCalledWith('텍스트', 86);
  });
});
