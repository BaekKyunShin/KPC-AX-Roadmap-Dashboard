/**
 * PDF 문서 헬퍼 함수
 * DocContext를 사용하는 렌더링/포맷 유틸리티
 */

import type { jsPDF } from 'jspdf';
import { LAYOUT, FONT } from './pdf-constants';

export interface DocContext {
  doc: jsPDF;
  y: number;
  hasFonts: boolean;
}

export function setRegular(ctx: DocContext, size: number) {
  ctx.doc.setFont(ctx.hasFonts ? FONT.REGULAR : 'helvetica', 'normal');
  ctx.doc.setFontSize(size);
}

export function setBold(ctx: DocContext, size: number) {
  if (ctx.hasFonts) {
    ctx.doc.setFont(FONT.BOLD, 'normal');
  } else {
    ctx.doc.setFont('helvetica', 'bold');
  }
  ctx.doc.setFontSize(size);
}

export function checkPageBreak(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > LAYOUT.PAGE_HEIGHT - 25) {
    ctx.doc.addPage();
    ctx.y = LAYOUT.MARGIN + 5;
  }
}

export function drawDivider(ctx: DocContext): void {
  ctx.doc.setDrawColor(...LAYOUT.DIVIDER_COLOR);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(LAYOUT.MARGIN, ctx.y, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, ctx.y);
  ctx.y += 6;
}

export function drawSectionTitle(ctx: DocContext, title: string): void {
  checkPageBreak(ctx, 20);
  setBold(ctx, FONT.SIZE.SECTION);
  ctx.doc.setTextColor(...LAYOUT.BODY_COLOR);
  ctx.doc.text(title, LAYOUT.MARGIN, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(LAYOUT.MARGIN, ctx.y, LAYOUT.MARGIN + 40, ctx.y);
  ctx.y += 6;
}

export function drawSubsectionTitle(ctx: DocContext, title: string): void {
  checkPageBreak(ctx, 15);
  setBold(ctx, FONT.SIZE.SUBSECTION);
  ctx.doc.setTextColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.text(title, LAYOUT.MARGIN, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(LAYOUT.MARGIN, ctx.y, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, ctx.y);
  ctx.y += 5;
}

export function drawTableTitle(ctx: DocContext, title: string): void {
  checkPageBreak(ctx, 12);
  setBold(ctx, FONT.SIZE.TABLE_TITLE);
  ctx.doc.setTextColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.text(`\u25A0 ${title}`, LAYOUT.MARGIN, ctx.y);
  ctx.y += 5;
}

export function drawBodyText(ctx: DocContext, text: string, indent = 0): void {
  setRegular(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.BODY_COLOR);
  const maxWidth = LAYOUT.CONTENT_WIDTH - indent;
  const lines: string[] = ctx.doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string) => {
    checkPageBreak(ctx, 5);
    ctx.doc.text(line, LAYOUT.MARGIN + indent, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY;
  });
}

export function drawBulletItem(ctx: DocContext, text: string, indent = 4): void {
  setRegular(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.BODY_COLOR);
  const bulletX = LAYOUT.MARGIN + indent;
  const textX = bulletX + 4;
  const maxWidth = LAYOUT.CONTENT_WIDTH - indent - 4;
  const lines: string[] = ctx.doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string, i: number) => {
    checkPageBreak(ctx, 5);
    if (i === 0) ctx.doc.text('\u2022', bulletX, ctx.y);
    ctx.doc.text(line, textX, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY;
  });
}

export function drawLabelValue(ctx: DocContext, label: string, value: string, indent = 4): void {
  checkPageBreak(ctx, 5);
  setBold(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.MUTED_COLOR);
  ctx.doc.text(label, LAYOUT.MARGIN + indent, ctx.y);
  const labelWidth = ctx.doc.getTextWidth(label) + 2;
  setRegular(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.BODY_COLOR);
  const maxWidth = LAYOUT.CONTENT_WIDTH - indent - labelWidth;
  const lines: string[] = ctx.doc.splitTextToSize(value, maxWidth);
  lines.forEach((line: string) => {
    ctx.doc.text(line, LAYOUT.MARGIN + indent + labelWidth, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY;
  });
}

export function getTableFinalY(doc: jsPDF): number {
  return doc.lastAutoTable?.finalY ?? 0;
}

export function getAutoTableStyles(hasFonts: boolean) {
  return {
    styles: {
      font: hasFonts ? FONT.REGULAR : 'helvetica',
      fontSize: FONT.SIZE.TABLE_BODY,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: LAYOUT.BODY_COLOR,
      lineColor: [220, 220, 220] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      font: hasFonts ? FONT.BOLD : 'helvetica',
      fontStyle: hasFonts ? 'normal' as const : 'bold' as const,
      fontSize: FONT.SIZE.TABLE_HEAD,
      fillColor: LAYOUT.HEADER_COLOR,
      textColor: LAYOUT.HEADER_TEXT_COLOR,
      // 홈페이지 UI와 동일하게 표 헤더는 가운데 정렬.
      halign: 'center' as const,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    alternateRowStyles: {
      fillColor: LAYOUT.LIGHT_BG,
    },
  };
}

export function formatBulletList(
  doc: jsPDF,
  items: string[],
  columnWidth: number,
  hasFonts: boolean,
): string {
  if (!items || items.length === 0) return '-';

  doc.setFont(hasFonts ? FONT.REGULAR : 'helvetica', 'normal');
  doc.setFontSize(FONT.SIZE.TABLE_BODY);

  const bullet = '\u2022 ';
  const bulletW = doc.getTextWidth(bullet);
  const spaceW = doc.getTextWidth(' ');
  const indent = ' '.repeat(Math.round(bulletW / spaceW));
  const textWidth = columnWidth - 6 - bulletW; // 6 = padding left(3) + right(3)

  const result: string[] = [];
  items.forEach(item => {
    const wrapped: string[] = doc.splitTextToSize(item, textWidth);
    wrapped.forEach((line: string, i: number) => {
      result.push(i === 0 ? `${bullet}${line}` : `${indent}${line}`);
    });
  });

  return result.join('\n');
}
