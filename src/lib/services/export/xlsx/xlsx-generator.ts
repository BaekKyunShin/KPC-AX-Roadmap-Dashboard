/**
 * XLSX 생성기 (산인공 공식 양식 v2)
 *
 * 시트 구성:
 *   1. 개요     — 보고서 제목 + 기업명 + 버전/일자 + 진단 요약
 *   2. 명세서   — Ⅲ. 훈련실시 계획 제안 (훈련과정 명세서 카드 + 교과목 테이블)
 *
 * v1 대비 삭제 (신규 양식에서 해당 표가 전부 제거됨):
 *   - 역량모델링 (Ⅲ-1) · 훈련체계도 (Ⅲ-2) · 연간계획 (Ⅲ-3) 3개 시트
 */

import type * as XLSX from 'xlsx-js-style';
import type { RoadmapCourseSpec } from '../../roadmap/roadmap-types';
import { splitByUnit } from '@/lib/utils/list-format';
import type { RoadmapExportData } from '../../export-pdf';
import { COLOR, NO_BORDER, STYLE, tableBodyStyle, tableBodyCenterStyle } from './xlsx-styles';
import {
  getStatusLabel,
  formatDate,
  getLevelLabel,
  formatHours,
  sumSubjectHours,
  calcRowHeight,
} from './xlsx-formatter';
import {
  createCtx,
  sumColWidths,
  setCell,
  fillRow,
  addBlankRow,
  addMergedRow,
  addSectionHeader,
  addSubSection,
  addLabelValueRows,
  finalizeSheet,
} from './xlsx-sheet-builder';

// ============================================================================
// 시트별 열 너비 상수 (wch 단위)
// ============================================================================

/** 개요: [라벨, 값, 값, 값] */
const OVERVIEW_COL_WIDTHS = [14, 30, 30, 30];
/** 명세서: [과목명/라벨, 세부내용, 시간/값, 값, 값] */
const COURSESPEC_COL_WIDTHS = [20, 34, 14, 20, 20];

// ============================================================================
// 시트 1: 개요
// ============================================================================

export function buildOverviewSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const COL_W = OVERVIEW_COL_WIDTHS;
  const ctx = createCtx(COL_W);

  addBlankRow(ctx, 20);
  addMergedRow(ctx, 'AI 교육 훈련 로드맵', STYLE.title, 40);
  addBlankRow(ctx, 10);
  addMergedRow(ctx, data.companyName, STYLE.company, 30);
  addBlankRow(ctx, 15);

  // 메타 정보
  const metaRows: [string, string][] = [
    ['버전', `v${data.versionNumber} ${getStatusLabel(data.status)}`],
    ['생성일', formatDate(data.createdAt)],
    ['확정일', data.finalizedAt ? formatDate(data.finalizedAt) : '-'],
  ];
  for (const [label, value] of metaRows) {
    setCell(ctx.ws, ctx.r, 0, label, STYLE.metaLabel);
    setCell(ctx.ws, ctx.r, 1, value, STYLE.metaValue);
    fillRow(ctx.ws, ctx.r, 2, ctx.lastCol, STYLE.blank);
    ctx.rows[ctx.r] = { hpt: 22 };
    ctx.r++;
  }

  addBlankRow(ctx, 20);
  addSectionHeader(ctx, '진단 요약');
  addBlankRow(ctx, 6);

  const diagWidth = sumColWidths(ctx, 0, ctx.lastCol);
  addMergedRow(
    ctx,
    data.diagnosisSummary || '-',
    STYLE.diagnosis,
    Math.max(60, calcRowHeight(data.diagnosisSummary || '-', diagWidth))
  );

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 2: 명세서 (Ⅲ. 훈련실시 계획 제안)
// ============================================================================

