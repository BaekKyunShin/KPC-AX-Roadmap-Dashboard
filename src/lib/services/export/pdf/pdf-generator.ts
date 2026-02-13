/**
 * PDF 내보내기 메인 오케스트레이터
 * 로드맵 데이터를 Portrait A4 PDF로 변환
 * Pretendard Regular/Bold 폰트 — 컨설팅 보고서 품질
 *
 * 구조:
 *   1. 표지 + 진단 요약 + 과정 체계도
 *   2. 과정 상세 (각 과정별 풀 스펙)
 *   3. PBL 과정
 */

import type { RoadmapRow, PBLCourse, RoadmapCell } from '../../roadmap';
import {
  getLevelLabel,
  formatMatrixCourseNames,
  formatMatrixCourseHoursWithUnit,
} from '@/lib/utils/roadmap';
import { LAYOUT, FONT } from './pdf-constants';
import { loadFonts } from './pdf-font-loader';
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
import {
  drawCourseDetail,
  extractPBLExtendedFields,
  extractModuleDeliverables,
} from './pdf-course-renderer';

export interface RoadmapExportData {
  companyName: string;
  projectId: string;
  versionNumber: number;
  status: string;
  diagnosisSummary: string;
  roadmapMatrix: RoadmapRow[];
  pblCourse: PBLCourse;
  courses: RoadmapCell[];
  createdAt: string;
  finalizedAt?: string | null;
}

