/**
 * XLSX 시트 빌더
 * SheetCtx 컨텍스트 + 시트 구성 헬퍼 함수
 */

import type * as XLSX from 'xlsx-js-style';
import { STYLE } from './xlsx-styles';
import { calcRowHeight } from './xlsx-formatter';

// ============================================================================
// 셀 참조 유틸 (런타임 XLSX 의존성 제거용)
// ============================================================================

/** 셀 좌표 → 참조 문자열 (e.g. {r:0, c:0} → "A1") */
function encodeCell(cell: { r: number; c: number }): string {
  let col = '';
  let c = cell.c;
  do {
    col = String.fromCharCode(65 + (c % 26)) + col;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);
  return col + (cell.r + 1);
}

/** 범위 → 참조 문자열 (e.g. "A1:D10") */
function encodeRange(range: { s: { r: number; c: number }; e: { r: number; c: number } }): string {
  return encodeCell(range.s) + ':' + encodeCell(range.e);
}

// ============================================================================
// SheetCtx — 시트 빌더 컨텍스트
// ============================================================================

export interface SheetCtx {
  ws: XLSX.WorkSheet;
  merges: XLSX.Range[];
  rows: XLSX.RowInfo[];
  r: number;
  lastCol: number;
  colWidths: number[];
}

export function createCtx(colWidths: number[]): SheetCtx {
  return { ws: {}, merges: [], rows: [], r: 0, lastCol: colWidths.length - 1, colWidths };
}

/** 열 범위의 합산 너비(wch) 계산 (병합 셀용) */
export function sumColWidths(ctx: SheetCtx, cStart: number, cEnd: number): number {
  let total = 0;
  for (let c = cStart; c <= cEnd; c++) {
    total += ctx.colWidths[c] ?? 10;
  }
  return total;
}

// ============================================================================
// 시트 빌더 헬퍼
// ============================================================================

/** 셀에 값+스타일 적용 */
export function setCell(ws: XLSX.WorkSheet, r: number, c: number, value: string | number, style: XLSX.CellStyle): void {
  const ref = encodeCell({ r, c });
  ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
}

/** 행 전체에 스타일 적용 (빈 셀 생성) */
export function fillRow(ws: XLSX.WorkSheet, r: number, cStart: number, cEnd: number, style: XLSX.CellStyle): void {
  for (let c = cStart; c <= cEnd; c++) {
    const ref = encodeCell({ r, c });
    if (!ws[ref]) ws[ref] = { v: '', t: 's' };
    ws[ref].s = style;
  }
}

/** 빈 행 추가 */
export function addBlankRow(ctx: SheetCtx, height: number): void {
  fillRow(ctx.ws, ctx.r, 0, ctx.lastCol, STYLE.blank);
  ctx.rows[ctx.r] = { hpt: height };
  ctx.r++;
}

/** 병합 행 추가 (전체 열 병합). height를 지정하지 않으면 자동 계산 */
export function addMergedRow(ctx: SheetCtx, text: string, style: XLSX.CellStyle, height?: number): void {
  const mergedWidth = sumColWidths(ctx, 0, ctx.lastCol);
  const h = height ?? calcRowHeight(text, mergedWidth);
  setCell(ctx.ws, ctx.r, 0, text, style);
  fillRow(ctx.ws, ctx.r, 0, ctx.lastCol, style);
  ctx.merges.push({ s: { r: ctx.r, c: 0 }, e: { r: ctx.r, c: ctx.lastCol } });
  ctx.rows[ctx.r] = { hpt: h };
  ctx.r++;
}

/** 섹션 헤더 (■ 접두어, 자주색 배경) */
export function addSectionHeader(ctx: SheetCtx, title: string): void {
  addMergedRow(ctx, `■ ${title}`, STYLE.sectionHeader, 28);
}

/** 소섹션 헤더 (▸ 접두어, 연한 라벤더 배경) */
export function addSubSection(ctx: SheetCtx, title: string): void {
  addMergedRow(ctx, `▸ ${title}`, STYLE.subSection, 24);
}

/** 레이블-값 행 (A=레이블, B~lastCol=값 병합) */
export function addLabelValueRow(ctx: SheetCtx, label: string, value: string, height?: number): void {
  const mergedWidth = sumColWidths(ctx, 1, ctx.lastCol);
  const h = height ?? calcRowHeight(value, mergedWidth);
  setCell(ctx.ws, ctx.r, 0, label, STYLE.label);
  setCell(ctx.ws, ctx.r, 1, value, STYLE.value);
  fillRow(ctx.ws, ctx.r, 1, ctx.lastCol, STYLE.value);
  ctx.merges.push({ s: { r: ctx.r, c: 1 }, e: { r: ctx.r, c: ctx.lastCol } });
  ctx.rows[ctx.r] = { hpt: h };
  ctx.r++;
}

/** 레이블-값 쌍 배열 일괄 추가 */
export function addLabelValueRows(ctx: SheetCtx, pairs: [string, string][], fixedHeight?: number): void {
  for (const [label, value] of pairs) {
    addLabelValueRow(ctx, label, value, fixedHeight);
  }
}

/** 번호 매기기 리스트 섹션 (PBL용) */
export function addListSection(ctx: SheetCtx, title: string, items: string[] | undefined): void {
  if (!items || items.length === 0) return;
  addSubSection(ctx, title);
  const mergedWidth = sumColWidths(ctx, 0, ctx.lastCol);
  items.forEach((item, i) => {
    const text = `${i + 1}. ${item}`;
    addMergedRow(ctx, text, STYLE.value, calcRowHeight(text, mergedWidth));
  });
  addBlankRow(ctx, 10);
}

/** 텍스트 블록 섹션 (PBL용) */
export function addTextSection(ctx: SheetCtx, title: string, text: string | undefined): void {
  if (!text) return;
  addSubSection(ctx, title);
  const mergedWidth = sumColWidths(ctx, 0, ctx.lastCol);
  addMergedRow(ctx, text, STYLE.value, calcRowHeight(text, mergedWidth));
  addBlankRow(ctx, 10);
}

/** 시트 마무리 (범위/병합/행높이/열너비 설정) */
export function finalizeSheet(ctx: SheetCtx): XLSX.WorkSheet {
  ctx.ws['!ref'] = encodeRange({ s: { r: 0, c: 0 }, e: { r: ctx.r - 1, c: ctx.lastCol } });
  ctx.ws['!merges'] = ctx.merges;
  ctx.ws['!rows'] = ctx.rows;
  ctx.ws['!cols'] = ctx.colWidths.map(w => ({ wch: w }));
  return ctx.ws;
}
