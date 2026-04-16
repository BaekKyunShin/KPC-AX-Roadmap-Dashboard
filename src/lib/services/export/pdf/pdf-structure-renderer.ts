/**
 * Ⅲ-2. 훈련체계도 섹션 렌더링
 * 산인공 양식 1번 그대로 6열 단순 표로 출력:
 *   구분(역량명) · 훈련수준 · 훈련내용 · 훈련대상 · 훈련방법 · 훈련목표
 */

import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
} from '../../roadmap/roadmap-types';
import { buildTrainingStructureTable } from '../../roadmap/roadmap-matrix-builder';
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

/** 훈련체계도 섹션 렌더 */
export function drawStructureSection(
  ctx: DocContext,
  competencies: RoadmapCompetency[],
  structure: RoadmapTrainingStructureItem[],
  autoTable: AutoTableFn,
  tableBase: TableBase,
  trainingStructureMethod?: string,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  drawSectionTitle(ctx, 'Ⅲ-2. 훈련체계도');

  const rows = buildTrainingStructureTable(competencies ?? [], structure ?? []).map((r) => [
    r.competency_name || '-',
    r.level_label,
    r.content || '-',
    r.target_audience || '-',
    r.method || '-',
    r.goal || '-',
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['구분(역량명)', '훈련수준', '훈련내용', '훈련대상', '훈련방법', '훈련목표']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.14, fontStyle: 'bold' as const },
      1: { cellWidth: CW * 0.09, halign: 'center' as const },
      2: { cellWidth: CW * 0.24 },
      3: { cellWidth: CW * 0.14 },
      4: { cellWidth: CW * 0.13 },
      5: { cellWidth: CW * 0.26 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 6;

  // 훈련체계 수립 방법 (양식 Ⅲ-2)
  const method = (trainingStructureMethod ?? '').trim();
  if (method !== '') {
    autoTable(ctx.doc, {
      startY: ctx.y,
      head: [['훈련체계 수립 방법']],
      body: [[method]],
      theme: 'grid',
      ...tableBase,
      tableWidth: CW,
      margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    });
    ctx.y = getTableFinalY(ctx.doc) + 10;
  } else {
    ctx.y += 4;
  }
}
