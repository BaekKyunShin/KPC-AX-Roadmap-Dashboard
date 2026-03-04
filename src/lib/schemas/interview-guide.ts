import { z } from 'zod';

// ============================================================================
// guide_data JSONB 내부 구조 스키마
// ============================================================================

const keyPointStatusSchema = z.enum(['critical', 'warning', 'good']);

export const guideKeyPointSchema = z.object({
  dimension: z.string().min(1),
  score_percent: z.number().min(0).max(100).transform(Math.round),
  status: keyPointStatusSchema,
  insight: z.string().min(1),
});

export const guideQuestionSchema = z.object({
  id: z.string().min(1),
  dimension: z.string().min(1),
  question: z.string().min(1),
  intent: z.string().min(1),
  checked: z.boolean(),
  is_custom: z.boolean(),
});

export const guideDataSchema = z.object({
  company_summary: z.string().min(1, '기업 현황 요약은 필수입니다.'),
  key_points: z
    .array(guideKeyPointSchema)
    .min(1, '핵심 파악 포인트가 1개 이상 필요합니다.'),
  questions: z
    .array(guideQuestionSchema)
    .min(1, '추천 질문이 1개 이상 필요합니다.'),
  cautions: z
    .array(z.string().min(1))
    .min(1, '주의사항이 1개 이상 필요합니다.'),
});

// ============================================================================
// 질문 업데이트용 스키마
// ============================================================================

export const updateGuideQuestionsSchema = z.object({
  questions: z.array(guideQuestionSchema).min(1, '질문이 1개 이상 필요합니다.'),
});

// ============================================================================
// 타입 추출
// ============================================================================

export type GuideKeyPointStatus = z.infer<typeof keyPointStatusSchema>;
export type GuideKeyPoint = z.infer<typeof guideKeyPointSchema>;
export type GuideQuestion = z.infer<typeof guideQuestionSchema>;
export type GuideData = z.infer<typeof guideDataSchema>;
export type UpdateGuideQuestionsInput = z.infer<typeof updateGuideQuestionsSchema>;
