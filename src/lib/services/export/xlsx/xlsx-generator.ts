/**
 * XLSX 생성기
 * 4개 시트 생성 + generateXLSX/downloadXLSX 메인 함수
 *
 * 시트 구성:
 *   1. 개요 — 보고서 제목 + 기업명 + 버전/일자 + 진단 요약
 *   2. 과정 체계도 — N×M 매트릭스 (과정번호+이름+시간 통합) + 합계 행
 *   3. 교육 과정 상세 — 과정별 세로 카드 (No.1부터 순번)
 *   4. PBL 프로그램 — PBL 전체 상세
 */

import * as XLSX from 'xlsx-js-style';
import type { RoadmapExportData } from '../../export-pdf';
import { getLevelLabel } from '@/lib/utils/roadmap';

import { COLOR, NO_BORDER, STYLE, tableBodyStyle, tableBodyCenterStyle } from './xlsx-styles';
import {
  getStatusLabel,
  formatDate,
  buildCourseNumberMap,
  formatMatrixCell,
  sumMatrixHours,
  formatTools,
  calcRowHeight,
  formatHours,
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
  addListSection,
  addTextSection,
  finalizeSheet,
} from './xlsx-sheet-builder';

// ============================================================================
// 시트 1: 개요
// ============================================================================

function createOverviewSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const COL_W = [14, 30, 30, 30];
  const ctx = createCtx(COL_W);

  addBlankRow(ctx, 20);
  addMergedRow(ctx, 'AI 교육 훈련 로드맵', STYLE.title, 40);
  addBlankRow(ctx, 10);
  addMergedRow(ctx, data.companyName, STYLE.company, 30);
  addBlankRow(ctx, 15);

  // 메타 정보 (레이블-값이 2열만 사용, 나머지 빈칸)
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
  addMergedRow(ctx, data.diagnosisSummary, STYLE.diagnosis, Math.max(60, calcRowHeight(data.diagnosisSummary, diagWidth)));

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 2: 과정 체계도
// ============================================================================

function createMatrixSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const COL_W = [16, 36, 36, 36];
  const ctx = createCtx(COL_W);
  const numberMap = buildCourseNumberMap(data.courses);

  addSectionHeader(ctx, '과정 체계도');
  addBlankRow(ctx, 6);

  // 테이블 헤더
  ['업무', '초급', '중급', '고급'].forEach((h, c) => setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader));
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;

  // 데이터 행 + 합계 집계
  const totals = [0, 0, 0]; // [초급, 중급, 고급]
  data.roadmapMatrix.forEach((row, idx) => {
    const alt = idx % 2 === 1;
    const levelCells = [row.beginner, row.intermediate, row.advanced];
    const texts = levelCells.map(cells => formatMatrixCell(cells, numberMap));

    setCell(ctx.ws, ctx.r, 0, row.task_name, {
      ...tableBodyStyle(alt),
      font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.BODY_TEXT } },
    });
    texts.forEach((text, c) => setCell(ctx.ws, ctx.r, c + 1, text, tableBodyStyle(alt)));

    // 각 열 텍스트의 높이를 해당 열 너비로 계산 후 최대값 사용
    const rowHeight = Math.max(
      calcRowHeight(row.task_name, COL_W[0], 30),
      ...texts.map((t, c) => calcRowHeight(t, COL_W[c + 1], 30)),
    );
    ctx.rows[ctx.r] = { hpt: rowHeight };
    levelCells.forEach((cells, i) => { totals[i] += sumMatrixHours(cells); });
    ctx.r++;
  });

  // 합계 행
  const grandTotal = totals[0] + totals[1] + totals[2];
  setCell(ctx.ws, ctx.r, 0, '합계', STYLE.totalLabel);
  totals.forEach((t, i) => setCell(ctx.ws, ctx.r, i + 1, formatHours(t), STYLE.total));
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;

  // 전체 합계
  const grandTotalLabelStyle: XLSX.CellStyle = {
    font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: COLOR.ACCENT } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: NO_BORDER,
  };
  const grandTotalValueStyle: XLSX.CellStyle = {
    font: { name: '맑은 고딕', sz: 10, bold: true, color: { rgb: COLOR.ACCENT } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: NO_BORDER,
  };
  setCell(ctx.ws, ctx.r, 0, '', STYLE.blank);
  setCell(ctx.ws, ctx.r, 1, '', STYLE.blank);
  setCell(ctx.ws, ctx.r, 2, '전체 합계', grandTotalLabelStyle);
  setCell(ctx.ws, ctx.r, 3, `${grandTotal}시간`, grandTotalValueStyle);
  ctx.rows[ctx.r] = { hpt: 24 };
  ctx.r++;

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 3: 교육 과정 상세
// ============================================================================

function createCoursesSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const COL_W = [10, 20, 28, 16, 34];
  const ctx = createCtx(COL_W);
  const detailsMergedW = COL_W[2] + COL_W[3]; // C-D 병합 너비

  data.courses.forEach((course, idx) => {
    // 과정 제목
    addMergedRow(ctx, `No.${idx + 1}  ${course.course_name}`, STYLE.courseHeader, 30);
    addBlankRow(ctx, 6);

    // 프로파일
    addLabelValueRows(ctx, [
      ['과정 목표', course.expected_outcome || '-'],
      ['교육 대상', course.target_audience || '-'],
      ['대상 업무', course.target_task || '-'],
      ['난이도', getLevelLabel(course.level)],
      ['교육 시간', `${course.recommended_hours}시간`],
      ['사용 도구', formatTools(course.tools)],
      ['선수 조건', course.prerequisites?.length > 0 ? course.prerequisites.join(', ') : '없음'],
    ]);
    addBlankRow(ctx, 8);

    // 커리큘럼
    addSubSection(ctx, '커리큘럼');

    const currHeaders = ['시간', '학습 모듈', '세부 커리큘럼', '', '실습/과제'];
    currHeaders.forEach((h, c) => setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader));
    ctx.merges.push({ s: { r: ctx.r, c: 2 }, e: { r: ctx.r, c: 3 } });
    ctx.rows[ctx.r] = { hpt: 24 };
    ctx.r++;

    (course.curriculum || []).forEach((module, mIdx) => {
      const alt = mIdx % 2 === 1;
      const detailsText = module.details?.map(d => `• ${d}`).join('\n') || '-';
      const practiceText = module.practice || '-';

      setCell(ctx.ws, ctx.r, 0, `${module.hours}H`, tableBodyCenterStyle(alt));
      setCell(ctx.ws, ctx.r, 1, module.module_name, tableBodyStyle(alt));
      setCell(ctx.ws, ctx.r, 2, detailsText, tableBodyStyle(alt));
      fillRow(ctx.ws, ctx.r, 3, 3, tableBodyStyle(alt));
      ctx.merges.push({ s: { r: ctx.r, c: 2 }, e: { r: ctx.r, c: 3 } });
      setCell(ctx.ws, ctx.r, 4, practiceText, tableBodyStyle(alt));

      // 모든 텍스트 열의 높이를 계산하여 최대값 사용
      const rowHeight = Math.max(
        calcRowHeight(module.module_name, COL_W[1], 24),
        calcRowHeight(detailsText, detailsMergedW, 24),
        calcRowHeight(practiceText, COL_W[4], 24),
      );
      ctx.rows[ctx.r] = { hpt: rowHeight };
      ctx.r++;
    });
    addBlankRow(ctx, 8);

    // 기대효과 & 측정방법
    addSubSection(ctx, '기대효과 및 측정');
    addLabelValueRows(ctx, [
      ['기대효과', course.expected_outcome || '-'],
      ['측정 방법', course.measurement_method || '-'],
    ]);

    // 과정 사이 간격
    if (idx < data.courses.length - 1) {
      addBlankRow(ctx, 12);
      addBlankRow(ctx, 12);
    }
  });

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 4: PBL 프로그램
// ============================================================================

