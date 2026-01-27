/**
 * PDF 내보내기 서비스
 * 로드맵 데이터를 PDF로 변환
 * 주의: 한글 폰트 지원을 위해 클라이언트 사이드에서 생성
 */

import type { RoadmapRow, PBLCourse, RoadmapCell } from './roadmap';
import { getLevelLabelEn } from '@/lib/utils/roadmap';

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
// PBL 데이터 추출 헬퍼 함수들
// ============================================================================

interface PBLExtendedFields {
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
}

interface PBLModuleExtended {
  module_name: string;
  hours: number;
  description: string;
  practice: string;
  deliverables?: string[];
  tools?: { name: string; free_tier_info: string }[];
}

/**
 * PBL 과정에서 확장 필드 추출
 */
function extractPBLExtendedFields(pblCourse: PBLCourse): PBLExtendedFields {
  const extended = pblCourse as unknown as PBLExtendedFields;
  return {
    selected_course_name: extended.selected_course_name,
    selected_course_level: extended.selected_course_level,
    selected_course_task: extended.selected_course_task,
    selection_rationale: extended.selection_rationale,
    final_deliverables: extended.final_deliverables,
    business_impact: extended.business_impact,
  };
}

/**
 * PBL 커리큘럼 모듈에서 확장 필드 추출
 */
function extractModuleDeliverables(
  module: PBLCourse['curriculum'][number]
): string[] | undefined {
  const extended = module as unknown as PBLModuleExtended;
  return extended.deliverables;
}

// ============================================================================
// PDF 상수
// ============================================================================

const PDF_CONSTANTS = {
  MARGIN: 15,
  HEADER_COLOR: [102, 51, 153] as [number, number, number],
  PAGE_BREAK_THRESHOLD: 160,
} as const;

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * PDF 생성 (클라이언트 사이드 전용)
 * 브라우저에서 실행되어야 함 (document 필요)
 */
