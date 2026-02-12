/**
 * PDF 내보내기 서비스
 * 로드맵 데이터를 Portrait A4 PDF로 변환
 * Pretendard Regular/Bold 폰트 — 컨설팅 보고서 품질
 *
 * 구조:
 *   1. 표지 + 진단 요약 + 과정 체계도
 *   2. 과정 상세 (각 과정별 풀 스펙)
 *   3. PBL 과정
 */

import type { jsPDF } from 'jspdf';
import type { RoadmapRow, PBLCourse, RoadmapCell } from './roadmap';
import {
  getLevelLabel,
  formatMatrixCourseNames,
  formatMatrixCourseHoursWithUnit,
} from '@/lib/utils/roadmap';

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

// ============================================================================
// PBL 데이터 추출 헬퍼
// ============================================================================

export interface PBLExtendedFields {
  selected_course_name?: string;
  selected_course_level?: string;
  selected_course_task?: string;
  selection_rationale?: {
    consultant_expertise_fit?: string;
    pain_point_alignment?: string;
    feasibility_assessment?: string;
    summary?: string;
  };
  final_deliverables?: string[];
  business_impact?: string;
  prerequisites?: string[];
}

export interface PBLModuleExtended {
  module_name: string;
  hours: number;
  description: string;
  practice: string;
  deliverables?: string[];
  tools?: { name: string; free_tier_info: string }[];
}

export function extractPBLExtendedFields(pblCourse: PBLCourse): PBLExtendedFields {
  const extended = pblCourse as unknown as PBLExtendedFields;
  return {
    selected_course_name: extended.selected_course_name,
    selected_course_level: extended.selected_course_level,
    selected_course_task: extended.selected_course_task,
    selection_rationale: extended.selection_rationale,
    final_deliverables: extended.final_deliverables,
    business_impact: extended.business_impact,
    prerequisites: extended.prerequisites,
  };
}

export function extractModuleDeliverables(
  module: PBLCourse['curriculum'][number]
): string[] | undefined {
  const extended = module as unknown as PBLModuleExtended;
  return extended.deliverables;
}

// ============================================================================
// PDF 레이아웃 상수
// ============================================================================

const LAYOUT = {
  MARGIN: 20,
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  get CONTENT_WIDTH() { return this.PAGE_WIDTH - this.MARGIN * 2; },
  HEADER_COLOR: [102, 51, 153] as [number, number, number],
  HEADER_TEXT_COLOR: [255, 255, 255] as [number, number, number],
  DIVIDER_COLOR: [200, 200, 200] as [number, number, number],
  LIGHT_BG: [248, 247, 252] as [number, number, number],
  LABEL_BG: [245, 243, 249] as [number, number, number],
  BODY_COLOR: [51, 51, 51] as [number, number, number],
  MUTED_COLOR: [120, 120, 120] as [number, number, number],
} as const;

const FONT = {
  REGULAR: 'Pretendard',
  BOLD: 'PretendardBold',
  SIZE: {
    TITLE: 20,
    SECTION: 13,
    SUBSECTION: 11,
    TABLE_TITLE: 9.5,
    BODY: 9,
    TABLE_HEAD: 8.5,
    TABLE_BODY: 8,
    CAPTION: 7.5,
    FOOTER: 7,
  },
  LINE_HEIGHT: {
    BODY: 4.8,
    TIGHT: 3.5,
  },
} as const;

// ============================================================================
// 폰트 로딩
// ============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const fontCache: Record<string, string> = {};