/** 로드맵 데이터를 Portrait A4 PDF Blob으로 변환 (표지 + 과정 상세 + PBL) */
export async function generatePDF(data: RoadmapExportData): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hasFonts = await loadFonts(doc);
  doc.setLineHeightFactor(1.5);
  const ctx: DocContext = { doc, y: LAYOUT.MARGIN, hasFonts };
  const tableBase = getAutoTableStyles(hasFonts);
  const CW = LAYOUT.CONTENT_WIDTH;

  // ======================================================================
  // 1. 표지 + 진단 요약 + 과정 체계도
  // ======================================================================

  // 메인 제목
  ctx.y = 30;
  setBold(ctx, FONT.SIZE.TITLE);
  doc.setTextColor(...LAYOUT.HEADER_COLOR);
  doc.text('AI 교육 로드맵', LAYOUT.PAGE_WIDTH / 2, ctx.y, { align: 'center' });
  ctx.y += 4;

  doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  doc.setLineWidth(0.8);
  doc.line(LAYOUT.PAGE_WIDTH / 2 - 30, ctx.y, LAYOUT.PAGE_WIDTH / 2 + 30, ctx.y);
  ctx.y += 12;

  // 메타 정보
  const rightX = LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN;

  setBold(ctx, FONT.SIZE.BODY);
  doc.setTextColor(...LAYOUT.BODY_COLOR);
  doc.text('기업', LAYOUT.MARGIN, ctx.y);
  setRegular(ctx, FONT.SIZE.BODY);
  doc.text(data.companyName, LAYOUT.MARGIN + 18, ctx.y);
  setBold(ctx, FONT.SIZE.BODY);
  doc.text('버전', rightX - 50, ctx.y);
  setRegular(ctx, FONT.SIZE.BODY);
  doc.text(`v${data.versionNumber} (${data.status})`, rightX - 34, ctx.y);
  ctx.y += 5.5;

  setBold(ctx, FONT.SIZE.BODY);
  doc.text('생성일', LAYOUT.MARGIN, ctx.y);
  setRegular(ctx, FONT.SIZE.BODY);
  doc.text(new Date(data.createdAt).toLocaleDateString('ko-KR'), LAYOUT.MARGIN + 18, ctx.y);
  if (data.finalizedAt) {
    setBold(ctx, FONT.SIZE.BODY);
    doc.text('확정일', rightX - 50, ctx.y);
    setRegular(ctx, FONT.SIZE.BODY);
    doc.text(new Date(data.finalizedAt).toLocaleDateString('ko-KR'), rightX - 34, ctx.y);
  }
  ctx.y += 10;

  drawDivider(ctx);

  // 진단 요약
  drawSectionTitle(ctx, '진단 요약');
  drawBodyText(ctx, data.diagnosisSummary);
  ctx.y += 8;

  // 과정 체계도
  drawSectionTitle(ctx, '과정 체계도');

  const matrixData = data.roadmapMatrix.map(row => [
    row.task_name,
    formatMatrixCourseNames(row.beginner),
    formatMatrixCourseHoursWithUnit(row.beginner),
    formatMatrixCourseNames(row.intermediate),
    formatMatrixCourseHoursWithUnit(row.intermediate),
    formatMatrixCourseNames(row.advanced),
    formatMatrixCourseHoursWithUnit(row.advanced),
  ]);

  autoTable(doc, {
    startY: ctx.y,
    head: [['세부업무', '초급', '시간', '중급', '시간', '고급', '시간']],
    body: matrixData,
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.17 },
      1: { cellWidth: CW * 0.17 },
      2: { cellWidth: CW * 0.08 },
      3: { cellWidth: CW * 0.17 },
      4: { cellWidth: CW * 0.08 },
      5: { cellWidth: CW * 0.17 },
      6: { cellWidth: CW * 0.08 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(doc) + 12;

  // ======================================================================
  // 2. 과정 상세 (각 과정별 풀 스펙)
  // ======================================================================

  // 새 페이지에서 시작
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;

  drawSectionTitle(ctx, '과정 상세');

  data.courses.forEach((course, idx) => {
    drawCourseDetail(ctx, course, idx, autoTable, tableBase);
  });

  // ======================================================================
  // 3. PBL 과정
  // ======================================================================

  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;

  drawSectionTitle(ctx, 'PBL 과정');

  const extended = extractPBLExtendedFields(data.pblCourse);
  const { selection_rationale: rationale } = extended;

  // PBL 과정명
  drawSubsectionTitle(ctx, data.pblCourse.course_name);
  ctx.y += 2;

  // 선정 과정 정보
  if (extended.selected_course_name) {
    drawLabelValue(ctx, '선정 과정:', extended.selected_course_name);
    const levelText = extended.selected_course_level ? getLevelLabel(extended.selected_course_level) : '-';
    drawLabelValue(ctx, '난이도:', `${levelText}  |  대상 업무: ${extended.selected_course_task || '-'}`);
    ctx.y += 2;
  }

  drawLabelValue(ctx, '총 교육시간:', `${data.pblCourse.total_hours}시간`);
  drawLabelValue(ctx, '교육 대상:', data.pblCourse.target_audience);
  drawLabelValue(ctx, '대상 업무:', data.pblCourse.target_tasks?.join(', ') || '-');
  ctx.y += 5;

  // 선정 근거
  if (rationale) {
    drawTableTitle(ctx, '선정 근거');
    ctx.y += 1;

    const rationaleFields = [
      { label: '컨설턴트 전문성', value: rationale.consultant_expertise_fit },
      { label: '페인포인트 부합', value: rationale.pain_point_alignment },
      { label: '실현 가능성', value: rationale.feasibility_assessment },
      { label: '요약', value: rationale.summary },
    ];

    rationaleFields.forEach(({ label, value }) => {
      if (value) {
        checkPageBreak(ctx, 10);
        drawBulletItem(ctx, `${label}: ${value}`);
      }
    });
    ctx.y += 3;
  }

  // PBL 커리큘럼 테이블
  checkPageBreak(ctx, 40);
  drawTableTitle(ctx, '커리큘럼');

  const curriculumData = data.pblCourse.curriculum?.map(module => {
    const deliverables = extractModuleDeliverables(module);
    const details = formatBulletList(ctx.doc, module.details || [], CW * 0.27, ctx.hasFonts);
    return [
      module.module_name,
      `${module.hours}h`,
      details,
      module.practice,
      deliverables?.join(', ') || '-',
      module.tools?.map(t => t.name).join(', ') || '-',
    ];
  }) || [];

  autoTable(doc, {
    startY: ctx.y,
    head: [['모듈', '시간', '세부 내용', '실습/과제', '산출물', '도구']],
    body: curriculumData,
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.14 },
      1: { cellWidth: CW * 0.07 },
      2: { cellWidth: CW * 0.27 },
      3: { cellWidth: CW * 0.22 },
      4: { cellWidth: CW * 0.16 },
      5: { cellWidth: CW * 0.14 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(doc) + 10;

  // 최종 산출물
  if (extended.final_deliverables && extended.final_deliverables.length > 0) {
    checkPageBreak(ctx, 20);
    drawTableTitle(ctx, '최종 산출물');
    extended.final_deliverables.forEach(deliverable => {
      drawBulletItem(ctx, deliverable);
    });
    ctx.y += 3;
  }

  // 비즈니스 임팩트
  if (extended.business_impact) {
    checkPageBreak(ctx, 15);
    drawTableTitle(ctx, '비즈니스 임팩트');
    drawBodyText(ctx, extended.business_impact, 4);
    ctx.y += 3;
  }

  // 기대효과
  if (data.pblCourse.expected_outcomes && data.pblCourse.expected_outcomes.length > 0) {
    checkPageBreak(ctx, 20);
    drawTableTitle(ctx, '기대효과');
    data.pblCourse.expected_outcomes.forEach(outcome => {
      drawBulletItem(ctx, outcome);
    });
    ctx.y += 3;
  }

  // 측정방법
  if (data.pblCourse.measurement_methods && data.pblCourse.measurement_methods.length > 0) {
    checkPageBreak(ctx, 20);
    drawTableTitle(ctx, '측정방법');
    data.pblCourse.measurement_methods.forEach(method => {
      drawBulletItem(ctx, method);
    });
    ctx.y += 3;
  }

  // 준비물 (NEW)
  const pblPrereqs = extended.prerequisites || data.pblCourse.prerequisites;
  if (pblPrereqs && pblPrereqs.length > 0) {
    checkPageBreak(ctx, 20);
    drawTableTitle(ctx, '준비물');
    pblPrereqs.forEach(prereq => {
      drawBulletItem(ctx, prereq);
    });
    ctx.y += 5;
  }

  // ======================================================================
  // 푸터 (전체 페이지)
  // ======================================================================

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...LAYOUT.DIVIDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 15, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 15);

    setRegular(ctx, FONT.SIZE.FOOTER);
    doc.setTextColor(...LAYOUT.MUTED_COLOR);
    doc.text(
      'KPC AI 교육 로드맵 대시보드',
      LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 10,
    );
    doc.text(
      `${i} / ${pageCount}`,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 10,
      { align: 'right' },
    );
  }

  return doc.output('blob');
}
