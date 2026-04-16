import { z } from 'zod';

// ============================================================================
// 로드맵 관련 Zod 스키마 — 산인공 공식 로드맵 보고서 양식(Ⅲ장) 기반
//   Ⅲ-1. 역량 모델링        → competencySchema
//   Ⅲ-2. 훈련체계도         → trainingStructureItemSchema
//   Ⅲ-3. 연간 훈련계획      → annualPlanSchema
//   Ⅲ-4. 훈련과정 명세서    → courseSpecSchema (최소 3개)
// ============================================================================

// Ⅲ-1. 역량 모델링
// - ncs_used=true  → ncs_methodology 필수
// - ncs_used=false → ncs_derivation_method 필수
const competencySchema = z
  .object({
    name: z.string().min(1),
    definition: z.string().min(1),
    knowledge: z.array(z.string()),
    skills: z.array(z.string()),
    attitudes: z.array(z.string()),
    ncs_used: z.boolean(),
    ncs_methodology: z.string().optional(),
    ncs_derivation_method: z.string().optional(),
  })
  .refine(
    (data) =>
      data.ncs_used
        ? typeof data.ncs_methodology === 'string' && data.ncs_methodology.trim() !== ''
        : typeof data.ncs_derivation_method === 'string' &&
          data.ncs_derivation_method.trim() !== '',
    {
      message:
        'NCS 활용 여부에 맞는 근거(활용 방법 또는 도출 방법)가 반드시 필요합니다.',
      path: ['ncs_methodology'],
    }
  );

// Ⅲ-2. 훈련체계도
const trainingStructureItemSchema = z.object({
  competency_name: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  content: z.string(),
  target_audience: z.string(),
  method: z.string(),
  goal: z.string(),
});

// Ⅲ-3. 연간 훈련계획
const annualPlanItemSchema = z.object({
  competency_name: z.string().min(1),
  course_name: z.string().min(1),
  format: z.string(),
  hours: z.number().positive(),
  notes: z.string(),
});

const annualPlanSchema = z.object({
  items: z.array(annualPlanItemSchema),
  usage_plan: z.string(),
});

// Ⅲ-4. 훈련과정 명세서
const courseSubjectSchema = z.object({
  name: z.string().min(1),
  details: z.string(),
  hours: z.number().positive(),
});

const courseSpecSchema = z.object({
  course_name: z.string().min(1),
  format: z.string(),
  recommended_program: z.string(),
  goal: z.string(),
  main_content: z.string(),
  target_audience: z.string(),
  subjects: z.array(courseSubjectSchema).min(1, '교과목은 최소 1개 이상이어야 합니다.'),
});

const courseSpecsSchema = z
  .array(courseSpecSchema)
  .min(3, '훈련과정 명세서는 최소 3개 이상이어야 합니다.');

// 전체 로드맵 콘텐츠 스키마 (LLM 응답/DB 저장용 검증)
export const roadmapContentSchema = z.object({
  diagnosis_summary: z.string(),
  competencies: z.array(competencySchema).min(1),
  training_structure: z.array(trainingStructureItemSchema).min(1),
  annual_plan: annualPlanSchema,
  course_specs: courseSpecsSchema,
});

// createRoadmap 입력 스키마
export const createRoadmapInputSchema = z.object({
  projectId: z.string().uuid(),
  revisionPrompt: z.string().trim().min(1).max(2000).optional(),
});

// editRoadmapManually updates 스키마
// - 4개 신규 섹션 + diagnosis_summary 중 최소 1개 포함
export const editRoadmapUpdatesSchema = z
  .object({
    diagnosis_summary: z.string().max(5000).optional(),
    competencies: z.array(competencySchema).optional(),
    training_structure: z.array(trainingStructureItemSchema).optional(),
    annual_plan: annualPlanSchema.optional(),
    course_specs: courseSpecsSchema.optional(),
  })
  .refine(
    (data) =>
      data.diagnosis_summary !== undefined ||
      data.competencies !== undefined ||
      data.training_structure !== undefined ||
      data.annual_plan !== undefined ||
      data.course_specs !== undefined,
    { message: '수정할 항목이 최소 하나 이상 필요합니다.' }
  );
