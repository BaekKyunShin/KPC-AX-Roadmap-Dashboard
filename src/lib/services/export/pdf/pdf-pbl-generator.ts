/**
 * PBL PDF 내보내기 메인 오케스트레이터
 * 산인공 PBL 양식 2번 Ⅳ장 기반
 */

import type { PBLContent } from '../../pbl/pbl-types';
import { LAYOUT, FONT } from './pdf-constants';
import { loadFonts } from './pdf-font-loader';
import { type DocContext, setRegular, getAutoTableStyles } from './pdf-helpers';
import { drawPBLOverviewPage, type PBLOverviewData } from './pdf-pbl-overview-renderer';
import {
  drawPBLRequirementsSection,
  type PBLRequirementsData,
} from './pdf-pbl-requirements-renderer';
import { drawPBLOperationSection } from './pdf-pbl-operation-renderer';

export interface PBLExportData {
  companyName: string;
  projectId: string;
  versionNumber: number;
  status: string;
  diagnosisSummary: string;
  pblContent: PBLContent;
  createdAt: string;
  finalizedAt?: string | null;
  interviewOverview?: PBLOverviewData['interviewOverview'];
  requirements?: PBLRequirementsData;
}

export async function generatePBLPDF(data: PBLExportData): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const hasFonts = await loadFonts(doc);
  doc.setLineHeightFactor(1.5);

  const ctx: DocContext = { doc, y: LAYOUT.MARGIN, hasFonts };
  const tableBase = getAutoTableStyles(hasFonts);

  // 표지 + Ⅰ장 요약
  drawPBLOverviewPage(ctx, {
    companyName: data.companyName,
    versionNumber: data.versionNumber,
    status: data.status,
    createdAt: data.createdAt,
    finalizedAt: data.finalizedAt,
    diagnosisSummary: data.diagnosisSummary,
    interviewOverview: data.interviewOverview,
  });

  // Ⅱ·Ⅲ장 요약 (인터뷰 데이터가 있을 때만)
  if (data.requirements) {
    doc.addPage();
    ctx.y = LAYOUT.MARGIN + 5;
    drawPBLRequirementsSection(ctx, data.requirements);
  }

  // Ⅳ장 운영계획
  doc.addPage();
  ctx.y = LAYOUT.MARGIN + 5;
  drawPBLOperationSection(ctx, data.pblContent.operation_plan, autoTable, tableBase);

  // 푸터
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
    doc.text('KPC AI PBL 보고서', LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 10);
    doc.text(
      `${i} / ${pageCount}`,
      LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN,
      LAYOUT.PAGE_HEIGHT - 10,
      { align: 'right' },
    );
  }

  return doc.output('blob');
}
