/**
 * XLSX 생성기 (산인공 공식 양식 4섹션)
 *
 * 시트 구성:
 *   1. 개요           — 보고서 제목 + 기업명 + 버전/일자 + 진단 요약
 *   2. 역량모델링     — Ⅲ-1. RoadmapCompetency 테이블
 *   3. 훈련체계도     — Ⅲ-2. 역량 × 수준 매트릭스
 *   4. 연간계획       — Ⅲ-3. 연간 훈련계획 테이블 + 활용방안
 *   5. 명세서         — Ⅲ-4. 훈련과정 명세서 카드 + 교과목 테이블
 */

import type * as XLSX from 'xlsx-js-style';
import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlan,
  RoadmapCourseSpec,
} from '../../roadmap/roadmap-types';
import { buildTrainingStructureTable } from '../../roadmap/roadmap-matrix-builder';
import type { RoadmapExportData } from '../../export-pdf';
import { COLOR, NO_BORDER, STYLE, tableBodyStyle, tableBodyCenterStyle } from './xlsx-styles';
import {
  getStatusLabel,
  formatDate,
  formatHours,
  formatBulletLines,
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
  addTextSection,
  finalizeSheet,
} from './xlsx-sheet-builder';

// ============================================================================
// 시트별 열 너비 상수 (wch 단위)
// ============================================================================

/** 개요: [라벨, 값, 값, 값] */
const OVERVIEW_COL_WIDTHS = [14, 30, 30, 30];
/** 역량모델링: [역량명, 정의, 지식, 기술, 태도, NCS, NCS 방법] */
const COMPETENCY_COL_WIDTHS = [18, 26, 20, 20, 20, 10, 24];
/** 훈련체계도: [구분(역량명), 훈련수준, 훈련내용, 훈련대상, 훈련방법, 훈련목표] (양식 Ⅲ-2 6열) */
const STRUCTURE_COL_WIDTHS = [18, 10, 30, 18, 16, 28];
/** 연간계획: [역량명, 과정명, 형태, 시간, 비고] */
const ANNUAL_COL_WIDTHS = [20, 32, 14, 12, 22];
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
    Math.max(60, calcRowHeight(data.diagnosisSummary || '-', diagWidth)),
  );

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 2: 역량모델링 (Ⅲ-1)
// ============================================================================

export interface CompetencySheetNcsInfo {
  ncsUsed: boolean;
  ncsMethodology: string;
  ncsDerivationMethod: string;
}

export function buildCompetencySheet(
  competencies: RoadmapCompetency[],
  ncsInfo?: CompetencySheetNcsInfo,
): XLSX.WorkSheet {
  const COL_W = COMPETENCY_COL_WIDTHS;
  const ctx = createCtx(COL_W);

  addSectionHeader(ctx, 'Ⅲ-1. 역량 모델링');
  addBlankRow(ctx, 6);

  // 역량 표 (NCS 열 제거 — 표 전체 단위로 하단 박스 렌더)
  const headers = ['역량명', '정의(수행준거)', '지식(학술, 업무지식)', '기술(기능)', '태도'];
  headers.forEach((h, c) => setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader));
  ctx.rows[ctx.r] = { hpt: 28 };
  ctx.r++;

  const list = competencies ?? [];
  if (list.length === 0) {
    setCell(ctx.ws, ctx.r, 0, '-', tableBodyStyle(false));
    for (let c = 1; c < headers.length; c++) {
      setCell(ctx.ws, ctx.r, c, '-', tableBodyStyle(false));
    }
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;
  } else {
    list.forEach((comp, idx) => {
      const alt = idx % 2 === 1;
      const knowledge = formatBulletLines(comp.knowledge);
      const skills = formatBulletLines(comp.skills);
      const attitudes = formatBulletLines(comp.attitudes);

      setCell(ctx.ws, ctx.r, 0, comp.name || '-', {
        ...tableBodyStyle(alt),
        font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
      });
      setCell(ctx.ws, ctx.r, 1, comp.definition || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 2, knowledge, tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 3, skills, tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 4, attitudes, tableBodyStyle(alt));

      const rowHeight = Math.max(
        calcRowHeight(comp.name || '-', COL_W[0], 26),
        calcRowHeight(comp.definition || '-', COL_W[1], 26),
        calcRowHeight(knowledge, COL_W[2], 26),
        calcRowHeight(skills, COL_W[3], 26),
        calcRowHeight(attitudes, COL_W[4], 26),
      );
      ctx.rows[ctx.r] = { hpt: rowHeight };
      ctx.r++;
    });
  }

  // NCS 활용 방법 / 역량별 도출 방법 (표 전체 단위 별도 박스)
  if (ncsInfo) {
    addBlankRow(ctx, 1);
    const label = ncsInfo.ncsUsed ? 'NCS 활용 방법' : '역량별 도출 방법';
    const body = ncsInfo.ncsUsed
      ? ncsInfo.ncsMethodology || '-'
      : ncsInfo.ncsDerivationMethod || '-';

    setCell(ctx.ws, ctx.r, 0, label, STYLE.tableHeader);
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;

    setCell(ctx.ws, ctx.r, 0, body, tableBodyStyle(false));
    const combinedWidth = COL_W.reduce((acc, w) => acc + w, 0);
    ctx.rows[ctx.r] = { hpt: calcRowHeight(body, combinedWidth, 28) };
    ctx.r++;
  }

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 3: 훈련체계도 (Ⅲ-2)
// ============================================================================