export function buildCourseSpecSheet(specs: RoadmapCourseSpec[]): XLSX.WorkSheet {
  const COL_W = COURSESPEC_COL_WIDTHS;
  const ctx = createCtx(COL_W);

  addSectionHeader(ctx, 'Ⅲ. 훈련실시 계획 제안');
  addBlankRow(ctx, 8);

  const list = specs ?? [];
  if (list.length === 0) {
    addMergedRow(ctx, '등록된 훈련과정이 없습니다.', STYLE.value, 24);
    return finalizeSheet(ctx);
  }

  list.forEach((spec, idx) => {
    // 과정 헤더
    addMergedRow(ctx, `No.${idx + 1}  ${spec.course_name || '-'}`, STYLE.courseHeader, 30);
    addBlankRow(ctx, 6);

    // 메타/본문 라벨-값 (양식 v2 행 순서: 훈련시기 → 훈련수준 → 훈련방법 →
    // 추천 훈련사업 → 훈련대상 → 훈련목표 → 주요 훈련내용)
    addLabelValueRows(ctx, [
      ['훈련시기', spec.training_period || '-'],
      ['훈련수준', getLevelLabel(spec.training_level)],
      ['훈련방법', spec.training_method || '-'],
      ['추천 훈련사업', spec.recommended_program || '-'],
      ['훈련대상', spec.target_audience || '-'],
      ['훈련목표', spec.goal || '-'],
      ['주요 훈련내용', spec.main_content || '-'],
    ]);
    addBlankRow(ctx, 8);

    // 교과목 테이블
    addSubSection(ctx, '교과목');

    ['과목명', '세부내용', '시간', '', ''].forEach((h, c) => {
      if (c < 3) {
        setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader);
      } else {
        setCell(ctx.ws, ctx.r, c, '', STYLE.blank);
      }
    });
    // 3~4열은 빈 헤더(셀 영역 확보용)
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;

    const subjects = spec.subjects ?? [];
    if (subjects.length === 0) {
      setCell(ctx.ws, ctx.r, 0, '-', tableBodyStyle(false));
      setCell(ctx.ws, ctx.r, 1, '-', tableBodyStyle(false));
      setCell(ctx.ws, ctx.r, 2, '-', tableBodyCenterStyle(false));
      fillRow(ctx.ws, ctx.r, 3, ctx.lastCol, STYLE.blank);
      ctx.rows[ctx.r] = { hpt: 22 };
      ctx.r++;
    } else {
      subjects.forEach((sub, sIdx) => {
        const alt = sIdx % 2 === 1;
        const details = splitByUnit(sub.details) || '-';
        setCell(ctx.ws, ctx.r, 0, sub.name || '-', tableBodyStyle(alt));
        setCell(ctx.ws, ctx.r, 1, details, tableBodyStyle(alt));
        setCell(ctx.ws, ctx.r, 2, formatHours(sub.hours ?? 0), tableBodyCenterStyle(alt));
        fillRow(ctx.ws, ctx.r, 3, ctx.lastCol, STYLE.blank);

        const rowHeight = Math.max(
          calcRowHeight(sub.name || '-', COL_W[0], 24),
          calcRowHeight(details, COL_W[1], 24)
        );
        ctx.rows[ctx.r] = { hpt: rowHeight };
        ctx.r++;
      });
    }

    // 시간 합계
    const total = sumSubjectHours(spec);
    const totalLabelStyle: XLSX.CellStyle = {
      font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.ACCENT } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: NO_BORDER,
    };
    const totalValueStyle: XLSX.CellStyle = {
      font: { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: COLOR.ACCENT } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: NO_BORDER,
    };
    setCell(ctx.ws, ctx.r, 0, '', STYLE.blank);
    setCell(ctx.ws, ctx.r, 1, '총 교육시간', totalLabelStyle);
    setCell(ctx.ws, ctx.r, 2, formatHours(total), totalValueStyle);
    fillRow(ctx.ws, ctx.r, 3, ctx.lastCol, STYLE.blank);
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;

    if (idx < list.length - 1) {
      addBlankRow(ctx, 12);
    }
  });

  return finalizeSheet(ctx);
}

// ============================================================================
// 메인 함수
// ============================================================================

/** 로드맵 데이터를 2개 시트(개요/명세서)로 구성된 XLSX 바이트 배열로 변환 */
export async function generateXLSX(data: RoadmapExportData): Promise<Uint8Array> {
  const XLSX = await import('xlsx-js-style');
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, buildOverviewSheet(data), '개요');
  XLSX.utils.book_append_sheet(workbook, buildCourseSpecSheet(data.courseSpecs), '명세서');

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/** XLSX를 생성하고 브라우저에서 다운로드 (DOM a 태그 트리거) */
export async function downloadXLSX(data: RoadmapExportData, filename: string): Promise<void> {
  const buffer = await generateXLSX(data);

  // Uint8Array → ArrayBuffer 복사 (TypeScript strict 모드에서 BlobPart 호환성)
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);

  const blob = new Blob([ab], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
