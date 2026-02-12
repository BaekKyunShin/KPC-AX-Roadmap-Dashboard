/**
 * XLSX 스타일 상수
 * 색상, 테두리, 폰트, 정렬 프리셋 정의
 */

import type * as XLSX from 'xlsx-js-style';

// ============================================================================
// 색상 상수
// ============================================================================

const BRAND_PURPLE = '663399';

export const COLOR = {
  HEADER_BG: BRAND_PURPLE,
  HEADER_TEXT: 'FFFFFF',
  SECTION_BG: 'F5F3F9',
  LABEL_BG: 'F0ECF5',
  ALT_ROW: 'FAFAFA',
  BORDER: 'D0D0D0',
  BODY_TEXT: '333333',
  MUTED_TEXT: '787878',
  ACCENT: BRAND_PURPLE,
  TOTAL_BG: 'EDE8F5',
} as const;

// ============================================================================
// 테두리 & 스타일 상수
// ============================================================================

export const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: COLOR.BORDER } },
  bottom: { style: 'thin' as const, color: { rgb: COLOR.BORDER } },
  left: { style: 'thin' as const, color: { rgb: COLOR.BORDER } },
  right: { style: 'thin' as const, color: { rgb: COLOR.BORDER } },
};

export const NO_BORDER = {} as NonNullable<XLSX.CellStyle['border']>;

/** 파라미터 없는 불변 스타일 프리셋 */
export const STYLE = {
  title: {
    font: { name: '맑은 고딕', sz: 18, bold: true, color: { rgb: COLOR.ACCENT } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: NO_BORDER,
  },
  company: {
    font: { name: '맑은 고딕', sz: 13, bold: true, color: { rgb: COLOR.BODY_TEXT } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const },
    border: NO_BORDER,
  },
  sectionHeader: {
    font: { name: '맑은 고딕', sz: 11, bold: true, color: { rgb: COLOR.HEADER_TEXT } },
    fill: { fgColor: { rgb: COLOR.HEADER_BG } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  subSection: {
    font: { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: COLOR.ACCENT } },
    fill: { fgColor: { rgb: COLOR.SECTION_BG } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  label: {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
    fill: { fgColor: { rgb: COLOR.LABEL_BG } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  value: {
    font: { name: '맑은 고딕', sz: 9, color: { rgb: COLOR.BODY_TEXT } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  tableHeader: {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.HEADER_TEXT } },
    fill: { fgColor: { rgb: COLOR.HEADER_BG } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  total: {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
    fill: { fgColor: { rgb: COLOR.TOTAL_BG } },
    alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  totalLabel: {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
    fill: { fgColor: { rgb: COLOR.TOTAL_BG } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true },
    border: THIN_BORDER,
  },
  metaLabel: {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.MUTED_TEXT } },
    alignment: { horizontal: 'right' as const, vertical: 'center' as const },
    border: NO_BORDER,
  },
  metaValue: {
    font: { name: '맑은 고딕', sz: 9, color: { rgb: COLOR.BODY_TEXT } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: NO_BORDER,
  },
  diagnosis: {
    font: { name: '맑은 고딕', sz: 9, color: { rgb: COLOR.BODY_TEXT } },
    alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true },
    border: THIN_BORDER,
  },
  blank: { border: NO_BORDER } as XLSX.CellStyle,
  courseHeader: {
    font: { name: '맑은 고딕', sz: 11, bold: true, color: { rgb: COLOR.HEADER_TEXT } },
    fill: { fgColor: { rgb: COLOR.HEADER_BG } },
    alignment: { horizontal: 'left' as const, vertical: 'center' as const },
    border: THIN_BORDER,
  },
} as const;

/** 교대행 여부에 따른 테이블 본문 스타일 (4종 캐싱) */
const TABLE_BODY: Record<'normal' | 'alt', XLSX.CellStyle> = {
  normal: {
    font: { name: '맑은 고딕', sz: 9, color: { rgb: COLOR.BODY_TEXT } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
  },
  alt: {
    font: { name: '맑은 고딕', sz: 9, color: { rgb: COLOR.BODY_TEXT } },
    fill: { fgColor: { rgb: COLOR.ALT_ROW } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: THIN_BORDER,
  },
};

const TABLE_BODY_CENTER: Record<'normal' | 'alt', XLSX.CellStyle> = {
  normal: { ...TABLE_BODY.normal, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
  alt: { ...TABLE_BODY.alt, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } },
};

export function tableBodyStyle(alt: boolean): XLSX.CellStyle {
  return alt ? TABLE_BODY.alt : TABLE_BODY.normal;
}

export function tableBodyCenterStyle(alt: boolean): XLSX.CellStyle {
  return alt ? TABLE_BODY_CENTER.alt : TABLE_BODY_CENTER.normal;
}
