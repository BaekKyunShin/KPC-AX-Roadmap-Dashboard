/**
 * PBL PDF Ⅳ장 운영계획 렌더러
 *   Ⅳ-1. 훈련 목표
 *   Ⅳ-2. AI 도구 활용 계획 (단계별 표)
 *   Ⅳ-3-가. 훈련과정 개요
 *   Ⅳ-3-나. 학습그룹 구성 (강사 + 훈련생)
 *   Ⅳ-3-다. 훈련 교과목 프로파일
 *   Ⅳ-3-라. 시설·장비
 *   Ⅳ-3-마. 훈련강사
 *   Ⅳ-4-가. 과정평가 (수행수준)
 *   Ⅳ-4-나. 결과평가 (고정 설문 — 문항 수만 표기)
 */

import type { default as autoTableFn } from 'jspdf-autotable';
import type {
  PBLCourseEvaluation,
  PBLOperationPlan,
  PBLResultEvaluation,
} from '../../pbl/pbl-types';
import { bulletizeDetails } from '@/lib/utils/list-format';
import { LAYOUT } from './pdf-constants';
import {
  type DocContext,
  drawBodyText,
  drawBulletItem,
  drawLabelValue,
  drawSectionTitle,
  drawSubsectionTitle,
  drawTableTitle,
  formatBulletList,
  getTableFinalY,
  setRegular,
} from './pdf-helpers';

type AutoTable = typeof autoTableFn;
type AutoTableStyles = ReturnType<typeof import('./pdf-helpers').getAutoTableStyles>;

export function drawPBLOperationSection(
  ctx: DocContext,
  operationPlan: PBLOperationPlan,
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  drawSectionTitle(ctx, 'Ⅳ. AI 기반 운영계획 수립');

  // Ⅳ-1. 훈련 목표
  drawSubsectionTitle(ctx, 'Ⅳ-1. 훈련 목표');
  drawBodyText(ctx, operationPlan.training_goal || '-');
  ctx.y += 4;

  // Ⅳ-2. AI 도구 활용 계획
  drawSubsectionTitle(ctx, 'Ⅳ-2. AI 도구 활용 계획');
  drawAIToolUsageTable(ctx, operationPlan.ai_tool_usage_plan, autoTable, tableBase);

  // Ⅳ-3. 훈련 실시 계획
  drawSubsectionTitle(ctx, 'Ⅳ-3. 훈련 실시 계획');
  const tp = operationPlan.training_plan;
  drawTableTitle(ctx, '가. 훈련과정 개요');
  drawLabelValue(ctx, '과정명', tp.overview.course_name || '-');
  drawLabelValue(
    ctx,
    '훈련기간',
    tp.overview.training_period.start || tp.overview.training_period.end
      ? `${tp.overview.training_period.start || '-'} ~ ${tp.overview.training_period.end || '-'}`
      : '-'
  );
  ctx.y += 2;

  drawTableTitle(ctx, '나. 학습그룹 구성 (훈련강사)');
  drawLearningGroupInstructorsTable(ctx, tp.learning_group.instructors, autoTable, tableBase);
  drawTableTitle(ctx, '나. 학습그룹 구성 (훈련생)');
  drawLearningGroupTraineesTable(ctx, tp.learning_group.trainees, autoTable, tableBase);

  drawTableTitle(ctx, '다. 훈련 교과목 프로파일');
  drawLabelValue(ctx, '과정명', tp.subject_profile.course_name || '-');
  drawLabelValue(ctx, '총 훈련시간(h)', `${tp.subject_profile.total_hours}시간`);
  drawLabelValue(ctx, '분석방법', tp.subject_profile.analysis_method || '-');
  drawLabelValue(ctx, '활용 데이터', tp.subject_profile.utilized_data || '-');
  ctx.y += 2;
  if (tp.subject_profile.training_goals.length > 0) {
    setRegular(ctx, 9);
    drawLabelValue(ctx, '훈련목표', '');
    for (const goal of tp.subject_profile.training_goals) {
      drawBulletItem(ctx, goal, 8);
    }
  }
  if (tp.subject_profile.ai_tools.length > 0) {
    drawLabelValue(ctx, '활용 AI도구', tp.subject_profile.ai_tools.join(', '));
  }
  ctx.y += 2;
  drawSubjectProfileTable(ctx, tp.subject_profile.training_contents, autoTable, tableBase);
  drawLabelValue(ctx, '전체시간', `${tp.subject_profile.total_sum_hours}시간`);
  ctx.y += 2;

  drawTableTitle(ctx, '라. 시설·장비');
  drawFacilitiesTable(ctx, tp.facilities, autoTable, tableBase);

  drawTableTitle(ctx, '마. 훈련강사');
  drawInstructorsTable(ctx, tp.training_instructors, autoTable, tableBase);

  // Ⅳ-4. 평가 계획
  drawSubsectionTitle(ctx, 'Ⅳ-4. 평가 계획');
  drawCourseEvaluation(ctx, operationPlan.evaluation_plan.course_evaluation, autoTable, tableBase);
  drawResultEvaluationSummary(ctx, operationPlan.evaluation_plan.result_evaluation);
}

function drawAIToolUsageTable(
  ctx: DocContext,
  items: PBLOperationPlan['ai_tool_usage_plan'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['단계', '주요 활동', 'AI 도구', '활용 데이터', '활용 목적', '구체적 활용 방법']];
  const body = items.map((item) => [
    item.stage,
    item.main_activity,
    item.ai_tools.join(', '),
    item.utilized_data,
    item.purpose,
    item.specific_method,
  ]);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
    },
  });
  ctx.y = getTableFinalY(ctx.doc) + 4;
}

