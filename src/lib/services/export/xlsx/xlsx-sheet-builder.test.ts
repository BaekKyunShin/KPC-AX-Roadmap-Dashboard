/**
 * xlsx-sheet-builder.ts 테스트
 * 셀 참조 인코딩 (XLSX.utils 대체 로직) 및 SheetCtx 헬퍼 검증
 */

import { describe, it, expect } from 'vitest';
import {
  createCtx,
  setCell,
  fillRow,
  finalizeSheet,
  sumColWidths,
} from './xlsx-sheet-builder';

describe('setCell', () => {
  it('A1 셀에 문자열 값을 설정한다', () => {
    const ctx = createCtx([10, 10]);
    setCell(ctx.ws, 0, 0, 'hello', {});
    expect(ctx.ws['A1']).toEqual({ v: 'hello', t: 's', s: {} });
  });

  it('B2 셀에 숫자 값을 설정한다', () => {
    const ctx = createCtx([10, 10]);
    setCell(ctx.ws, 1, 1, 42, {});
    expect(ctx.ws['B2']).toEqual({ v: 42, t: 'n', s: {} });
  });

  it('Z1 (26번째 열) 셀 참조를 올바르게 생성한다', () => {
    const colWidths = Array(27).fill(10);
    const ctx = createCtx(colWidths);
    setCell(ctx.ws, 0, 25, 'Z col', {});
    expect(ctx.ws['Z1']).toBeDefined();
  });

  it('AA1 (27번째 열) 셀 참조를 올바르게 생성한다', () => {
    const colWidths = Array(28).fill(10);
    const ctx = createCtx(colWidths);
    setCell(ctx.ws, 0, 26, 'AA col', {});
    expect(ctx.ws['AA1']).toBeDefined();
  });
});

describe('fillRow', () => {
  it('지정 범위의 빈 셀에 스타일을 적용한다', () => {
    const ctx = createCtx([10, 10, 10]);
    const style = { font: { bold: true } };
    fillRow(ctx.ws, 0, 0, 2, style);

    expect(ctx.ws['A1']?.s).toEqual(style);
    expect(ctx.ws['B1']?.s).toEqual(style);
    expect(ctx.ws['C1']?.s).toEqual(style);
  });

  it('기존 셀의 스타일만 덮어쓴다', () => {
    const ctx = createCtx([10, 10]);
    setCell(ctx.ws, 0, 0, 'existing', {});
    const newStyle = { font: { bold: true } };
    fillRow(ctx.ws, 0, 0, 1, newStyle);

    expect(ctx.ws['A1']?.v).toBe('existing');
    expect(ctx.ws['A1']?.s).toEqual(newStyle);
  });
});

describe('finalizeSheet', () => {
  it('시트 범위(!ref)를 올바르게 설정한다', () => {
    const ctx = createCtx([10, 20, 30]);
    ctx.r = 5; // 5행 사용
    const ws = finalizeSheet(ctx);

    expect(ws['!ref']).toBe('A1:C5');
  });

  it('단일 셀 시트의 범위를 올바르게 설정한다', () => {
    const ctx = createCtx([10]);
    ctx.r = 1;
    const ws = finalizeSheet(ctx);

    expect(ws['!ref']).toBe('A1:A1');
  });

  it('열 너비(!cols)를 설정한다', () => {
    const ctx = createCtx([15, 30]);
    ctx.r = 1;
    const ws = finalizeSheet(ctx);

    expect(ws['!cols']).toEqual([{ wch: 15 }, { wch: 30 }]);
  });
});

describe('sumColWidths', () => {
  it('열 범위의 너비를 합산한다', () => {
    const ctx = createCtx([10, 20, 30, 40]);
    expect(sumColWidths(ctx, 0, 3)).toBe(100);
  });

  it('단일 열 너비를 반환한다', () => {
    const ctx = createCtx([10, 20]);
    expect(sumColWidths(ctx, 1, 1)).toBe(20);
  });
});
