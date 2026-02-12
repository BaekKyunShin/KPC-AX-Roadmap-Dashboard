/**
 * PDF 과정 상세 렌더링
 * drawCourseDetail + PBL 데이터 추출 헬퍼
 */

import type { PBLCourse, RoadmapCell } from '../../roadmap';
import { getLevelLabel } from '@/lib/utils/roadmap';
import { LAYOUT, FONT } from './pdf-constants';
import {
  type DocContext,
  checkPageBreak,
  drawSubsectionTitle,
  drawTableTitle,
  getTableFinalY,
  getAutoTableStyles,
  formatBulletList,
} from './pdf-helpers';

// ============================================================================
// PBL 데이터 추출 헬퍼
// ============================================================================

export interface PBLExtendedFields {
  selected_course_name?: string;
  selected_course_level?: string;
  selected_course_task?: string;
  selection_rationale?: {
    consultant_expertise_fit?: string;
    pain_point_alignment?: string;
    feasibility_assessment?: string;
    summary?: string;
  };
  final_deliverables?: string[];
  business_impact?: string;
  prerequisites?: string[];
}

export interface PBLModuleExtended {
  module_name: string;
  hours: number;
  description: string;
  practice: string;
  deliverables?: string[];
  tools?: { name: string; free_tier_info: string }[];
}

export function extractPBLExtendedFields(pblCourse: PBLCourse): PBLExtendedFields {
  const extended = pblCourse as unknown as PBLExtendedFields;
  return {
    selected_course_name: extended.selected_course_name,
    selected_course_level: extended.selected_course_level,
    selected_course_task: extended.selected_course_task,
    selection_rationale: extended.selection_rationale,
    final_deliverables: extended.final_deliverables,
    business_impact: extended.business_impact,
    prerequisites: extended.prerequisites,
  };
}

export function extractModuleDeliverables(
  module: PBLCourse['curriculum'][number]
): string[] | undefined {
  const extended = module as unknown as PBLModuleExtended;
  return extended.deliverables;
}

// ============================================================================
// 과정 상세 렌더링 (과정 1개분)
// ============================================================================

export function drawCourseDetail(
  ctx: DocContext,
  course: RoadmapCell,
  index: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoTable: any,
  tableBase: ReturnType<typeof getAutoTableStyles>,
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  // 과정 제목 (Level 2)
  checkPageBreak(ctx, 50);
  drawSubsectionTitle(ctx, `${index + 1}. ${course.course_name} (${getLevelLabel(course.level)})`);

  // ── 프로파일 테이블 (key-value 2열) ──
  const toolsText = course.tools?.map(t =>
    `${t.name}${t.free_tier_info ? ` (${t.free_tier_info})` : ''}`
  ).join(', ') || '-';

  const prereqText = course.prerequisites && course.prerequisites.length > 0
    ? course.prerequisites.join(', ')
    : '없음';

  const profileData = [
    ['과정 목표', course.expected_outcome || '-'],
    ['교육 대상', course.target_audience || '-'],
    ['대상 업무', course.target_task || '-'],
    ['난이도', getLevelLabel(course.level)],
    ['교육 시간', `${course.recommended_hours}시간`],
    ['사용 도구', toolsText],
    ['선수 조건', prereqText],
  ];

  autoTable(ctx.doc, {
    startY: ctx.y,
    body: profileData,
    theme: 'plain',
    styles: {
      font: tableBase.styles.font,
      fontSize: FONT.SIZE.TABLE_BODY,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: LAYOUT.BODY_COLOR,
      lineColor: [230, 230, 230] as [number, number, number],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: {
        cellWidth: CW * 0.18,
        fillColor: LAYOUT.LABEL_BG,
        font: ctx.hasFonts ? FONT.BOLD : 'helvetica',
        fontStyle: ctx.hasFonts ? 'normal' as const : 'bold' as const,
        textColor: [80, 60, 120] as [number, number, number],
      },
      1: { cellWidth: CW * 0.82 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;

  // ── 커리큘럼 테이블 (4열) ──
  const curriculum = course.curriculum || [];
  if (curriculum.length > 0) {
    drawTableTitle(ctx, '커리큘럼');

    const currData = curriculum.map(m => [
      `${m.hours}h`,
      m.module_name,
      formatBulletList(ctx.doc, m.details || [], CW * 0.42, ctx.hasFonts),
      m.practice || '-',
    ]);

    autoTable(ctx.doc, {
      startY: ctx.y,
      head: [['시간', '학습 모듈', '세부 내용', '실습/과제']],
      body: currData,
      theme: 'grid',
      ...tableBase,
      columnStyles: {
        0: { cellWidth: CW * 0.08, halign: 'center' as const },
        1: { cellWidth: CW * 0.20 },
        2: { cellWidth: CW * 0.42 },
        3: { cellWidth: CW * 0.30 },
      },
      tableWidth: CW,
      margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
    });

    ctx.y = getTableFinalY(ctx.doc) + 10;
  }

  // ── 기대효과 & 측정방법 테이블 (2열) ──
  drawTableTitle(ctx, '기대효과 및 측정방법');

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['기대효과', '측정 방법']],
    body: [[course.expected_outcome || '-', course.measurement_method || '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.50 },
      1: { cellWidth: CW * 0.50 },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 10;
}