export async function generatePDF(data: RoadmapExportData): Promise<Blob> {
  // 동적 import for client-side only
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const { MARGIN } = PDF_CONSTANTS;
  let y = 20;

  // ========================================
  // 페이지 1: 제목 및 매트릭스
  // ========================================

  // 제목
  doc.setFontSize(18);
  doc.text('AI Training Roadmap', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // 기본 정보
  doc.setFontSize(10);
  doc.text(`Company: ${data.companyName}`, MARGIN, y);
  doc.text(`Version: v${data.versionNumber} (${data.status})`, pageWidth - MARGIN - 60, y);
  y += 6;
  doc.text(`Created: ${new Date(data.createdAt).toLocaleDateString('ko-KR')}`, MARGIN, y);
  if (data.finalizedAt) {
    doc.text(`Finalized: ${new Date(data.finalizedAt).toLocaleDateString('ko-KR')}`, pageWidth - MARGIN - 60, y);
  }
  y += 10;

  // 진단 요약
  doc.setFontSize(12);
  doc.text('Diagnosis Summary', MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(data.diagnosisSummary, pageWidth - MARGIN * 2);
  doc.text(summaryLines, MARGIN, y);
  y += summaryLines.length * 4 + 10;

  // NxM 매트릭스 테이블
  doc.setFontSize(12);
  doc.text('Roadmap Matrix', MARGIN, y);
  y += 6;

  const matrixData = data.roadmapMatrix.map(row => [
    row.task_name,
    row.beginner?.course_name || '-',
    row.beginner ? `${row.beginner.recommended_hours}h` : '-',
    row.intermediate?.course_name || '-',
    row.intermediate ? `${row.intermediate.recommended_hours}h` : '-',
    row.advanced?.course_name || '-',
    row.advanced ? `${row.advanced.recommended_hours}h` : '-',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Task', 'Beginner', 'Hours', 'Intermediate', 'Hours', 'Advanced', 'Hours']],
    body: matrixData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: PDF_CONSTANTS.HEADER_COLOR },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 15 },
      5: { cellWidth: 35 },
      6: { cellWidth: 15 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ========================================
  // 페이지 2: PBL 과정
  // ========================================

  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.text('PBL Course: ' + data.pblCourse.course_name, MARGIN, y);
  y += 10;

  const extended = extractPBLExtendedFields(data.pblCourse);
  const { selection_rationale: rationale } = extended;

  // 선정된 과정 정보
  if (extended.selected_course_name) {
    doc.setFontSize(11);
    doc.text('Selected Course', MARGIN, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Course Name: ${extended.selected_course_name}`, MARGIN + 5, y);
    y += 5;
    const levelText = extended.selected_course_level
      ? getLevelLabelEn(extended.selected_course_level)
      : '-';
    doc.text(`Level: ${levelText} | Target Task: ${extended.selected_course_task || '-'}`, MARGIN + 5, y);
    y += 8;
  }

  // 선정 이유
  if (rationale) {
    doc.setFontSize(11);
    doc.text('Selection Rationale', MARGIN, y);
    y += 6;
    doc.setFontSize(8);

    const rationaleFields = [
      { label: 'Consultant Expertise Fit:', value: rationale.consultant_expertise_fit },
      { label: 'Pain Point Alignment:', value: rationale.pain_point_alignment },
      { label: 'Feasibility Assessment:', value: rationale.feasibility_assessment },
      { label: 'Summary:', value: rationale.summary },
    ];

    rationaleFields.forEach(({ label, value }) => {
      if (value) {
        doc.text(label, MARGIN + 5, y);
        y += 4;
        const lines = doc.splitTextToSize(value, pageWidth - MARGIN * 2 - 10);
        doc.text(lines, MARGIN + 10, y);
        y += lines.length * 3 + 3;
      }
    });
  }

  // 과정 기본 정보
  doc.setFontSize(10);
  doc.text(`Total Hours: ${data.pblCourse.total_hours}h`, MARGIN, y);
  doc.text(`Target Audience: ${data.pblCourse.target_audience}`, MARGIN + 80, y);
  y += 6;
  doc.text(`Target Tasks: ${data.pblCourse.target_tasks?.join(', ') || '-'}`, MARGIN, y);
  y += 10;

  // 페이지 체크
  if (y > 150) {
    doc.addPage();
    y = 20;
  }

  // PBL 커리큘럼 테이블
  doc.setFontSize(12);
  doc.text('Curriculum', MARGIN, y);
  y += 6;

  const curriculumData = data.pblCourse.curriculum?.map(module => {
    const deliverables = extractModuleDeliverables(module);
    return [
      module.module_name,
      `${module.hours}h`,
      module.description,
      module.practice,
      deliverables?.join(', ') || '-',
      module.tools?.map(t => t.name).join(', ') || '-',
    ];
  }) || [];

  autoTable(doc, {
    startY: y,
    head: [['Module', 'Hours', 'Description', 'Practice', 'Deliverables', 'Tools']],
    body: curriculumData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PDF_CONSTANTS.HEADER_COLOR },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 12 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // 최종 산출물 및 비즈니스 임팩트
  if (y > PDF_CONSTANTS.PAGE_BREAK_THRESHOLD) {
    doc.addPage();
    y = 20;
  }

  if (extended.final_deliverables && extended.final_deliverables.length > 0) {
    doc.setFontSize(12);
    doc.text('Final Deliverables', MARGIN, y);
    y += 6;
    doc.setFontSize(9);
    extended.final_deliverables.forEach(deliverable => {
      doc.text('• ' + deliverable, MARGIN + 5, y);
      y += 5;
    });
    y += 5;
  }

  if (extended.business_impact) {
    doc.setFontSize(12);
    doc.text('Business Impact', MARGIN, y);
    y += 6;
    doc.setFontSize(9);
    const impactLines = doc.splitTextToSize(extended.business_impact, pageWidth - MARGIN * 2 - 10);
    doc.text(impactLines, MARGIN + 5, y);
    y += impactLines.length * 4 + 5;
  }

  // 기대효과 및 측정방법
  if (y > PDF_CONSTANTS.PAGE_BREAK_THRESHOLD) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text('Expected Outcomes', MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  data.pblCourse.expected_outcomes?.forEach(outcome => {
    doc.text('• ' + outcome, MARGIN + 5, y);
    y += 5;
  });
  y += 5;

  doc.setFontSize(12);
  doc.text('Measurement Methods', MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  data.pblCourse.measurement_methods?.forEach(method => {
    doc.text('• ' + method, MARGIN + 5, y);
    y += 5;
  });

  // ========================================
  // 페이지 3: 과정 상세
  // ========================================

  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.text('Course Details', MARGIN, y);
  y += 10;

  const courseData = data.courses.map(course => [
    course.course_name,
    getLevelLabelEn(course.level),
    course.target_task,
    `${course.recommended_hours}h`,
    course.tools?.map(t => `${t.name} (${t.free_tier_info})`).join(', ') || '-',
    course.expected_outcome,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Course Name', 'Level', 'Target Task', 'Hours', 'Tools (Free Tier)', 'Expected Outcome']],
    body: courseData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: PDF_CONSTANTS.HEADER_COLOR },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 15 },
      4: { cellWidth: 50 },
      5: { cellWidth: 45 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ========================================
  // 푸터
  // ========================================

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by KPC AI Training Roadmap Dashboard',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