function drawLearningGroupInstructorsTable(
  ctx: DocContext,
  instructors: PBLOperationPlan['training_plan']['learning_group']['instructors'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['구분', '역할', '소속(부서)', '직위', '성명']];
  const body = instructors.map((ins) => [
    ins.type,
    ins.role,
    ins.affiliation,
    ins.position,
    ins.name,
  ]);
  if (body.length === 0) body.push(['-', '-', '-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
  });
  ctx.y = getTableFinalY(ctx.doc) + 3;
}

function drawLearningGroupTraineesTable(
  ctx: DocContext,
  trainees: PBLOperationPlan['training_plan']['learning_group']['trainees'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['역할', '소속(부서)', '직위', '성명']];
  const body = trainees.map((tr) => [tr.role, tr.affiliation, tr.position, tr.name]);
  if (body.length === 0) body.push(['-', '-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
  });
  ctx.y = getTableFinalY(ctx.doc) + 3;
}

function drawSubjectProfileTable(
  ctx: DocContext,
  rows: PBLOperationPlan['training_plan']['subject_profile']['training_contents'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['업무(단원)명', '세부 내용', '훈련 시간(H)', '외부 강사 (H)', '내부 강사 (H)']];
  const body = rows.map((row) => [
    row.unit_name,
    // 항목별 머리기호(▪) — 화면·한글(HWPX)·XLSX 와 동일 표기.
    bulletizeDetails(row.detail),
    String(row.training_hours),
    String(row.instructor_hours.external),
    String(row.instructor_hours.internal),
  ]);
  if (body.length === 0) body.push(['-', '-', '-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
    columnStyles: {
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 22 },
    },
  });
  ctx.y = getTableFinalY(ctx.doc) + 3;
}

function drawFacilitiesTable(
  ctx: DocContext,
  rows: PBLOperationPlan['training_plan']['facilities'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['연번', '구분', '명칭', '규격(사양)', '위치']];
  const body = rows.map((row) => [String(row.seq), row.category, row.name, row.spec, row.location]);
  if (body.length === 0) body.push(['-', '-', '-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
    columnStyles: { 0: { halign: 'center', cellWidth: 14 } },
  });
  ctx.y = getTableFinalY(ctx.doc) + 3;
}

function drawInstructorsTable(
  ctx: DocContext,
  rows: PBLOperationPlan['training_plan']['training_instructors'],
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  const head = [['성명', '구분', '업무경력', '업무명', '세부 교육훈련 내용']];
  const colWidth = 56;
  const body = rows.map((row) => [
    row.name,
    row.internal_external,
    String(row.career_years),
    row.work_name,
    formatBulletList(ctx.doc, row.detailed_training_content, colWidth, ctx.hasFonts),
  ]);
  if (body.length === 0) body.push(['-', '-', '-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
    columnStyles: { 2: { halign: 'center', cellWidth: 18 }, 4: { cellWidth: colWidth } },
  });
  ctx.y = getTableFinalY(ctx.doc) + 4;
}

function drawCourseEvaluation(
  ctx: DocContext,
  ce: PBLCourseEvaluation,
  autoTable: AutoTable,
  tableBase: AutoTableStyles
): void {
  drawTableTitle(ctx, '가. 과정평가');
  drawLabelValue(ctx, '과정명', ce.course_name || '-');
  drawLabelValue(ctx, '평가 방법', ce.evaluation_methods.join(', ') || '-');
  drawLabelValue(ctx, '평가 대상', ce.evaluation_target || '-');
  drawLabelValue(ctx, '평가 일자', ce.evaluation_date || '-');
  drawLabelValue(ctx, '평가 기준', ce.evaluation_criteria || '-');
  drawLabelValue(ctx, '평가 결과', ce.evaluation_result || '-');
  ctx.y += 2;

  const head = [['업무(단원)명', '평가 기준', '수행 수준 (1~5)']];
  const body = ce.performance_checklist.map((row) => [
    row.unit_name,
    row.evaluation_criteria,
    String(row.performance_level),
  ]);
  if (body.length === 0) body.push(['-', '-', '-']);
  autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    head,
    body,
    ...tableBase,
    columnStyles: { 2: { halign: 'center', cellWidth: 30 } },
  });
  ctx.y = getTableFinalY(ctx.doc) + 3;

  if (ce.overall_comment) {
    drawLabelValue(ctx, '총평', ce.overall_comment);
  }
  drawLabelValue(ctx, '평가척도', '1:최하 · 2:하 · 3:보통 · 4:상 · 5:최상');
  ctx.y += 4;
}

function drawResultEvaluationSummary(ctx: DocContext, re: PBLResultEvaluation): void {
  drawTableTitle(ctx, '나. 결과평가 (설문 문항 수 요약)');
  drawLabelValue(ctx, '만족도 조사 문항 수', `${re.satisfaction_survey.length}문항`);
  drawLabelValue(ctx, '성취도 조사 문항 수', `${re.achievement_survey.length}문항`);
  drawLabelValue(ctx, '외부전문가 만족도 조사 문항 수', `${re.external_expert_survey.length}문항`);
  drawLabelValue(ctx, '현업적용도 조사 문항 수', `${re.practical_application_survey.length}문항`);
  ctx.y += 2;
  drawBodyText(
    ctx,
    '각 문항은 리커트 5점 척도(매우 아니다~매우 그렇다)로 응답하며, 훈련 종료 후 실시됩니다.'
  );
  ctx.y += 4;
}
