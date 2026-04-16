/**
 * Ⅲ-3. 연간 훈련계획 섹션 렌더링
 * RoadmapAnnualPlan 을 테이블 + 활용방안 텍스트로 출력
 */

import type { RoadmapAnnualPlan } from '../../roadmap/roadmap-types';
import { LAYOUT } from './pdf-constants';
import {
  type DocContext,
  drawSectionTitle,
  drawTableTitle,
  drawBodyText,
  getTableFinalY,
  getAutoTableStyles,
  checkPageBreak,
} from './pdf-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTableFn = any;
type TableBase = ReturnType<typeof getAutoTableStyles>;

/** 연간 훈련계획 섹션 렌더 */
export function drawAnnualPlanSection(
  ctx: DocContext,
  plan: RoadmapAnnualPlan | undefined,
  autoTable: AutoTableFn,
  tableBase: TableBase,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;
  const items = plan?.items ?? [];
  const usagePlan = plan?.usage_plan ?? '';

  drawSectionTitle(ctx, 'Ⅲ-3. 연간 훈련계획');

  const rows = items.map(item => [
    item.competency_name || '-',
    item.course_name || '-',
    item.format || '-',
    `${item.hours ?? 0}시간`,
    item.notes || '-',
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['역량명', '훈련과정명', '훈련형태', '훈련시간', '비고']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.18 },
      1: { cellWidth: CW * 0.32 },
      2: { cellWidth: CW * 0.14, halign: 'center' as const },
      3: { cellWidth: CW * 0.12, halign: 'center' as const },
      4: { cellWidth: CW * 0.24 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;

  // 활용방안
  checkPageBreak(ctx, 20);
  drawTableTitle(ctx, '활용방안');
  drawBodyText(ctx, usagePlan || '-');
  ctx.y += 4;
}