export function buildStructureSheet(
  competencies: RoadmapCompetency[],
  structure: RoadmapTrainingStructureItem[],
  trainingStructureMethod?: string,
): XLSX.WorkSheet {
  const COL_W = STRUCTURE_COL_WIDTHS;
  const ctx = createCtx(COL_W);

  addSectionHeader(ctx, 'Ⅲ-2. 훈련체계도');
  addBlankRow(ctx, 6);

  // 양식 1번 Ⅲ-2 그대로 6열: 구분(역량명) · 훈련수준 · 훈련내용 · 훈련대상 · 훈련방법 · 훈련목표
  ['구분(역량명)', '훈련수준', '훈련내용', '훈련대상', '훈련방법', '훈련목표'].forEach((h, c) =>
    setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader),
  );
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;

  const tableRows = buildTrainingStructureTable(competencies ?? [], structure ?? []);

  if (tableRows.length === 0) {
    for (let c = 0; c <= ctx.lastCol; c++) {
      setCell(ctx.ws, ctx.r, c, '-', tableBodyStyle(false));
    }
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;
  } else {
    tableRows.forEach((row, idx) => {
      const alt = idx % 2 === 1;

      setCell(ctx.ws, ctx.r, 0, row.competency_name || '-', {
        ...tableBodyStyle(alt),
        font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
      });
      setCell(ctx.ws, ctx.r, 1, row.level_label, tableBodyCenterStyle(alt));
      setCell(ctx.ws, ctx.r, 2, row.content || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 3, row.target_audience || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 4, row.method || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 5, row.goal || '-', tableBodyStyle(alt));

      const rowHeight = Math.max(
        calcRowHeight(row.competency_name || '-', COL_W[0], 24),
        calcRowHeight(row.content || '-', COL_W[2], 24),
        calcRowHeight(row.target_audience || '-', COL_W[3], 24),
        calcRowHeight(row.method || '-', COL_W[4], 24),
        calcRowHeight(row.goal || '-', COL_W[5], 24),
      );
      ctx.rows[ctx.r] = { hpt: rowHeight };
      ctx.r++;
    });
  }

  // 훈련체계 수립 방법 (양식 Ⅲ-2)
  const method = (trainingStructureMethod ?? '').trim();
  if (method !== '') {
    addBlankRow(ctx, 1);
    setCell(ctx.ws, ctx.r, 0, '훈련체계 수립 방법', STYLE.tableHeader);
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;

    setCell(ctx.ws, ctx.r, 0, method, tableBodyStyle(false));
    const combinedWidth = COL_W.reduce((acc, w) => acc + w, 0);
    ctx.rows[ctx.r] = { hpt: calcRowHeight(method, combinedWidth, 28) };
    ctx.r++;
  }

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 4: 연간계획 (Ⅲ-3)
// ============================================================================

