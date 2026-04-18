/**
 * PBL PDF 표지(Ⅰ장 요약) 렌더러
 * 산인공 PBL 양식 2번 — 커버 페이지 + 인터뷰 요약(Ⅰ장 필드만)
 */

import { LAYOUT, FONT } from './pdf-constants';
import {
  type DocContext,
  setRegular,
  setBold,
  drawDivider,
  drawSectionTitle,
  drawBodyText,
  drawLabelValue,
} from './pdf-helpers';

export interface PBLOverviewData {
  companyName: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  finalizedAt?: string | null;
  diagnosisSummary: string;
  /** 인터뷰 Ⅰ장 요약(옵션) */
  interviewOverview?: {
    courseName: string;
    trainingHours: number;
    traineeCount: number;
    trainingJob: string;
    aiLevel: string;
    trainingGoals: string[];
  };
}

export function drawPBLOverviewPage(ctx: DocContext, data: PBLOverviewData): void {
  const { doc } = ctx;

  ctx.y = 30;
  setBold(ctx, FONT.SIZE.TITLE);
  doc.setTextColor(...LAYOUT.HEADER_COLOR);
  doc.text('AI PBL 과정개발 보고서', LAYOUT.PAGE_WIDTH / 2, ctx.y, { align: 'center' });
  ctx.y += 4;

  doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  doc.setLineWidth(0.8);
  doc.line(LAYOUT.PAGE_WIDTH / 2 - 34, ctx.y, LAYOUT.PAGE_WIDTH / 2 + 34, ctx.y);
  ctx.y += 12;

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

  drawSectionTitle(ctx, '진단 요약');
  drawBodyText(ctx, data.diagnosisSummary || '-');
  ctx.y += 6;

  if (data.interviewOverview) {
    drawSectionTitle(ctx, 'Ⅰ. 훈련과정 개요');
    drawLabelValue(ctx, '과정명', data.interviewOverview.courseName || '-');
    drawLabelValue(ctx, '훈련 시간', `${data.interviewOverview.trainingHours}시간`);
    drawLabelValue(ctx, '훈련생 수', `${data.interviewOverview.traineeCount}명`);
    drawLabelValue(ctx, '훈련 직무', data.interviewOverview.trainingJob || '-');
    drawLabelValue(ctx, 'AI 역량 수준', data.interviewOverview.aiLevel || '-');
    drawLabelValue(
      ctx,
      '훈련 목표',
      data.interviewOverview.trainingGoals.length > 0
        ? data.interviewOverview.trainingGoals.join(', ')
        : '-',
    );
    ctx.y += 6;
  }
}
