/**
 * PDF 내보내기 서비스
 * 로드맵 데이터를 PDF로 변환
 * 주의: 한글 폰트 지원을 위해 클라이언트 사이드에서 생성
 */

import type { RoadmapRow, PBLCourse, RoadmapCell } from './roadmap';

export interface RoadmapExportData {
  companyName: string;
  caseId: string;
  versionNumber: number;
  status: string;
  diagnosisSummary: string;
  roadmapMatrix: RoadmapRow[];
  pblCourse: PBLCourse;
  courses: RoadmapCell[];
  createdAt: string;
  finalizedAt?: string | null;
}

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

  // 폰트 설정 (기본 폰트는 한글 미지원, 따라서 심플하게 처리)
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // 제목
  doc.setFontSize(18);
  doc.text('AI Training Roadmap', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // 기본 정보
  doc.setFontSize(10);
  doc.text(`Company: ${data.companyName}`, margin, y);
  doc.text(`Version: v${data.versionNumber} (${data.status})`, pageWidth - margin - 60, y);
  y += 6;
  doc.text(`Created: ${new Date(data.createdAt).toLocaleDateString('ko-KR')}`, margin, y);
  if (data.finalizedAt) {
    doc.text(`Finalized: ${new Date(data.finalizedAt).toLocaleDateString('ko-KR')}`, pageWidth - margin - 60, y);
  }
  y += 10;

  // 진단 요약
  doc.setFontSize(12);
  doc.text('Diagnosis Summary', margin, y);
  y += 6;
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(data.diagnosisSummary, pageWidth - margin * 2);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4 + 10;

  // NxM 매트릭스 테이블
  doc.setFontSize(12);
  doc.text('Roadmap Matrix', margin, y);
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
    headStyles: { fillColor: [102, 51, 153] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15 },
      3: { cellWidth: 35 },
      4: { cellWidth: 15 },
      5: { cellWidth: 35 },
      6: { cellWidth: 15 },
    },
    margin: { left: margin, right: margin },
  });

  // 새 페이지: PBL 과정
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.text('PBL Course: ' + data.pblCourse.course_name, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Total Hours: ${data.pblCourse.total_hours}h`, margin, y);
  doc.text(`Target Audience: ${data.pblCourse.target_audience}`, margin + 80, y);
  y += 6;
  doc.text(`Target Tasks: ${data.pblCourse.target_tasks?.join(', ') || '-'}`, margin, y);
  y += 10;

  // PBL 커리큘럼 테이블
  doc.setFontSize(12);
  doc.text('Curriculum', margin, y);
  y += 6;

  const curriculumData = data.pblCourse.curriculum?.map(module => [
    module.module_name,
    `${module.hours}h`,
    module.description,
    module.practice,
    module.tools?.map(t => t.name).join(', ') || '-',
  ]) || [];

  autoTable(doc, {
    startY: y,
    head: [['Module', 'Hours', 'Description', 'Practice', 'Tools']],
    body: curriculumData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [102, 51, 153] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15 },
      2: { cellWidth: 60 },
      3: { cellWidth: 50 },
      4: { cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // 기대효과 및 측정방법
  if (y > 180) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.text('Expected Outcomes', margin, y);
  y += 6;
  doc.setFontSize(9);
  data.pblCourse.expected_outcomes?.forEach(outcome => {
    doc.text('• ' + outcome, margin + 5, y);
    y += 5;
  });
  y += 5;

  doc.setFontSize(12);
  doc.text('Measurement Methods', margin, y);
  y += 6;
  doc.setFontSize(9);
  data.pblCourse.measurement_methods?.forEach(method => {
    doc.text('• ' + method, margin + 5, y);
    y += 5;
  });

  // 새 페이지: 과정 상세
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.text('Course Details', margin, y);
  y += 10;

  const courseData = data.courses.map(course => [
    course.course_name,
    course.level === 'BEGINNER' ? 'Beginner' : course.level === 'INTERMEDIATE' ? 'Intermediate' : 'Advanced',
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
    headStyles: { fillColor: [102, 51, 153] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 15 },
      4: { cellWidth: 50 },
      5: { cellWidth: 45 },
    },
    margin: { left: margin, right: margin },
  });

  // 푸터
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
