/**
 * PBL PDF Ⅴ장 성과분석·확산 전략 렌더러
 */

import type { PBLPerformanceAnalysis } from '../../pbl/pbl-types';
import {
  type DocContext,
  drawBulletItem,
  drawLabelValue,
  drawSectionTitle,
  drawSubsectionTitle,
} from './pdf-helpers';

export function drawPBLPerformanceSection(
  ctx: DocContext,
  analysis: PBLPerformanceAnalysis,
): void {
  drawSectionTitle(ctx, 'Ⅴ. 성과분석 및 확산 전략');

  drawSubsectionTitle(ctx, 'Ⅴ-1. 성과분석 측정 지표');
  drawLabelValue(
    ctx,
    '훈련 목표 분류',
    analysis.training_goal_categories.length > 0
      ? analysis.training_goal_categories.join(', ')
      : '-',
  );
  ctx.y += 2;

  drawLabelValue(ctx, '정량 지표', '');
  if (analysis.quantitative_metrics.length === 0) {
    drawBulletItem(ctx, '-');
  } else {
    for (const metric of analysis.quantitative_metrics) drawBulletItem(ctx, metric);
  }
  ctx.y += 2;

  drawLabelValue(ctx, '정성 지표', '');
  if (analysis.qualitative_metrics.length === 0) {
    drawBulletItem(ctx, '-');
  } else {
    for (const metric of analysis.qualitative_metrics) drawBulletItem(ctx, metric);
  }
  ctx.y += 4;

  drawSubsectionTitle(ctx, 'Ⅴ-2. 성과 확산 전략');
  drawLabelValue(ctx, '내재화 방안', '');
  if (analysis.internalization_plan.length === 0) {
    drawBulletItem(ctx, '-');
  } else {
    for (const item of analysis.internalization_plan) drawBulletItem(ctx, item);
  }
  ctx.y += 2;

  drawLabelValue(ctx, '전사 확산 방안', '');
  if (analysis.dissemination_plan.length === 0) {
    drawBulletItem(ctx, '-');
  } else {
    for (const item of analysis.dissemination_plan) drawBulletItem(ctx, item);
  }
  ctx.y += 4;
}