export function buildAnnualPlanSheet(plan: RoadmapAnnualPlan | undefined): XLSX.WorkSheet {
  const COL_W = ANNUAL_COL_WIDTHS;
  const ctx = createCtx(COL_W);
  const items = plan?.items ?? [];
  const usagePlan = plan?.usage_plan ?? '';

  addSectionHeader(ctx, 'Ⅲ-3. 연간 훈련계획');
  addBlankRow(ctx, 6);

  // 테이블 헤더
  ['역량명', '훈련과정명', '훈련형태', '훈련시간', '비고'].forEach((h, c) =>
    setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader),
  );
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;

  let totalHours = 0;
  if (items.length === 0) {
    for (let c = 0; c <= ctx.lastCol; c++) {
      setCell(ctx.ws, ctx.r, c, '-', tableBodyStyle(false));
    }
    ctx.rows[ctx.r] = { hpt: 22 };
    ctx.r++;
  } else {
    items.forEach((item, idx) => {
      const alt = idx % 2 === 1;
      setCell(ctx.ws, ctx.r, 0, item.competency_name || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 1, item.course_name || '-', tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 2, item.format || '-', tableBodyCenterStyle(alt));
      setCell(ctx.ws, ctx.r, 3, formatHours(item.hours ?? 0), tableBodyCenterStyle(alt));
      setCell(ctx.ws, ctx.r, 4, item.notes || '-', tableBodyStyle(alt));

      const rowHeight = Math.max(
        calcRowHeight(item.course_name || '-', COL_W[1], 24),
        calcRowHeight(item.notes || '-', COL_W[4], 24),
      );
      ctx.rows[ctx.r] = { hpt: rowHeight };
      totalHours += item.hours ?? 0;
      ctx.r++;
    });

    // 합계 행
    setCell(ctx.ws, ctx.r, 0, '합계', STYLE.totalLabel);
    setCell(ctx.ws, ctx.r, 1, '', STYLE.total);
    setCell(ctx.ws, ctx.r, 2, '', STYLE.total);
    setCell(ctx.ws, ctx.r, 3, formatHours(totalHours), STYLE.total);
    setCell(ctx.ws, ctx.r, 4, '', STYLE.total);
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;
  }

  addBlankRow(ctx, 10);

  // 활용방안
  addTextSection(ctx, '활용방안', usagePlan || '-');

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 5: 명세서 (Ⅲ-4)
// ============================================================================

export function buildCourseSpecSheet(specs: RoadmapCourseSpec[]): XLSX.WorkSheet {
  const COL_W = COURSESPEC_COL_WIDTHS;
  const ctx = createCtx(COL_W);

  addSectionHeader(ctx, 'Ⅲ-4. 훈련과정 명세서');
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

    // 메타/본문 라벨-값
    addLabelValueRows(ctx, [
      ['훈련형태', spec.format || '-'],
      ['추천 훈련사업', spec.recommended_program || '-'],
      ['훈련목표', spec.goal || '-'],
      ['주요 훈련내용', spec.main_content || '-'],
      ['훈련대상', spec.target_audience || '-'],
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
        setCell(ctx.ws, ctx.r, 0, sub.name || '-', tableBodyStyle(alt));
        setCell(ctx.ws, ctx.r, 1, sub.details || '-', tableBodyStyle(alt));
        setCell(ctx.ws, ctx.r, 2, formatHours(sub.hours ?? 0), tableBodyCenterStyle(alt));
        fillRow(ctx.ws, ctx.r, 3, ctx.lastCol, STYLE.blank);

        const rowHeight = Math.max(
          calcRowHeight(sub.name || '-', COL_W[0], 24),
          calcRowHeight(sub.details || '-', COL_W[1], 24),
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

/** 로드맵 데이터를 5개 시트(개요/역량/체계도/연간/명세서)로 구성된 XLSX 바이트 배열로 변환 */
export async function generateXLSX(data: RoadmapExportData): Promise<Uint8Array> {
  const XLSX = await import('xlsx-js-style');
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, buildOverviewSheet(data), '개요');
  XLSX.utils.book_append_sheet(
    workbook,
    buildCompetencySheet(data.competencies, {
      ncsUsed: data.ncsUsed ?? false,
      ncsMethodology: data.ncsMethodology ?? '',
      ncsDerivationMethod: data.ncsDerivationMethod ?? '',
    }),
    '역량모델링',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildStructureSheet(data.competencies, data.trainingStructure, data.trainingStructureMethod),
    '훈련체계도',
  );
  XLSX.utils.book_append_sheet(workbook, buildAnnualPlanSheet(data.annualPlan), '연간계획');
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
