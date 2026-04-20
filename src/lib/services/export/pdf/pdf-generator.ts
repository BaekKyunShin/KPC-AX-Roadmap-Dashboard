/**
 * PDF 내보내기 메인 오케스트레이터
 * 산인공 공식 훈련 로드맵 보고서 양식(Ⅲ장 4섹션)
 *
 * 구조:
 *   페이지 1: 표지 + 진단 요약
 *   페이지 2: Ⅲ-1. 역량 모델링
 *   페이지 3: Ⅲ-2. 훈련체계도
 *   페이지 4: Ⅲ-3. 연간 훈련계획
 *   페이지 5+: Ⅲ-4. 훈련과정 명세서 (과정당 1페이지)
 */

import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlan,
  RoadmapCourseSpec,
} from '../../roadmap/roadmap-types';
import { LAYOUT, FONT } from './pdf-constants';
import { loadFonts } from './pdf-font-loader';
import {
  type DocContext,
  setRegular,
  getAutoTableStyles,
} from './pdf-helpers';
import { drawCoverPage } from './pdf-cover-renderer';
import { drawCompetencySection } from './pdf-competency-renderer';
import { drawStructureSection } from './pdf-structure-renderer';
import { drawAnnualPlanSection } from './pdf-annual-renderer';
import { drawCourseSpecSection } from './pdf-coursespec-renderer';

export interface RoadmapExportData {
  companyName: string;
  projectId: string;
  versionNumber: number;
  status: string;
  diagnosisSummary: string;
  competencies: RoadmapCompetency[];
  /** 표 전체 단위 NCS 활용 여부 (양식 Ⅲ-1) */
  ncsUsed?: boolean;
  ncsMethodology?: string;
  ncsDerivationMethod?: string;
  trainingStructure: RoadmapTrainingStructureItem[];
  /** Ⅲ-2 훈련체계 수립 방법 */
  trainingStructureMethod?: string;
  annualPlan: RoadmapAnnualPlan;
  courseSpecs: RoadmapCourseSpec[];
  createdAt: string;
  finalizedAt?: string | null;
}

/** 로드맵 데이터를 Portrait A4 PDF Blob으로 변환 (4섹션 구조) */
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

  // ======================================================================
  // 페이지 1: 표지 + 진단 요약
  // ======================================================================
  drawCoverPage(ctx, {
    companyName: data.companyName,
    versionNumber: data.versionNumber,
    status: data.status,
    createdAt: data.createdAt,
    finalizedAt: data.finalizedAt,
    diagnosisSummary: data.diagnosisSummary,
  });

  // ======================================================================
  // 페이지 2: Ⅲ-1. 역량 모델링
  // ======================================================================
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;
  drawCompetencySection(ctx, data.competencies, autoTable, tableBase, {
    ncs_used: data.ncsUsed ?? false,
    ncs_methodology: data.ncsMethodology ?? '',
    ncs_derivation_method: data.ncsDerivationMethod ?? '',
  });

  // ======================================================================
  // 페이지 3: Ⅲ-2. 훈련체계도
  // ======================================================================
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;
  drawStructureSection(
    ctx,
    data.competencies,
    data.trainingStructure,
    autoTable,
    tableBase,
    data.trainingStructureMethod,
  );

  // ======================================================================
  // 페이지 4: Ⅲ-3. 연간 훈련계획
  // ======================================================================
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;
  drawAnnualPlanSection(ctx, data.annualPlan, autoTable, tableBase);

  // ======================================================================
  // 페이지 5+: Ⅲ-4. 훈련과정 명세서
  // ======================================================================
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;
  drawCourseSpecSection(ctx, data.courseSpecs, autoTable, tableBase);

  // ======================================================================
  // 푸터 (전체 페이지)
  // ======================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...LAYOUT.DIVIDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(
      LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 15,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 15,
    );

    setRegular(ctx, FONT.SIZE.FOOTER);
    doc.setTextColor(...LAYOUT.MUTED_COLOR);
    doc.text('KPC AI 교육 로드맵 대시보드', LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 10);
    doc.text(
      `${i} / ${pageCount}`,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 10,
      { align: 'right' },
    );
  }

  return doc.output('blob');
}
