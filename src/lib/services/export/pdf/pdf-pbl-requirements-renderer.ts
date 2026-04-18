/**
 * PBL PDF Ⅱ·Ⅲ장 요구분석·훈련대상 업무 렌더러 (옵션)
 * 인터뷰 데이터가 있을 때만 간략 요약을 PDF에 포함한다.
 * 전체 Ⅱ·Ⅲ장은 HWPX 내보내기(Step 10)에서 상세 렌더링된다.
 */

import type { DocContext } from './pdf-helpers';
import {
  drawBodyText,
  drawLabelValue,
  drawSectionTitle,
  drawSubsectionTitle,
} from './pdf-helpers';

export interface PBLRequirementsData {
  trainingNeedsAnalysis?: string;
  selectionReason?: string;
  targetTaskDetails?: Array<{
    task_name: string;
    as_is: string;
    to_be: string;
    required_knowledge: string;
    required_skill: string;
  }>;
}

export function drawPBLRequirementsSection(ctx: DocContext, data: PBLRequirementsData): void {
  // 인터뷰 데이터가 전혀 없으면 아예 스킵 (빈 페이지 방지)
  const hasContent =
    (data.trainingNeedsAnalysis && data.trainingNeedsAnalysis.trim() !== '') ||
    (data.selectionReason && data.selectionReason.trim() !== '') ||
    (data.targetTaskDetails && data.targetTaskDetails.length > 0);
  if (!hasContent) return;

  drawSectionTitle(ctx, 'Ⅱ·Ⅲ. 요구분석·훈련대상 업무 요약');

  if (data.trainingNeedsAnalysis) {
    drawSubsectionTitle(ctx, 'AI 훈련 요구분석 결과');
    drawBodyText(ctx, data.trainingNeedsAnalysis);
    ctx.y += 2;
  }

  if (data.selectionReason) {
    drawSubsectionTitle(ctx, '훈련대상 업무 선정 사유');
    drawBodyText(ctx, data.selectionReason);
    ctx.y += 2;
  }

  if (data.targetTaskDetails && data.targetTaskDetails.length > 0) {
    drawSubsectionTitle(ctx, '훈련대상 업무 세부내용');
    for (const detail of data.targetTaskDetails) {
      drawLabelValue(ctx, `● ${detail.task_name}`, '');
      drawLabelValue(ctx, '  As-Is', detail.as_is || '-');
      drawLabelValue(ctx, '  To-Be', detail.to_be || '-');
      drawLabelValue(ctx, '  요구 지식', detail.required_knowledge || '-');
      drawLabelValue(ctx, '  요구 기술', detail.required_skill || '-');
      ctx.y += 2;
    }
  }

  ctx.y += 4;
}
