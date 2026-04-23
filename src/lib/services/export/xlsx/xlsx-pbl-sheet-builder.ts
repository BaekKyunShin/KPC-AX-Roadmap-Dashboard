/**
 * PBL XLSX 시트 빌더 (산인공 PBL 양식 2번 Ⅳ장)
 *
 * 시트 구성:
 *   1. 개요          — 표지 + 진단 요약 + Ⅰ장 요약(있으면)
 *   2. 운영계획      — Ⅳ-1 훈련 목표, Ⅳ-2 AI 도구 활용 계획
 *   3. 훈련 실시     — Ⅳ-3 교과목 프로파일 · 시설·장비 · 강사
 *   4. 평가 계획     — Ⅳ-4-가 과정평가 · 나 결과평가 (문항 수)
 */

import type * as XLSX from 'xlsx-js-style';
import type {
  PBLContent,
  PBLOperationPlan,
} from '../../pbl/pbl-types';
import { calcRowHeight, formatBulletLines } from './xlsx-formatter';
import { STYLE, tableBodyCenterStyle, tableBodyStyle } from './xlsx-styles';
import {
  addBlankRow,
  addLabelValueRow,
  addLabelValueRows,
  addMergedRow,
  addSectionHeader,
  addSubSection,
  addTextSection,
  createCtx,
  fillRow,
  finalizeSheet,
  setCell,
  sumColWidths,
} from './xlsx-sheet-builder';

// ============================================================================
// 시트별 열 너비
// ============================================================================

const OVERVIEW_COL = [14, 30, 30, 30];
const OPERATION_COL = [12, 18, 22, 18, 22, 28];
const TRAINING_COL = [20, 28, 12, 14, 14];
const EVALUATION_COL = [18, 40, 14, 16];

// ============================================================================
// 공통: 간단한 테이블 빌더
// ============================================================================

function addTableHeader(ctx: ReturnType<typeof createCtx>, headers: string[]): void {
  headers.forEach((h, c) => setCell(ctx.ws, ctx.r, c, h, STYLE.tableHeader));
  for (let c = headers.length; c <= ctx.lastCol; c++) {
    setCell(ctx.ws, ctx.r, c, '', STYLE.tableHeader);
  }
  ctx.rows[ctx.r] = { hpt: 26 };
  ctx.r++;
}

function addTableRow(
  ctx: ReturnType<typeof createCtx>,
  cells: string[],
  centerIdxSet: Set<number>,
  alt: boolean,
): void {
  let maxH = 22;
  cells.forEach((v, c) => {
    const style = centerIdxSet.has(c) ? tableBodyCenterStyle(alt) : tableBodyStyle(alt);
    setCell(ctx.ws, ctx.r, c, v, style);
    const w = ctx.colWidths[c] ?? 14;
    maxH = Math.max(maxH, calcRowHeight(v, w, 22));
  });
  for (let c = cells.length; c <= ctx.lastCol; c++) {
    setCell(ctx.ws, ctx.r, c, '', tableBodyStyle(alt));
  }
  ctx.rows[ctx.r] = { hpt: maxH };
  ctx.r++;
}

// ============================================================================
// 시트 1: 개요
// ============================================================================

export interface PBLOverviewSheetInput {
  companyName: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  finalizedAt?: string | null;
  diagnosisSummary: string;
  interviewOverview?: {
    courseName: string;
    trainingHours: number;
    traineeCount: number;
    trainingJob: string;
    aiLevel: string;
    trainingGoals: string[];
  };
}

