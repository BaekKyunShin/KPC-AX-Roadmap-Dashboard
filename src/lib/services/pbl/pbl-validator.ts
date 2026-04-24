import { z } from 'zod';
import type { PBLContent, PBLValidationResult } from './pbl-types';
import {
  PBL_ACHIEVEMENT_SURVEY_LENGTH,
  PBL_EXTERNAL_EXPERT_SURVEY_LENGTH,
  PBL_MIN_AI_TOOL_USAGE_STAGES,
  PBL_MIN_TRAINING_CONTENT_ROWS,
  PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH,
  PBL_SATISFACTION_SURVEY_LENGTH,
  TRAINING_GOAL_CATEGORIES,
} from './pbl-types';

// ============================================================================
// 산인공 PBL 양식 2번 Ⅳ장 기반 Zod 출력 스키마
//  - ai_tool_usage_plan.length >= 3 (양식 예시)
//  - subject_profile.training_contents.length >= 1
//  - 각 training_content: external + internal === training_hours (양식 가이드 #9)
//  - subject_profile.total_sum_hours === sum(training_contents.training_hours)
//  - course_evaluation.performance_level 1~5
//  - course_evaluation.evaluation_methods enum
//  - 결과평가 문항 수 고정: 5/3/5/4
// ============================================================================

// 공용 비어있지 않은 trim 문자열
const trimmedText = (label: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: `${label}을(를) 입력하세요.` });

// bullet 계열 (빈 문자열 허용. 실제 검증은 호출부)
const looseText = z.string().transform((value) => value.trim());

// ----------------------------------------------------------------------------
// Ⅳ-1. 훈련 목표
// ----------------------------------------------------------------------------

const trainingGoalSchema = trimmedText('훈련 목표');

// ----------------------------------------------------------------------------
// Ⅳ-2. AI 도구 활용 계획
// ----------------------------------------------------------------------------

const aiToolUsagePlanItemSchema = z.object({
  stage: trimmedText('단계'),
  main_activity: trimmedText('주요활동'),
  ai_tools: z.array(trimmedText('AI 도구 항목')).min(1, 'AI 도구를 최소 1개 입력하세요.'),
  utilized_data: trimmedText('활용 데이터'),
  purpose: trimmedText('활용 목적'),
  specific_method: trimmedText('구체적 활용 방법'),
});

const aiToolUsagePlanSchema = z
  .array(aiToolUsagePlanItemSchema)
  .min(
    PBL_MIN_AI_TOOL_USAGE_STAGES,
    `AI 도구 활용 계획은 최소 ${PBL_MIN_AI_TOOL_USAGE_STAGES}단계 이상이어야 합니다.`,
  );

// ----------------------------------------------------------------------------
// Ⅳ-3-가. 훈련과정 개요
// ----------------------------------------------------------------------------

