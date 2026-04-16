/**
 * Ⅲ-1. 역량 모델링 섹션 렌더링
 * RoadmapCompetency 배열을 7열 테이블로 출력
 */

import type { RoadmapCompetency } from '../../roadmap/roadmap-types';
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

/** 배열을 불릿 문자열로 변환 */
function bulletList(items: string[] | undefined): string {
  if (!items || items.length === 0) return '-';
  return items.map(v => `• ${v}`).join('\n');
}

/** NCS 활용/도출 방법 셀 문자열 생성 */
function ncsMethodology(comp: RoadmapCompetency): string {
  if (comp.ncs_used) {
    return comp.ncs_methodology?.trim() || '-';
  }
  return comp.ncs_derivation_method?.trim() || '-';
}

/** 역량 모델링 섹션 렌더 */
export function drawCompetencySection(
  ctx: DocContext,
  competencies: RoadmapCompetency[],
  autoTable: AutoTableFn,
  tableBase: TableBase,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  drawSectionTitle(ctx, 'Ⅲ-1. 역량 모델링');

  const rows = (competencies ?? []).map(comp => [
    comp.name || '-',
    comp.definition || '-',
    bulletList(comp.knowledge),
    bulletList(comp.skills),
    bulletList(comp.attitudes),
    comp.ncs_used ? 'O' : 'X',
    ncsMethodology(comp),
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['역량명', '정의', '지식(K)', '기술(S)', '태도(A)', 'NCS 활용', 'NCS 활용/도출 방법']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.12 },
      1: { cellWidth: CW * 0.20 },
      2: { cellWidth: CW * 0.14 },
      3: { cellWidth: CW * 0.14 },
      4: { cellWidth: CW * 0.14 },
      5: { cellWidth: CW * 0.07, halign: 'center' as const },
      6: { cellWidth: CW * 0.19 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;
}
