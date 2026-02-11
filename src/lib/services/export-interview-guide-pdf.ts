/**
 * 인터뷰 사전 분석 가이드 PDF 내보내기
 * 선택된 질문 + 4개 섹션을 A4 PDF로 생성
 */

import type { jsPDF } from 'jspdf';
import type { GuideData, GuideKeyPointStatus } from '@/lib/schemas/interview-guide';

// ============================================================================
// 레이아웃 상수
// ============================================================================

const LAYOUT = {
  MARGIN: 20,
  PAGE_WIDTH: 210,
  PAGE_HEIGHT: 297,
  get CONTENT_WIDTH() { return this.PAGE_WIDTH - this.MARGIN * 2; },
  HEADER_COLOR: [102, 51, 153] as [number, number, number],
  BODY_COLOR: [51, 51, 51] as [number, number, number],
  MUTED_COLOR: [120, 120, 120] as [number, number, number],
  DIVIDER_COLOR: [200, 200, 200] as [number, number, number],
} as const;

const FONT = {
  REGULAR: 'Pretendard',
  BOLD: 'PretendardBold',
  SIZE: {
    TITLE: 16,
    SECTION: 12,
    BODY: 9,
    SMALL: 8,
    FOOTER: 7,
  },
  LINE_HEIGHT: {
    BODY: 4.8,
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
      if (!response.ok) return false;
      fontCache[path] = arrayBufferToBase64(await response.arrayBuffer());
    }
    doc.addFileToVFS(vfsName, fontCache[path]);
    doc.addFont(vfsName, fontName, style);
    return true;
  } catch {
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
// 헬퍼
// ============================================================================

interface Ctx {
  doc: jsPDF;
  y: number;
  hasFonts: boolean;
}

function setRegular(ctx: Ctx, size: number) {
  ctx.doc.setFont(ctx.hasFonts ? FONT.REGULAR : 'helvetica', 'normal');
  ctx.doc.setFontSize(size);
}

function setBold(ctx: Ctx, size: number) {
  if (ctx.hasFonts) {
    ctx.doc.setFont(FONT.BOLD, 'normal');
  } else {
    ctx.doc.setFont('helvetica', 'bold');
  }
  ctx.doc.setFontSize(size);
}

function checkPageBreak(ctx: Ctx, needed: number) {
  if (ctx.y + needed > LAYOUT.PAGE_HEIGHT - 20) {
    ctx.doc.addPage();
    ctx.y = LAYOUT.MARGIN + 5;
  }
}

function drawSectionTitle(ctx: Ctx, title: string) {
  checkPageBreak(ctx, 15);
  setBold(ctx, FONT.SIZE.SECTION);
  ctx.doc.setTextColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.text(title, LAYOUT.MARGIN, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(LAYOUT.MARGIN, ctx.y, LAYOUT.MARGIN + 35, ctx.y);
  ctx.y += 6;
}

const STATUS_LABEL: Record<GuideKeyPointStatus, string> = {
  critical: '[위험]',
  warning: '[주의]',
  good: '[양호]',
};

// ============================================================================
// 메인 함수
// ============================================================================

export async function generateInterviewGuidePDF(data: GuideData): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const hasFonts = await loadFonts(doc);
  doc.setLineHeightFactor(1.5);
  const ctx: Ctx = { doc, y: LAYOUT.MARGIN, hasFonts };

  // 제목
  ctx.y = 25;
  setBold(ctx, FONT.SIZE.TITLE);
  doc.setTextColor(...LAYOUT.HEADER_COLOR);
  doc.text('인터뷰 사전 분석 보고서', LAYOUT.PAGE_WIDTH / 2, ctx.y, { align: 'center' });
  ctx.y += 3;
  doc.setDrawColor(...LAYOUT.HEADER_COLOR);
  doc.setLineWidth(0.6);
  doc.line(LAYOUT.PAGE_WIDTH / 2 - 25, ctx.y, LAYOUT.PAGE_WIDTH / 2 + 25, ctx.y);
  ctx.y += 8;

  // 생성일
  setRegular(ctx, FONT.SIZE.SMALL);
  doc.setTextColor(...LAYOUT.MUTED_COLOR);
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, ctx.y, { align: 'right' });
  ctx.y += 8;

  // ── 기업 현황 요약 ──
  drawSectionTitle(ctx, '기업 현황 요약');
  setRegular(ctx, FONT.SIZE.BODY);
  doc.setTextColor(...LAYOUT.BODY_COLOR);
  const summaryLines: string[] = doc.splitTextToSize(data.company_summary, LAYOUT.CONTENT_WIDTH);
  summaryLines.forEach((line: string) => {
    checkPageBreak(ctx, 5);
    doc.text(line, LAYOUT.MARGIN, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY;
  });
  ctx.y += 5;

  // ── 핵심 파악 포인트 ──
  drawSectionTitle(ctx, '핵심 파악 포인트');

  const sorted = [...data.key_points].sort((a, b) => {
    const order: Record<GuideKeyPointStatus, number> = { critical: 0, warning: 1, good: 2 };
    return order[a.status] - order[b.status];
  });

  for (const point of sorted) {
    checkPageBreak(ctx, 12);
    setBold(ctx, FONT.SIZE.BODY);
    doc.setTextColor(...LAYOUT.BODY_COLOR);
    doc.text(`${STATUS_LABEL[point.status]} ${point.dimension} — ${point.score_percent}%`, LAYOUT.MARGIN + 2, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY;

    setRegular(ctx, FONT.SIZE.BODY);
    doc.setTextColor(...LAYOUT.MUTED_COLOR);
    const insightLines: string[] = doc.splitTextToSize(point.insight, LAYOUT.CONTENT_WIDTH - 4);
    insightLines.forEach((line: string) => {
      doc.text(line, LAYOUT.MARGIN + 4, ctx.y);
      ctx.y += FONT.LINE_HEIGHT.BODY;
    });
    ctx.y += 2;
  }
  ctx.y += 3;

  // ── 인터뷰 질문 체크리스트 (선택된 것만) ──
  drawSectionTitle(ctx, '인터뷰 질문 체크리스트');

  const checkedQuestions = data.questions.filter((q) => q.checked);
  if (checkedQuestions.length === 0) {
    setRegular(ctx, FONT.SIZE.BODY);
    doc.setTextColor(...LAYOUT.MUTED_COLOR);
    doc.text('선택된 질문이 없습니다.', LAYOUT.MARGIN + 2, ctx.y);
    ctx.y += FONT.LINE_HEIGHT.BODY + 3;
  } else {
    // 영역별 그룹핑
    const groups = new Map<string, typeof checkedQuestions>();
    for (const q of checkedQuestions) {
      const list = groups.get(q.dimension) ?? [];
      list.push(q);
      groups.set(q.dimension, list);
    }

    for (const [dimension, qs] of groups) {
      checkPageBreak(ctx, 10);
      setBold(ctx, FONT.SIZE.SMALL);
      doc.setTextColor(...LAYOUT.HEADER_COLOR);
      doc.text(dimension, LAYOUT.MARGIN + 2, ctx.y);
      ctx.y += FONT.LINE_HEIGHT.BODY + 1;

      for (const q of qs) {
        checkPageBreak(ctx, 10);

        // 체크박스 사각형
        setRegular(ctx, FONT.SIZE.BODY);
        doc.setDrawColor(...LAYOUT.MUTED_COLOR);
        doc.setLineWidth(0.3);
        doc.rect(LAYOUT.MARGIN + 4, ctx.y - 3, 3, 3);

        doc.setTextColor(...LAYOUT.BODY_COLOR);
        const qLines: string[] = doc.splitTextToSize(q.question, LAYOUT.CONTENT_WIDTH - 12);
        qLines.forEach((line: string, i: number) => {
          doc.text(line, LAYOUT.MARGIN + 10, ctx.y + (i > 0 ? i * FONT.LINE_HEIGHT.BODY : 0));
        });
        ctx.y += qLines.length * FONT.LINE_HEIGHT.BODY;

        // 의도
        setRegular(ctx, FONT.SIZE.SMALL);
        doc.setTextColor(...LAYOUT.MUTED_COLOR);
        doc.text(`→ ${q.intent}`, LAYOUT.MARGIN + 10, ctx.y);
        ctx.y += FONT.LINE_HEIGHT.BODY + 1;
      }
      ctx.y += 2;
    }
  }
  ctx.y += 3;

  // ── 주의사항 ──
  drawSectionTitle(ctx, '주의사항');
  for (const caution of data.cautions) {
    checkPageBreak(ctx, 8);
    setRegular(ctx, FONT.SIZE.BODY);
    doc.setTextColor(...LAYOUT.BODY_COLOR);
    const cautionLines: string[] = doc.splitTextToSize(`• ${caution}`, LAYOUT.CONTENT_WIDTH - 4);
    cautionLines.forEach((line: string) => {
      doc.text(line, LAYOUT.MARGIN + 2, ctx.y);
      ctx.y += FONT.LINE_HEIGHT.BODY;
    });
    ctx.y += 1;
  }

  // ── 푸터 ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LAYOUT.DIVIDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 15, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 15);

    setRegular(ctx, FONT.SIZE.FOOTER);
    doc.setTextColor(...LAYOUT.MUTED_COLOR);
    doc.text('KPC AI 교육 로드맵 대시보드', LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 10);
    doc.text(`${i} / ${pageCount}`, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, LAYOUT.PAGE_HEIGHT - 10, { align: 'right' });
  }

  return doc.output('blob');
}
