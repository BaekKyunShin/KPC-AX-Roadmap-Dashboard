/**
 * Ⅲ-1. 역량 모델링 섹션 렌더링
 *  - 역량 표: 5열 (역량명·정의(수행준거)·지식·기술·태도)
 *  - NCS 활용/도출 방법: 표 전체 단위 별도 박스 (양식 Ⅲ-1 하단)
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

interface CompetencyNcsInfo {
  ncs_used: boolean;
  ncs_methodology: string;
  ncs_derivation_method: string;
}

/** 역량 모델링 섹션 렌더 (표 + NCS 박스) */
export function drawCompetencySection(
  ctx: DocContext,
  competencies: RoadmapCompetency[],
  autoTable: AutoTableFn,
  tableBase: TableBase,
  ncs?: CompetencyNcsInfo,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  drawSectionTitle(ctx, 'Ⅲ-1. 역량 모델링');

  const rows = (competencies ?? []).map(comp => [
    comp.name || '-',
    comp.definition || '-',
    bulletList(comp.knowledge),
    bulletList(comp.skills),
    bulletList(comp.attitudes),
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['역량명', '정의(수행준거)', '지식(학술, 업무지식)', '기술(기능)', '태도']],
    body: rows.length > 0 ? rows : [['-', '-', '-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.15 },
      1: { cellWidth: CW * 0.25 },
      2: { cellWidth: CW * 0.2 },
      3: { cellWidth: CW * 0.2 },
      4: { cellWidth: CW * 0.2 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 6;

  // NCS 활용 방법 / 역량별 도출 방법 (표 전체 단위 별도 박스)
  if (ncs) {
    const label = ncs.ncs_used ? 'NCS 활용 방법' : '역량별 도출 방법';
    const body = ncs.ncs_used
      ? ncs.ncs_methodology?.trim() || '-'
      : ncs.ncs_derivation_method?.trim() || '-';
    autoTable(ctx.doc, {
      startY: ctx.y,
      head: [[label]],
      body: [[body]],
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