export function buildPBLOverviewSheet(input: PBLOverviewSheetInput): XLSX.WorkSheet {
  const ctx = createCtx(OVERVIEW_COL);

  addBlankRow(ctx, 20);
  addMergedRow(ctx, 'AI PBL 과정개발 보고서', STYLE.title, 40);
  addBlankRow(ctx, 10);
  addMergedRow(ctx, input.companyName, STYLE.company, 30);
  addBlankRow(ctx, 15);

  const metaRows: [string, string][] = [
    ['버전', `v${input.versionNumber} (${input.status})`],
    ['생성일', new Date(input.createdAt).toLocaleDateString('ko-KR')],
    ['확정일', input.finalizedAt ? new Date(input.finalizedAt).toLocaleDateString('ko-KR') : '-'],
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

  const width = sumColWidths(ctx, 0, ctx.lastCol);
  addMergedRow(
    ctx,
    input.diagnosisSummary || '-',
    STYLE.diagnosis,
    Math.max(60, calcRowHeight(input.diagnosisSummary || '-', width)),
  );

  if (input.interviewOverview) {
    addBlankRow(ctx, 10);
    addSectionHeader(ctx, 'Ⅰ. 훈련과정 개요 (인터뷰 입력)');
    addBlankRow(ctx, 6);
    addLabelValueRows(ctx, [
      ['과정명', input.interviewOverview.courseName || '-'],
      ['훈련 시간', `${input.interviewOverview.trainingHours}시간`],
      ['훈련생 수', `${input.interviewOverview.traineeCount}명`],
      ['훈련 직무', input.interviewOverview.trainingJob || '-'],
      ['AI 역량 수준', input.interviewOverview.aiLevel || '-'],
      [
        '훈련 목표',
        input.interviewOverview.trainingGoals.length > 0
          ? input.interviewOverview.trainingGoals.join(', ')
          : '-',
      ],
    ]);
  }

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 2: 운영계획 (Ⅳ-1, Ⅳ-2)
// ============================================================================

export function buildPBLOperationSheet(op: PBLOperationPlan): XLSX.WorkSheet {
  const ctx = createCtx(OPERATION_COL);

  addSectionHeader(ctx, 'Ⅳ-1. 훈련 목표');
  addBlankRow(ctx, 6);
  const width = sumColWidths(ctx, 0, ctx.lastCol);
  addMergedRow(
    ctx,
    op.training_goal || '-',
    STYLE.value,
    Math.max(40, calcRowHeight(op.training_goal || '-', width)),
  );
  addBlankRow(ctx, 10);

  addSectionHeader(ctx, 'Ⅳ-2. AI 도구 활용 계획');
  addBlankRow(ctx, 6);
  addTableHeader(ctx, ['단계', '주요 활동', 'AI 도구', '활용 데이터', '활용 목적', '구체적 활용 방법']);
  op.ai_tool_usage_plan.forEach((item, idx) => {
    addTableRow(
      ctx,
      [
        item.stage,
        item.main_activity,
        item.ai_tools.join(', '),
        item.utilized_data,
        item.purpose,
        item.specific_method,
      ],
      new Set([0]),
      idx % 2 === 1,
    );
  });
  if (op.ai_tool_usage_plan.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', '-', '-'], new Set([0]), false);
  }

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 3: 훈련 실시 (Ⅳ-3)
// ============================================================================

export function buildPBLTrainingSheet(op: PBLOperationPlan): XLSX.WorkSheet {
  const ctx = createCtx(TRAINING_COL);
  const tp = op.training_plan;

  addSectionHeader(ctx, 'Ⅳ-3. 훈련 실시 계획');
  addBlankRow(ctx, 6);

  addSubSection(ctx, '가. 훈련과정 개요');
  addLabelValueRows(ctx, [
    ['과정명', tp.overview.course_name || '-'],
    [
      '훈련 기간',
      tp.overview.training_period.start || tp.overview.training_period.end
        ? `${tp.overview.training_period.start || '-'} ~ ${tp.overview.training_period.end || '-'}`
        : '-',
    ],
  ]);
  addBlankRow(ctx, 6);

  addSubSection(ctx, '나. 학습그룹 구성 (훈련강사)');
  addTableHeader(ctx, ['구분', '역할', '소속', '직위', '성명']);
  tp.learning_group.instructors.forEach((ins, i) => {
    addTableRow(
      ctx,
      [ins.type, ins.role, ins.affiliation, ins.position, ins.name],
      new Set([0, 1]),
      i % 2 === 1,
    );
  });
  if (tp.learning_group.instructors.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', '-'], new Set([0, 1]), false);
  }
  addBlankRow(ctx, 6);

  addSubSection(ctx, '나. 학습그룹 구성 (훈련생)');
  addTableHeader(ctx, ['역할', '소속', '직위', '성명', '']);
  tp.learning_group.trainees.forEach((t, i) => {
    addTableRow(
      ctx,
      [t.role, t.affiliation, t.position, t.name, ''],
      new Set([0]),
      i % 2 === 1,
    );
  });
  if (tp.learning_group.trainees.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', ''], new Set([0]), false);
  }
  addBlankRow(ctx, 6);

  addSubSection(ctx, '다. 훈련 교과목 프로파일');
  addLabelValueRows(ctx, [
    ['과정명', tp.subject_profile.course_name || '-'],
    ['전체 훈련시간(H)', String(tp.subject_profile.total_hours)],
    ['분석 방법', tp.subject_profile.analysis_method || '-'],
    ['활용 데이터', tp.subject_profile.utilized_data || '-'],
    ['훈련 목표', formatBulletLines(tp.subject_profile.training_goals)],
    ['활용 AI 도구', tp.subject_profile.ai_tools.join(', ') || '-'],
  ]);
  addBlankRow(ctx, 4);
  addTableHeader(ctx, ['업무(단원)명', '세부 내용', '훈련시간(H)', '외부 투입(H)', '내부 투입(H)']);
  tp.subject_profile.training_contents.forEach((row, idx) => {
    addTableRow(
      ctx,
      [
        row.unit_name,
        row.detail,
        String(row.training_hours),
        String(row.instructor_hours.external),
        String(row.instructor_hours.internal),
      ],
      new Set([2, 3, 4]),
      idx % 2 === 1,
    );
  });
  if (tp.subject_profile.training_contents.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', '-'], new Set([2, 3, 4]), false);
  }
  addLabelValueRow(ctx, '전체시간 합계', `${tp.subject_profile.total_sum_hours}시간`);
  addBlankRow(ctx, 6);

  addSubSection(ctx, '라. 시설·장비');
  addTableHeader(ctx, ['연번', '구분', '명칭', '규격(사양)', '위치']);
  tp.facilities.forEach((f, i) => {
    addTableRow(
      ctx,
      [String(f.seq), f.category, f.name, f.spec, f.location],
      new Set([0, 1]),
      i % 2 === 1,
    );
  });
  if (tp.facilities.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', '-'], new Set([0, 1]), false);
  }
  addBlankRow(ctx, 6);

  addSubSection(ctx, '마. 훈련강사');
  addTableHeader(ctx, ['성명', '내/외부', '경력(년)', '업무명', '세부 교육훈련 내용']);
  tp.training_instructors.forEach((row, i) => {
    addTableRow(
      ctx,
      [
        row.name,
        row.internal_external,
        String(row.career_years),
        row.work_name,
        formatBulletLines(row.detailed_training_content),
      ],
      new Set([1, 2]),
      i % 2 === 1,
    );
  });
  if (tp.training_instructors.length === 0) {
    addTableRow(ctx, ['-', '-', '-', '-', '-'], new Set([1, 2]), false);
  }

  return finalizeSheet(ctx);
}

// ============================================================================
// 시트 4: 평가 계획 (Ⅳ-4)
// ============================================================================

export function buildPBLEvaluationSheet(op: PBLOperationPlan): XLSX.WorkSheet {
  const ctx = createCtx(EVALUATION_COL);
  const ce = op.evaluation_plan.course_evaluation;
  const re = op.evaluation_plan.result_evaluation;

  addSectionHeader(ctx, 'Ⅳ-4-가. 과정평가');
  addBlankRow(ctx, 6);
  addLabelValueRows(ctx, [
    ['과정명', ce.course_name || '-'],
    ['평가 방법', ce.evaluation_methods.join(', ') || '-'],
    ['평가 대상', ce.evaluation_target || '-'],
    ['평가 일자', ce.evaluation_date || '-'],
    ['평가 기준', ce.evaluation_criteria || '-'],
    ['평가 결과', ce.evaluation_result || '-'],
  ]);
  addBlankRow(ctx, 4);

  addSubSection(ctx, '수행수준 체크리스트');
  addTableHeader(ctx, ['업무(단원)명', '평가 기준', '수행 수준', '']);
  ce.performance_checklist.forEach((row, i) => {
    addTableRow(
      ctx,
      [row.unit_name, row.evaluation_criteria, String(row.performance_level), ''],
      new Set([2]),
      i % 2 === 1,
    );
  });
  if (ce.performance_checklist.length === 0) {
    addTableRow(ctx, ['-', '-', '-', ''], new Set([2]), false);
  }

  if (ce.overall_comment) {
    addLabelValueRow(ctx, '총평', ce.overall_comment);
  }
  addTextSection(ctx, '평가척도', '1:최하 · 2:하 · 3:보통 · 4:상 · 5:최상');

  addSectionHeader(ctx, 'Ⅳ-4-나. 결과평가 (설문 문항 수)');
  addBlankRow(ctx, 6);
  addLabelValueRows(ctx, [
    ['만족도 조사', `${re.satisfaction_survey.length}문항 (리커트 1~5)`],
    ['성취도 조사', `${re.achievement_survey.length}문항 (리커트 1~5)`],
    ['외부전문가 만족도', `${re.external_expert_survey.length}문항 (리커트 1~5)`],
    ['현업적용도', `${re.practical_application_survey.length}문항 (리커트 1~5)`],
  ]);

  return finalizeSheet(ctx);
}

// ============================================================================
// generatePBLXLSX / downloadPBLXLSX
// ============================================================================

export interface PBLXLSXInput extends PBLOverviewSheetInput {
  pblContent: PBLContent;
}

export async function generatePBLXLSX(data: PBLXLSXInput): Promise<Uint8Array> {
  const XLSXmod = await import('xlsx-js-style');
  const wb = XLSXmod.utils.book_new();

  XLSXmod.utils.book_append_sheet(wb, buildPBLOverviewSheet(data), '개요');
  XLSXmod.utils.book_append_sheet(
    wb,
    buildPBLOperationSheet(data.pblContent.operation_plan),
    'Ⅳ-1·Ⅳ-2 운영계획',
  );
  XLSXmod.utils.book_append_sheet(
    wb,
    buildPBLTrainingSheet(data.pblContent.operation_plan),
    'Ⅳ-3 훈련 실시',
  );
  XLSXmod.utils.book_append_sheet(
    wb,
    buildPBLEvaluationSheet(data.pblContent.operation_plan),
    'Ⅳ-4 평가 계획',
  );

  const wbout = XLSXmod.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

export function downloadPBLXLSX(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
