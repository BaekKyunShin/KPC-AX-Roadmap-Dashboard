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
import { FONT, LAYOUT } from './pdf-constants';
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
      // 역량명 열은 강조 표시용으로 Bold 폰트를 사용한다.
      // 주의: `fontStyle: 'bold'`만 쓰면 현재 폰트(Pretendard Regular)의 bold variant를
      // 찾는데, pdf-font-loader는 Regular과 Bold를 서로 다른 font family(Pretendard/
      // PretendardBold) + 둘 다 'normal' 스타일로 등록하므로 bold variant가 없어
      // 기본 폰트(Helvetica)로 fallback → 한글 글리프 깨짐이 발생한다.
      // `font: FONT.BOLD`로 Bold family를 명시 지정해야 한글이 정상 렌더된다.
      0: { cellWidth: CW * 0.14, font: FONT.BOLD },
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
