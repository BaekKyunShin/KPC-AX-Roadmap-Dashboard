/**
 * Ⅲ. 훈련실시 계획 제안 — 훈련과정 명세서 섹션 렌더링 (양식 v2)
 * RoadmapCourseSpec 목록을 과정별 1페이지 카드 + 교과목 테이블로 출력
 *
 * v2 신규: 훈련시기(training_period) · 훈련수준(training_level) 2행 추가.
 *          v1 `format` 은 `training_method`(훈련방법)로 이름 변경.
 */

import type { RoadmapCourseSpec } from '../../roadmap/roadmap-types';
import { TRAINING_LEVEL_LABEL } from '../../roadmap/roadmap-types';
import { splitByUnit } from '@/lib/utils/list-format';
import { LAYOUT, FONT } from './pdf-constants';
import {
  type DocContext,
  drawSectionTitle,
  drawSubsectionTitle,
  drawTableTitle,
  drawLabelValue,
  getTableFinalY,
  getAutoTableStyles,
  checkPageBreak,
  setRegular,
  setBold,
} from './pdf-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTableFn = any;
type TableBase = ReturnType<typeof getAutoTableStyles>;

/** 총 교과목 시간 합계 */
function sumSubjectHours(spec: RoadmapCourseSpec): number {
  return (spec.subjects ?? []).reduce((sum, s) => sum + (s.hours ?? 0), 0);
}

/**
 * 훈련수준 enum → 한글 라벨(초급/중급/고급).
 * 레거시 row 에 enum 밖의 값이 남아있을 수 있어 매핑 실패 시 '-' 로 폴백한다.
 */
function trainingLevelLabel(spec: RoadmapCourseSpec): string {
  return TRAINING_LEVEL_LABEL[spec.training_level] ?? '-';
}

/** 단일 훈련과정 명세서 렌더 (1페이지 기본) */
function drawSingleCourseSpec(
  ctx: DocContext,
  spec: RoadmapCourseSpec,
  index: number,
  autoTable: AutoTableFn,
  tableBase: TableBase
): void {
  const CW = LAYOUT.CONTENT_WIDTH;

  // 과정 제목
  drawSubsectionTitle(ctx, `${index + 1}. ${spec.course_name || '-'}`);
  ctx.y += 2;

  // 메타 (시기·수준·방법·추천사업) — 양식 v2 표의 상단 4행 순서 그대로
  drawLabelValue(ctx, '훈련시기:', spec.training_period || '-');
  drawLabelValue(ctx, '훈련수준:', trainingLevelLabel(spec));
  drawLabelValue(ctx, '훈련방법:', spec.training_method || '-');
  drawLabelValue(ctx, '추천 훈련사업:', spec.recommended_program || '-');
  ctx.y += 3;

  // 본문 라벨-값
  drawLabelValue(ctx, '훈련목표:', spec.goal || '-');
  drawLabelValue(ctx, '주요 훈련내용:', spec.main_content || '-');
  drawLabelValue(ctx, '훈련대상:', spec.target_audience || '-');
  ctx.y += 5;

  // 교과목 테이블
  checkPageBreak(ctx, 30);
  drawTableTitle(ctx, '교과목');

  const subjects = spec.subjects ?? [];
  const rows = subjects.map((sub) => [
    sub.name || '-',
    splitByUnit(sub.details) || '-',
    `${sub.hours ?? 0}시간`,
  ]);

  autoTable(ctx.doc, {
    startY: ctx.y,
    head: [['과목명', '세부내용', '시간']],
    body: rows.length > 0 ? rows : [['-', '-', '-']],
    theme: 'grid',
    ...tableBase,
    columnStyles: {
      0: { cellWidth: CW * 0.22 },
      1: { cellWidth: CW * 0.6 },
      2: { cellWidth: CW * 0.18, halign: 'center' as const },
    },
    tableWidth: CW,
    margin: { left: LAYOUT.MARGIN, right: LAYOUT.MARGIN },
  });

  ctx.y = getTableFinalY(ctx.doc) + 5;

  // 시간 합계
  checkPageBreak(ctx, 10);
  const total = sumSubjectHours(spec);
  setBold(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.HEADER_COLOR);
  ctx.doc.text(`총 교육시간: ${total}시간`, LAYOUT.PAGE_WIDTH - LAYOUT.MARGIN, ctx.y, {
    align: 'right',
  });
  setRegular(ctx, FONT.SIZE.BODY);
  ctx.doc.setTextColor(...LAYOUT.BODY_COLOR);
  ctx.y += 8;
}

/** 훈련과정 명세서 섹션 렌더 (과정 개수만큼 반복, 각 과정은 새 페이지에서 시작) */
export function drawCourseSpecSection(
  ctx: DocContext,
  specs: RoadmapCourseSpec[],
  autoTable: AutoTableFn,
  tableBase: TableBase
): void {
  drawSectionTitle(ctx, 'Ⅲ. 훈련실시 계획 제안');

  const list = specs ?? [];

  if (list.length === 0) {
    drawSubsectionTitle(ctx, '등록된 훈련과정이 없습니다.');
    return;
  }

  list.forEach((spec, idx) => {
    if (idx > 0) {
      // 두 번째 명세서부터는 새 페이지에서 시작 (가독성)
      ctx.doc.addPage();
      ctx.y = LAYOUT.MARGIN + 5;
    }
    drawSingleCourseSpec(ctx, spec, idx, autoTable, tableBase);
  });
}