async function loadFont(doc: jsPDF, path: string, vfsName: string, fontName: string, style: string): Promise<boolean> {
  try {
    if (!fontCache[path]) {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[PDF] 폰트 로드 실패: ${path}`, response.status);
        return false;
      }
      fontCache[path] = arrayBufferToBase64(await response.arrayBuffer());
    }
    doc.addFileToVFS(vfsName, fontCache[path]);
    doc.addFont(vfsName, fontName, style);
    return true;
  } catch (error) {
    console.warn(`[PDF] 폰트 로드 오류: ${path}`, error);
    return false;
  }
}

async function loadFonts(doc: jsPDF): Promise<boolean> {
  const [regular, bold] = await Promise.all([
    loadFont(doc, '/fonts/Pretendard-Regular.ttf', 'Pretendard-Regular.ttf', FONT.REGULAR, 'normal'),
    loadFont(doc, '/fonts/Pretendard-Bold.ttf', 'Pretendard-Bold.ttf', FONT.BOLD, 'normal'),
  ]);
  if (regular) doc.setFont(FONT.REGULAR);
  return regular && bold;
}

// ============================================================================
// 문서 헬퍼
// ============================================================================

export interface DocContext {
  doc: jsPDF;
  y: number;
  hasFonts: boolean;
}

function setRegular(ctx: DocContext, size: number) {
  ctx.doc.setFont(ctx.hasFonts ? FONT.REGULAR : 'helvetica', 'normal');
  ctx.doc.setFontSize(size);
}

function setBold(ctx: DocContext, size: number) {
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

function drawDivider(ctx: DocContext): void {
  ctx.doc.setDrawColor(...LAYOUT.DIVIDER_COLOR);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(LAYOUT.MARGIN, ctx.y, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, ctx.y);
  ctx.y += 6;
}

function drawSectionTitle(ctx: DocContext, title: string): void {
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

function drawSubsectionTitle(ctx: DocContext, title: string): void {
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

function drawTableTitle(ctx: DocContext, title: string): void {
  checkPageBreak(ctx, 12);
  setBold(ctx, FONT.SIZE.TABLE_TITLE);
  ctx.doc.setTextColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.text(`\u25A0 ${title}`, LAYOUT.MARGIN, ctx.y);
  ctx.y += 5;
}

function drawBodyText(ctx: DocContext, text: string, indent = 0): void {
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

function drawBulletItem(ctx: DocContext, text: string, indent = 4): void {
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

function drawLabelValue(ctx: DocContext, label: string, value: string, indent = 4): void {
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

function getTableFinalY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? 0;
}

function getAutoTableStyles(hasFonts: boolean) {
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
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    alternateRowStyles: {
      fillColor: LAYOUT.LIGHT_BG,
    },
  };
}

// ============================================================================
// 테이블 셀 내 머리기호 리스트 (줄바꿈 시 hanging indent)
// ============================================================================

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

// ============================================================================
// 과정 상세 렌더링 (과정 1개분)
// ============================================================================

function drawCourseDetail(
  ctx: DocContext,
  course: RoadmapCell,
  index: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoTable: any,
  tableBase: ReturnType<typeof getAutoTableStyles>,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  // 과정 제목 (Level 2)
  checkPageBreak(ctx, 50);
  drawSubsectionTitle(ctx, `${index + 1}. ${course.course_name} (${getLevelLabel(course.level)})`);

  // ── 프로파일 테이블 (key-value 2열) ──
  const toolsText = course.tools?.map(t =>
    `${t.name}${t.free_tier_info ? ` (${t.free_tier_info})` : ''}`
  ).join(', ') || '-';

  const prereqText = course.prerequisites && course.prerequisites.length > 0
    ? course.prerequisites.join(', ')
    : '없음';

  const profileData = [
    ['과정 목표', course.expected_outcome || '-'],
    ['교육 대상', course.target_audience || '-'],
    ['대상 업무', course.target_task || '-'],
    ['난이도', getLevelLabel(course.level)],
    ['교육 시간', `${course.recommended_hours}시간`],
    ['사용 도구', toolsText],
    ['선수 조건', prereqText],
  ];

  autoTable(ctx.doc, {
    startY: ctx.y,
    body: profileData,
    theme: 'plain',
    styles: {
      font: tableBase.styles.font,
      fontSize: FONT.SIZE.TABLE_BODY,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: LAYOUT.BODY_COLOR,
      lineColor: [230, 230, 230] as [number, number, number],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: {
        cellWidth: CW * 0.18,
        fillColor: LAYOUT.LABEL_BG,
        font: ctx.hasFonts ? FONT.BOLD : 'helvetica',
        fontStyle: ctx.hasFonts ? 'normal' as const : 'bold' as const,
        textColor: [80, 60, 120] as [number, number, number],
      },
      1: { cellWidth: CW * 0.82 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;

  // ── 커리큘럼 테이블 (4열) ──
  const curriculum = course.curriculum || [];
  if (curriculum.length > 0) {
    drawTableTitle(ctx, '커리큘럼');

    const currData = curriculum.map(m => [
      `${m.hours}h`,
      m.module_name,
      formatBulletList(ctx.doc, m.details || [], CW * 0.42, ctx.hasFonts),
      m.practice || '-',
    ]);

    autoTable(ctx.doc, {
      startY: ctx.y,
      head: [['시간', '학습 모듈', '세부 내용', '실습/과제']],
      body: currData,
      theme: 'grid',
      ...tableBase,
      columnStyles: {
        0: { cellWidth: CW * 0.08, halign: 'center' as const },
        1: { cellWidth: CW * 0.20 },
        2: { cellWidth: CW * 0.42 },
        3: { cellWidth: CW * 0.30 },
      },
      tableWidth: CW,
      margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    });

    ctx.y = getTableFinalY(ctx.doc) + 10;
  }

  // ── 기대효과 & 측정방법 테이블 (2열) ──
  drawTableTitle(ctx, '기대효과 및 측정방법');

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['기대효과', '측정 방법']],
    body: [[course.expected_outcome || '-', course.measurement_method || '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.50 },
      1: { cellWidth: CW * 0.50 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;
}

// ============================================================================
// 메인 함수
// ============================================================================

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