function createPBLSheet(data: RoadmapExportData): XLSX.WorkSheet {
  const COL_W = [20, 8, 32, 28, 24, 30];
  const ctx = createCtx(COL_W);
  const pbl = data.pblCourse;

  addSectionHeader(ctx, 'PBL 프로그램');
  addBlankRow(ctx, 10);

  // 선정된 과정 정보
  addSubSection(ctx, '선정된 과정 정보');
  addLabelValueRows(ctx, [
    ['과정명', pbl.selected_course_name || '-'],
    ['난이도', pbl.selected_course_level ? getLevelLabel(pbl.selected_course_level) : '-'],
    ['대상 업무', pbl.selected_course_task || '-'],
  ], 22);
  addBlankRow(ctx, 10);

  // 선정 근거
  addSubSection(ctx, 'PBL 과정 선정 근거');
  const rationale = pbl.selection_rationale;
  addLabelValueRows(ctx, [
    ['컨설턴트 전문성 적합도', rationale?.consultant_expertise_fit || '-'],
    ['페인포인트 연관성', rationale?.pain_point_alignment || '-'],
    ['현실 가능성 평가', rationale?.feasibility_assessment || '-'],
    ['종합 선정 이유', rationale?.summary || '-'],
  ]);
  addBlankRow(ctx, 10);

  // 과정 개요
  addSubSection(ctx, 'PBL 과정 개요');
  addLabelValueRows(ctx, [
    ['과정명', pbl.course_name || '-'],
    ['총 교육시간', `${pbl.total_hours}시간`],
    ['교육 대상', pbl.target_audience || '-'],
    ['대상 업무', pbl.target_tasks?.join(', ') || '-'],
  ], 22);
  addBlankRow(ctx, 10);

  // 커리큘럼 테이블
  addSubSection(ctx, 'PBL 커리큘럼');

  ['모듈명', '시간', '세부 내용', '실습', '모듈 산출물', '사용 도구 (무료 범위)']
    .forEach((h, c) => setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader));
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;

  (pbl.curriculum || []).forEach((module, mIdx) => {
    const alt = mIdx % 2 === 1;
    const detailsText = module.details?.map(d => `• ${d}`).join('\n') || '-';
    const practiceText = module.practice || '-';
    const deliverablesText = module.deliverables?.join(', ') || '-';
    const toolsText = module.tools?.map(t => `${t.name} (${t.free_tier_info})`).join('\n') || '-';

    setCell(ctx.ws, ctx.r, 0, module.module_name, tableBodyStyle(alt));
    setCell(ctx.ws, ctx.r, 1, `${module.hours}H`, tableBodyCenterStyle(alt));
    setCell(ctx.ws, ctx.r, 2, detailsText, tableBodyStyle(alt));
    setCell(ctx.ws, ctx.r, 3, practiceText, tableBodyStyle(alt));
    setCell(ctx.ws, ctx.r, 4, deliverablesText, tableBodyStyle(alt));
    setCell(ctx.ws, ctx.r, 5, toolsText, tableBodyStyle(alt));

    // 모든 텍스트 열의 높이를 계산하여 최대값 사용
    const rowHeight = Math.max(
      calcRowHeight(module.module_name, COL_W[0], 26),
      calcRowHeight(detailsText, COL_W[2], 26),
      calcRowHeight(practiceText, COL_W[3], 26),
      calcRowHeight(deliverablesText, COL_W[4], 26),
      calcRowHeight(toolsText, COL_W[5], 26),
    );
    ctx.rows[ctx.r] = { hpt: rowHeight };
    ctx.r++;
  });
  addBlankRow(ctx, 10);

  // 하단 섹션들
  addListSection(ctx, '최종 산출물', pbl.final_deliverables);
  addTextSection(ctx, '비즈니스 임팩트', pbl.business_impact);
  addListSection(ctx, '기대효과', pbl.expected_outcomes);
  addListSection(ctx, '측정 방법', pbl.measurement_methods);
  addListSection(ctx, '준비물', pbl.prerequisites);

  return finalizeSheet(ctx);
}

// ============================================================================
// 메인 함수
// ============================================================================

export function generateXLSX(data: RoadmapExportData): Uint8Array {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, createOverviewSheet(data), '개요');
  XLSX.utils.book_append_sheet(workbook, createMatrixSheet(data), '과정 체계도');
  XLSX.utils.book_append_sheet(workbook, createCoursesSheet(data), '교육 과정 상세');
  XLSX.utils.book_append_sheet(workbook, createPBLSheet(data), 'PBL 프로그램');

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export function downloadXLSX(data: RoadmapExportData, filename: string): void {
  const buffer = generateXLSX(data);

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
