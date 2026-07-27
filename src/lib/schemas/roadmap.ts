import { z } from 'zod';
import { ROADMAP_COURSE_SPEC_COUNT } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 로드맵 Zod 스키마 — 산인공 공식 양식 v2 (2026-07-13 개정) 기반
// ----------------------------------------------------------------------------
//   Ⅰ-1. 수립 배경          → setup_necessity
//   Ⅰ-3. 수립 주요 결과      → outcome_summary (3필드)
//   Ⅲ.   훈련실시 계획 제안   → course_specs (6개, 훈련시기·훈련수준 포함)
//
// v1 대비 삭제: competencies · ncs_* · training_structure(+method) · annual_plan
// ============================================================================

const trainingLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

// Ⅰ-3 수립 주요 결과
const outcomeSummarySchema = z.object({
  ai_competency_level: trainingLevelSchema,
  selected_tasks: z.string(),
  main_content: z.string(),
});

// Ⅲ. 훈련과정 명세서 — 교과목
const courseSubjectSchema = z.object({
  name: z.string().min(1),
  details: z.string().refine(
    (s) => {
      const items = s
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      return items.length >= 1 && items.length <= 5;
    },
    {
      message: '교과목 세부 내용은 줄바꿈으로 구분된 1~5개 항목이어야 합니다 (권장 4~5개).',
    }
  ),
  hours: z.number().positive(),
});

// Ⅲ. 훈련과정 명세서 (11×6 표)
const courseSpecSchema = z.object({
  training_period: z.string().min(1, '훈련시기를 입력해주세요.'),
  training_level: trainingLevelSchema,
  course_name: z.string().min(1),
  training_method: z.string(),
  recommended_program: z.string(),
  goal: z.string(),
  main_content: z.string(),
  target_audience: z.string(),
  subjects: z.array(courseSubjectSchema).min(1, '교과목은 최소 1개 이상이어야 합니다.'),
});

const courseSpecsSchema = z
  .array(courseSpecSchema)
  .min(
    ROADMAP_COURSE_SPEC_COUNT,
    `훈련과정 명세서는 최소 ${ROADMAP_COURSE_SPEC_COUNT}개 이상이어야 합니다.`
  );

// 전체 로드맵 콘텐츠 스키마 (LLM 응답/DB 저장용 검증)
export const roadmapContentSchema = z.object({
  diagnosis_summary: z.string(),
  setup_necessity: z.string(),
  outcome_summary: outcomeSummarySchema,
  course_specs: courseSpecsSchema,
});

// createRoadmap 입력 스키마
export const createRoadmapInputSchema = z.object({
  projectId: z.string().uuid(),
  revisionPrompt: z.string().trim().min(1).max(2000).optional(),
});

// ============================================================================
// 편집 중(DRAFT) 임시 저장용 loose 스키마
// ----------------------------------------------------------------------------
// 사용자가 과정명을 지웠다가 다시 채우는 등 중간 상태가 저장되어야 하므로
// 엄격한 min(1)·positive()를 완화한다. 최종 확정(FINAL)은 validateRoadmap이
// 별도로 엄격 검증한다.
// ============================================================================

const editableCourseSubjectSchema = z.object({
  name: z.string(),
  details: z.string(),
  hours: z.number().nonnegative(),
});

const editableCourseSpecSchema = z.object({
  training_period: z.string(),
  training_level: trainingLevelSchema,
  course_name: z.string(),
  training_method: z.string(),
  recommended_program: z.string(),
  goal: z.string(),
  main_content: z.string(),
  target_audience: z.string(),
  subjects: z.array(editableCourseSubjectSchema),
});

const editableCourseSpecsSchema = z.array(editableCourseSpecSchema);

// editRoadmapManually updates 스키마 — DRAFT 중간 상태 허용 (loose)
export const editRoadmapUpdatesSchema = z
  .object({
    diagnosis_summary: z.string().max(5000).optional(),
    setup_necessity: z.string().max(5000).optional(),
    outcome_summary: outcomeSummarySchema.optional(),
    course_specs: editableCourseSpecsSchema.optional(),
  })
  .refine(
    (data) =>
      data.diagnosis_summary !== undefined ||
      data.setup_necessity !== undefined ||
      data.outcome_summary !== undefined ||
      data.course_specs !== undefined,
    { message: '수정할 항목이 최소 하나 이상 필요합니다.' }
  );
