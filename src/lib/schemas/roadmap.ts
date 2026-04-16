import { z } from 'zod';

// ============================================================================
// 로드맵 Zod 스키마 — 산인공 공식 로드맵 보고서 양식(Ⅰ·Ⅱ·Ⅲ장) 기반
//   Ⅰ-1. 수립 필요성        → setup_necessity
//   Ⅰ-3. 수립 주요 결과      → outcome_summary (3필드)
//   Ⅲ-1. 역량 모델링        → competencies + NCS 박스 (표 전체 단위)
//   Ⅲ-2. 훈련체계도         → training_structure + training_structure_method
//   Ⅲ-3. 연간 훈련계획      → annualPlan
//   Ⅲ-4. 훈련과정 명세서    → courseSpecs (최소 3개)
// ============================================================================

// Ⅰ-3 수립 주요 결과
const outcomeSummarySchema = z.object({
  ai_competency_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  selected_tasks: z.string(),
  main_content: z.string(),
});

// Ⅲ-1. 역량 모델링 (NCS 필드는 루트로 이동)
const competencySchema = z.object({
  name: z.string().min(1),
  definition: z.string().min(1),
  knowledge: z.array(z.string()),
  skills: z.array(z.string()),
  attitudes: z.array(z.string()),
});

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
// 정합성 규칙 (산인공 양식 Ⅲ-1):
//  - ncs_used=true  → ncs_methodology 필수 (공백 불가)
//  - ncs_used=false → ncs_derivation_method 필수 (공백 불가)
export const roadmapContentSchema = z
  .object({
    diagnosis_summary: z.string(),
    setup_necessity: z.string(),
    outcome_summary: outcomeSummarySchema,
    competencies: z.array(competencySchema).min(1),
    ncs_used: z.boolean(),
    ncs_methodology: z.string(),
    ncs_derivation_method: z.string(),
    training_structure: z.array(trainingStructureItemSchema).min(1),
    training_structure_method: z.string().min(1, '훈련체계 수립 방법을 입력해주세요.'),
    annual_plan: annualPlanSchema,
    course_specs: courseSpecsSchema,
  })
  .refine(
    (data) =>
      data.ncs_used ? data.ncs_methodology.trim() !== '' : data.ncs_derivation_method.trim() !== '',
    {
      message:
        'NCS 활용 여부에 맞는 근거(활용 방법 또는 도출 방법)가 반드시 필요합니다.',
      path: ['ncs_methodology'],
    },
  );

// createRoadmap 입력 스키마
export const createRoadmapInputSchema = z.object({
  projectId: z.string().uuid(),
  revisionPrompt: z.string().trim().min(1).max(2000).optional(),
});

// editRoadmapManually updates 스키마
// 신규 필드 포함, 최소 1개 이상 필드 수정 필수
export const editRoadmapUpdatesSchema = z
  .object({
    diagnosis_summary: z.string().max(5000).optional(),
    setup_necessity: z.string().max(5000).optional(),
    outcome_summary: outcomeSummarySchema.optional(),
    competencies: z.array(competencySchema).optional(),
    ncs_used: z.boolean().optional(),
    ncs_methodology: z.string().max(5000).optional(),
    ncs_derivation_method: z.string().max(5000).optional(),
    training_structure: z.array(trainingStructureItemSchema).optional(),
    training_structure_method: z.string().max(5000).optional(),
    annual_plan: annualPlanSchema.optional(),
    course_specs: courseSpecsSchema.optional(),
  })
  .refine(
    (data) =>
      data.diagnosis_summary !== undefined ||
      data.setup_necessity !== undefined ||
      data.outcome_summary !== undefined ||
      data.competencies !== undefined ||
      data.ncs_used !== undefined ||
      data.ncs_methodology !== undefined ||
      data.ncs_derivation_method !== undefined ||
      data.training_structure !== undefined ||
      data.training_structure_method !== undefined ||
      data.annual_plan !== undefined ||
      data.course_specs !== undefined,
    { message: '수정할 항목이 최소 하나 이상 필요합니다.' },
  );
