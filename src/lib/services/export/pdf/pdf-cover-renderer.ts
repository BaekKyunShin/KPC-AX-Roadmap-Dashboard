/**
 * PDF 표지 + 진단 요약 렌더링
 * 산인공 공식 로드맵 보고서 — 커버 페이지
 */

import { LAYOUT, FONT } from './pdf-constants';
import {
  type DocContext,
  setRegular,
  setBold,
  drawDivider,
  drawSectionTitle,
  drawBodyText,
} from './pdf-helpers';

interface CoverData {
  companyName: string;
  versionNumber: number;
  status: string;
  createdAt: string;
  finalizedAt?: string | null;
  diagnosisSummary: string;
}

/** 표지(타이틀 + 메타 + 진단 요약) 렌더 */
export function drawCoverPage(ctx: DocContext, data: CoverData): void {
  const { doc } = ctx;

  // 메인 제목
  ctx.y = 30;
  setBold(ctx, FONT.SIZE.TITLE);
  doc.setTextColor(...LAYOUT.HEADER_COLOR);
  doc.text('AI 교육 훈련 로드맵', LAYOUT.PAGE_WIDTH / 2, ctx.y, { align: 'center' });
  ctx.y += 4;

  doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  doc.setLineWidth(0.8);
  doc.line(LAYOUT.PAGE_WIDTH / 2 - 30, ctx.y, LAYOUT.PAGE_WIDTH / 2 + 30, ctx.y);
  ctx.y += 12;

  // 메타 정보 (2열 배치)
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
  drawBodyText(ctx, data.diagnosisSummary || '-');
  ctx.y += 8;
}
