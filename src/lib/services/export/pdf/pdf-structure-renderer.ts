/**
 * Ⅲ-2. 훈련체계도 섹션 렌더링
 * 역량 × 수준(초/중/고) 매트릭스를 테이블로 출력
 */

import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
} from '../../roadmap/roadmap-types';
import { buildTrainingStructureMatrix } from '../../roadmap/roadmap-matrix-builder';
import { LAYOUT } from './pdf-constants';
import {
  type DocContext,
  drawSectionTitle,
  getTableFinalY,
  getAutoTableStyles,
} from './pdf-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTableFn = any;
type TableBase = ReturnType<typeof getAutoTableStyles>;

/** 한 셀의 훈련 항목들을 멀티라인 문자열로 포맷 */
function formatCell(items: RoadmapTrainingStructureItem[]): string {
  if (!items || items.length === 0) return '-';
  return items
    .map(it => {
      const lines: string[] = [];
      if (it.content) lines.push(`[내용] ${it.content}`);
      if (it.target_audience) lines.push(`[대상] ${it.target_audience}`);
      if (it.method) lines.push(`[방법] ${it.method}`);
      if (it.goal) lines.push(`[목표] ${it.goal}`);
      return lines.length > 0 ? lines.join('\n') : '-';
    })
    .join('\n\n');
}

/** 훈련체계도 섹션 렌더 */
export function drawStructureSection(
  ctx: DocContext,
  competencies: RoadmapCompetency[],
  structure: RoadmapTrainingStructureItem[],
  autoTable: AutoTableFn,
  tableBase: TableBase,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  drawSectionTitle(ctx, 'Ⅲ-2. 훈련체계도');

  const matrix = buildTrainingStructureMatrix(competencies ?? [], structure ?? []);

  const rows = matrix.map(row => [
    row.competency_name || '-',
    formatCell(row.beginner),
    formatCell(row.intermediate),
    formatCell(row.advanced),
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['역량명', '초급', '중급', '고급']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.16, fontStyle: 'bold' as const },
      1: { cellWidth: CW * 0.28 },
      2: { cellWidth: CW * 0.28 },
      3: { cellWidth: CW * 0.28 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;
}