const courseOverviewSchema = z.object({
  course_name: trimmedText('과정명'),
  training_period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

// ----------------------------------------------------------------------------
// Ⅳ-3-나. 학습그룹 구성
// ----------------------------------------------------------------------------

const instructorSchema = z.object({
  type: z.enum(['외부', '내부']),
  role: z.enum(['팀원', '팀장']),
  affiliation: looseText,
  position: looseText,
  name: trimmedText('강사 성명'),
});

const traineeSchema = z.object({
  role: z.enum(['팀원', '팀장']),
  affiliation: looseText,
  position: looseText,
  name: trimmedText('훈련생 성명'),
});

const learningGroupSchema = z.object({
  instructors: z.array(instructorSchema),
  trainees: z.array(traineeSchema),
});

// ----------------------------------------------------------------------------
// Ⅳ-3-다. 훈련 교과목 프로파일
// ----------------------------------------------------------------------------

const trainingContentSchema = z
  .object({
    unit_name: trimmedText('업무(단원)명'),
    detail: trimmedText('세부 내용'),
    training_hours: z.number().nonnegative('훈련시간은 0 이상이어야 합니다.'),
    instructor_hours: z.object({
      external: z.number().nonnegative('외부 강사 투입시간은 0 이상이어야 합니다.'),
      internal: z.number().nonnegative('내부 강사 투입시간은 0 이상이어야 합니다.'),
    }),
  })
  .refine(
    (item) =>
      Math.abs(
        item.instructor_hours.external + item.instructor_hours.internal - item.training_hours,
      ) < 1e-6,
    {
      message: '강사 투입시간 외부+내부 합이 훈련시간과 같아야 합니다 (양식 가이드 #9).',
      path: ['instructor_hours'],
    },
  );

const subjectProfileSchema = z
  .object({
    course_name: trimmedText('교과목 과정명'),
    total_hours: z.number().positive('전체 훈련시간은 1 이상이어야 합니다.'),
    training_goals: z.array(trimmedText('훈련목표 bullet')).min(1, '훈련목표를 최소 1개 입력하세요.'),
    ai_tools: z.array(trimmedText('AI 도구 항목')).min(1, 'AI 도구를 최소 1개 입력하세요.'),
    utilized_data: trimmedText('활용 데이터'),
    analysis_method: trimmedText('분석 방법'),
    training_contents: z
      .array(trainingContentSchema)
      .min(
        PBL_MIN_TRAINING_CONTENT_ROWS,
        `훈련 교과목은 최소 ${PBL_MIN_TRAINING_CONTENT_ROWS}개 이상이어야 합니다.`,
      ),
    total_sum_hours: z.number().nonnegative(),
  })
  .refine(
    (value) => {
      const sum = value.training_contents.reduce((acc, row) => acc + row.training_hours, 0);
      return Math.abs(sum - value.total_sum_hours) < 1e-6;
    },
    {
      message: '전체시간(total_sum_hours)은 훈련시간 합과 일치해야 합니다.',
      path: ['total_sum_hours'],
    },
  );

// ----------------------------------------------------------------------------
// Ⅳ-3-라. 시설·장비
// ----------------------------------------------------------------------------

const facilitySchema = z.object({
  seq: z.number().int().positive('연번은 1 이상이어야 합니다.'),
  category: z.enum(['시설', '장비']),
  name: trimmedText('명칭'),
  spec: trimmedText('규격(사양)'),
  location: trimmedText('위치'),
});

// ----------------------------------------------------------------------------
// Ⅳ-3-마. 훈련강사
// ----------------------------------------------------------------------------

const trainingInstructorSchema = z.object({
  name: trimmedText('강사 성명'),
  internal_external: z.enum(['내부', '외부']),
  career_years: z.number().nonnegative('업무경력은 0 이상이어야 합니다.'),
  work_name: trimmedText('업무명'),
  detailed_training_content: z
    .array(trimmedText('세부 교육훈련 내용 bullet'))
    .min(1, '세부 교육훈련 내용을 최소 1개 입력하세요.'),
});

// ----------------------------------------------------------------------------
// Ⅳ-4-가. 과정평가
// ----------------------------------------------------------------------------

const performanceChecklistItemSchema = z.object({
  unit_name: trimmedText('업무(단원)명'),
  evaluation_criteria: trimmedText('평가기준'),
  performance_level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

const courseEvaluationSchema = z.object({
  course_name: trimmedText('평가 과정명'),
  evaluation_methods: z
    .array(z.enum(['포트폴리오', '문제해결시나리오', '작업장 평가']))
    .min(1, '평가방법을 최소 1개 선택하세요.'),
  evaluation_target: trimmedText('평가대상'),
  evaluation_date: trimmedText('평가일자'),
  evaluation_criteria: trimmedText('평가기준'),
  evaluation_result: z.enum(['Pass', 'Fail', '예정']),
  performance_checklist: z
    .array(performanceChecklistItemSchema)
    .min(1, '수행수준 체크리스트를 최소 1개 입력하세요.'),
  overall_comment: looseText,
  evaluation_scale: trimmedText('평가척도 설명'),
});

// ----------------------------------------------------------------------------
// Ⅳ-4-나. 결과평가 (설문 문항 수 고정)
// ----------------------------------------------------------------------------

const surveyScaleSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.null(),
]);

const fixedLengthSurvey = (length: number, label: string) =>
  z
    .array(surveyScaleSchema)
    .length(length, `${label} 설문은 ${length}문항이어야 합니다.`);

const resultEvaluationSchema = z.object({
  satisfaction_survey: fixedLengthSurvey(PBL_SATISFACTION_SURVEY_LENGTH, '만족도'),
  achievement_survey: fixedLengthSurvey(PBL_ACHIEVEMENT_SURVEY_LENGTH, '성취도'),
  external_expert_survey: fixedLengthSurvey(PBL_EXTERNAL_EXPERT_SURVEY_LENGTH, '외부전문가 만족도'),
  practical_application_survey: fixedLengthSurvey(
    PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH,
    '현업적용도',
  ),
  respondent_name: z.string().optional(),
  evaluation_date: z.string().optional(),
});

// ============================================================================
// Ⅴ. 성과분석 및 확산 전략 스키마
// ============================================================================

// Ⅴ-1. 성과분석 측정 지표
// z.enum은 readonly tuple을 직접 받을 수 없으므로 spread 사용
const trainingGoalCategoryEnum = z.enum([...TRAINING_GOAL_CATEGORIES] as [
  (typeof TRAINING_GOAL_CATEGORIES)[number],
  ...(typeof TRAINING_GOAL_CATEGORIES)[number][],
]);

const outcomeMetricsSchema = z.object({
  selected_goals: z
    .array(trainingGoalCategoryEnum)
    .min(1, '훈련 목표 카테고리를 최소 1개 선택하세요.'),
  quantitative: trimmedText('정량 지표'),
  qualitative: trimmedText('정성 지표'),
});

// Ⅴ-2. 성과 확산 전략
const diffusionStrategySchema = z.object({
  internalization: trimmedText('내재화 방안'),
  company_wide_diffusion: trimmedText('전사 확산 방안'),
});

// Ⅴ. 통합
const outcomeAnalysisSchema = z.object({
  outcome_metrics: outcomeMetricsSchema,
  diffusion_strategy: diffusionStrategySchema,
});

// ----------------------------------------------------------------------------
// 최상위 스키마
// ----------------------------------------------------------------------------

export const pblContentSchema = z.object({
  operation_plan: z.object({
    training_goal: trainingGoalSchema,
    ai_tool_usage_plan: aiToolUsagePlanSchema,
    training_plan: z.object({
      overview: courseOverviewSchema,
      learning_group: learningGroupSchema,
      subject_profile: subjectProfileSchema,
      facilities: z.array(facilitySchema),
      training_instructors: z.array(trainingInstructorSchema),
    }),
    evaluation_plan: z.object({
      course_evaluation: courseEvaluationSchema,
      result_evaluation: resultEvaluationSchema,
    }),
  }),
  outcome_analysis: outcomeAnalysisSchema,
});

/** LLM 출력 1차 Zod 파싱 (엄격) */
export function parsePBLContent(input: unknown): PBLContent {
  return pblContentSchema.parse(input) as PBLContent;
}

/** 구조 검증 + 경고 리포트 (UI용) */
export function validatePBLContent(content: PBLContent): PBLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1) Zod safeParse 실패 → 모두 errors
  const parsed = pblContentSchema.safeParse(content);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      errors.push(`${path}: ${issue.message}`);
    }
    return { isValid: false, errors, warnings };
  }

  const data = parsed.data as PBLContent;

  // 2) subject_profile 교과목별 강사 투입시간 재검증 (이미 refine으로 검증되지만 warning 분리 위해)
  data.operation_plan.training_plan.subject_profile.training_contents.forEach((row, idx) => {
    const sum = row.instructor_hours.external + row.instructor_hours.internal;
    if (Math.abs(sum - row.training_hours) > 1e-6) {
      errors.push(
        `교과목 ${idx + 1}행 "${row.unit_name}": 강사 투입시간 외부(${row.instructor_hours.external})+내부(${row.instructor_hours.internal})=${sum}이 훈련시간(${row.training_hours})과 다릅니다.`,
      );
    }
  });

  // 3) 시설·장비 연번 중복 경고
  const seqSet = new Set<number>();
  for (const facility of data.operation_plan.training_plan.facilities) {
    if (seqSet.has(facility.seq)) {
      warnings.push(`시설·장비 연번 중복: ${facility.seq}`);
    }
    seqSet.add(facility.seq);
  }

  // 4) Ⅴ장 성과분석 — selected_goals가 훈련 목표 카테고리 내에 있는지 경고
  if (data.outcome_analysis.outcome_metrics.selected_goals.length === 0) {
    warnings.push('Ⅴ-1: 훈련 목표 카테고리(selected_goals)를 최소 1개 이상 선택하세요.');
  }

  return { isValid: errors.length === 0, errors, warnings };
}
