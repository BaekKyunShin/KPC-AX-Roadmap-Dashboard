// ============================================================================
// PBL 타입 정의 — 산인공 PBL 양식 2번 Ⅳ·Ⅴ장 1:1 매칭
//   Ⅳ-1. 훈련 목표                   → PBLOperationPlan.training_goal
//   Ⅳ-2. AI 도구 활용 계획           → PBLAIToolUsagePlanItem[] (최소 3단계)
//   Ⅳ-3. 훈련 실시 계획              → PBLTrainingPlan
//     가. 훈련과정 개요               → PBLCourseOverview
//     나. 학습그룹 구성               → PBLInstructor[] + PBLTrainee[]
//     다. 훈련 교과목 프로파일        → PBLSubjectProfile
//     라. 시설·장비                   → PBLFacility[]
//     마. 훈련강사                    → PBLTrainingInstructor[]
//   Ⅳ-4. 평가 계획                   → PBLEvaluationPlan
//     가. 과정평가                    → PBLCourseEvaluation (수행수준 1~5)
//     나. 결과평가                    → PBLResultEvaluation (고정 설문)
//   Ⅴ-1. 성과분석 측정 지표          → PBLPerformanceAnalysis
//   Ⅴ-2. 성과 확산 전략              → internalization_plan + dissemination_plan
// ============================================================================

// ----------------------------------------------------------------------------
// Ⅳ-1. 훈련 목표
// ----------------------------------------------------------------------------

export type PBLTrainingGoal = string;

// ----------------------------------------------------------------------------
// Ⅳ-2. AI 도구 활용 계획 (단계별 반복)
// ----------------------------------------------------------------------------

export interface PBLAIToolUsagePlanItem {
  stage: string; // "1단계", "2단계", ...
  main_activity: string; // 주요활동 (예: "훈련실시")
  ai_tools: string[]; // AI 도구 (예: ["Lovable", "Cursor", "ChatGPT(보조)"])
  utilized_data: string; // 활용 데이터
  purpose: string; // 활용 목적 (2줄 내외)
  specific_method: string; // 구체적 활용 방법 (2~4줄)
}

// ----------------------------------------------------------------------------
// Ⅳ-3-가. 훈련과정 개요
// ----------------------------------------------------------------------------

export interface PBLCourseOverview {
  course_name: string;
  training_period: { start: string; end: string };
}

// ----------------------------------------------------------------------------
// Ⅳ-3-나. 학습그룹 구성
// ----------------------------------------------------------------------------

export type PBLInstructorType = '외부' | '내부';
export type PBLLearningRole = '팀원' | '팀장';

export interface PBLInstructor {
  type: PBLInstructorType;
  role: PBLLearningRole;
  affiliation: string;
  position: string;
  name: string;
}

export interface PBLTrainee {
  role: PBLLearningRole;
  affiliation: string;
  position: string;
  name: string;
}

// ----------------------------------------------------------------------------
// Ⅳ-3-다. 훈련 교과목 프로파일
// ----------------------------------------------------------------------------

export interface PBLTrainingContent {
  unit_name: string; // 업무(단원)명
  detail: string; // 세부 내용
  training_hours: number; // 훈련시간(H)
  instructor_hours: { external: number; internal: number }; // 강사 투입시간 외부/내부 (합 = training_hours)
}

export interface PBLSubjectProfile {
  course_name: string;
  total_hours: number; // 전체 훈련시간 (과정 전체)
  training_goals: string[]; // 훈련목표 (bullet)
  ai_tools: string[]; // 활용 AI 도구 (bullet)
  utilized_data: string; // 활용 데이터
  analysis_method: string; // 분석방법 (예: "LLM, RGA 등")
  training_contents: PBLTrainingContent[];
  total_sum_hours: number; // 업무(단원)별 훈련시간 합 (자동 산출)
}

// ----------------------------------------------------------------------------
// Ⅳ-3-라. 시설·장비
// ----------------------------------------------------------------------------

export type PBLFacilityCategory = '시설' | '장비';

export interface PBLFacility {
  seq: number;
  category: PBLFacilityCategory;
  name: string;
  spec: string;
  location: string;
}

// ----------------------------------------------------------------------------
// Ⅳ-3-마. 훈련강사
// ----------------------------------------------------------------------------

export interface PBLTrainingInstructor {
  name: string;
  internal_external: '내부' | '외부';
  career_years: number;
  work_name: string;
  detailed_training_content: string[]; // bullet
}

// ----------------------------------------------------------------------------
// Ⅳ-4-가. 과정평가
// ----------------------------------------------------------------------------

export type PBLCourseEvaluationMethod = '포트폴리오' | '문제해결시나리오' | '작업장 평가';
export type PBLEvaluationResult = 'Pass' | 'Fail' | '예정';
export type PBLPerformanceLevel = 1 | 2 | 3 | 4 | 5;

export interface PBLPerformanceChecklistItem {
  unit_name: string;
  evaluation_criteria: string;
  performance_level: PBLPerformanceLevel;
}

export interface PBLCourseEvaluation {
  course_name: string;
  evaluation_methods: PBLCourseEvaluationMethod[]; // 체크박스 복수 선택
  evaluation_target: string;
  evaluation_date: string;
  evaluation_criteria: string; // 예: "14개 중 수행 수준 4 이상 8개(60%) 이상시 PASS"
  evaluation_result: PBLEvaluationResult;
  performance_checklist: PBLPerformanceChecklistItem[];
  overall_comment: string;
  evaluation_scale: string; // 5단계 평가척도 설명 텍스트 (양식 하단 고정)
}

// ----------------------------------------------------------------------------
// Ⅳ-4-나. 결과평가 (고정 설문)
// ----------------------------------------------------------------------------

export type SurveyScale = 1 | 2 | 3 | 4 | 5 | null;

export interface PBLResultEvaluation {
  satisfaction_survey: SurveyScale[]; // 만족도 5문항
  achievement_survey: SurveyScale[]; // 성취도 3문항
  external_expert_survey: SurveyScale[]; // 외부전문가 만족도 5문항
  practical_application_survey: SurveyScale[]; // 현업적용도 4문항
  respondent_name?: string;
  evaluation_date?: string;
}

// ----------------------------------------------------------------------------
// Ⅳ. 운영계획 수립 (통합)
// ----------------------------------------------------------------------------

export interface PBLTrainingPlan {
  overview: PBLCourseOverview;
  learning_group: { instructors: PBLInstructor[]; trainees: PBLTrainee[] };
  subject_profile: PBLSubjectProfile;
  facilities: PBLFacility[];
  training_instructors: PBLTrainingInstructor[];
}

export interface PBLEvaluationPlan {
  course_evaluation: PBLCourseEvaluation;
  result_evaluation: PBLResultEvaluation;
}

export interface PBLOperationPlan {
  training_goal: PBLTrainingGoal;
  ai_tool_usage_plan: PBLAIToolUsagePlanItem[];
  training_plan: PBLTrainingPlan;
  evaluation_plan: PBLEvaluationPlan;
}

// ----------------------------------------------------------------------------
// Ⅴ. 성과분석 및 확산 전략
// ----------------------------------------------------------------------------

export const PBL_TRAINING_GOAL_CATEGORIES = [
  '기술문제 해결',
  '공정 최적화',
  '불량률 감소',
  '기술 매뉴얼 개발',
  '기타',
] as const;
export type PBLTrainingGoalCategory = (typeof PBL_TRAINING_GOAL_CATEGORIES)[number];

export interface PBLPerformanceAnalysis {
  training_goal_categories: PBLTrainingGoalCategory[];
  quantitative_metrics: string[]; // 정량 지표
  qualitative_metrics: string[]; // 정성 지표
  internalization_plan: string[]; // 내재화 방안
  dissemination_plan: string[]; // 전사 확산 방안
}

// ----------------------------------------------------------------------------
// 최상위 결과물
// ----------------------------------------------------------------------------

export interface PBLContent {
  operation_plan: PBLOperationPlan;
  performance_analysis: PBLPerformanceAnalysis;
}

// ----------------------------------------------------------------------------
// 검증 결과
// ----------------------------------------------------------------------------

export interface PBLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ----------------------------------------------------------------------------
// 고정 상수
// ----------------------------------------------------------------------------

/**
 * Ⅳ-4-가 평가척도 설명 (양식 15p 하단 고정 표).
 * 항목 단위 배열로 노출해 UI에서 정돈된 dl/dt/dd로 렌더할 수 있게 한다.
 */
export const PBL_EVALUATION_SCALE_ITEMS: ReadonlyArray<{
  level: PBLPerformanceLevel;
  label: '최하' | '하' | '보통' | '상' | '최상';
  description: string;
}> = [
  { level: 1, label: '최하', description: '수행준거를 전혀 충족하지 못함' },
  { level: 2, label: '하', description: '수행준거의 일부만 충족하며 개선이 필요함' },
  { level: 3, label: '보통', description: '수행준거를 기본 수준으로 충족함' },
  { level: 4, label: '상', description: '수행준거를 안정적으로 충족하며 실무 적용 가능함' },
  { level: 5, label: '최상', description: '수행준거를 완전히 충족하며 타인에게 전이 가능함' },
];

/** LLM 프롬프트·HWPX·DB 호환을 위한 평탄 텍스트 표현(기존 호환 유지). */
export const PBL_EVALUATION_SCALE_DESCRIPTION = PBL_EVALUATION_SCALE_ITEMS
  .map((item) => `${item.level}: ${item.label} - ${item.description}`)
  .join('\n');

export const PBL_COURSE_EVALUATION_METHODS: readonly PBLCourseEvaluationMethod[] = [
  '포트폴리오',
  '문제해결시나리오',
  '작업장 평가',
] as const;

export const PBL_PERFORMANCE_LEVELS: readonly PBLPerformanceLevel[] = [1, 2, 3, 4, 5] as const;

// Ⅳ-4-나 결과평가 고정 문항 (양식 16~17p 원문)
export const PBL_SATISFACTION_SURVEY_QUESTIONS = [
  '훈련 내용이 업무 수행에 도움이 되었다',
  '훈련 방법(강의, 실습, 토론 등)이 효과적이었다',
  '훈련 강사의 전문성과 강의 진행이 적절하였다',
  '훈련 시간과 일정이 적절하였다',
  '훈련 전반에 대해 만족한다',
] as const;

export const PBL_ACHIEVEMENT_SURVEY_QUESTIONS = [
  '훈련 목표(훈련이 목적으로 한 역량)가 달성되었다',
  '훈련 이후 관련 업무를 스스로 수행할 자신감이 향상되었다',
  '훈련 내용을 현업에 실제로 적용할 수 있다',
] as const;

export const PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS = [
  '훈련 내용이 산업 현장 수요와 부합한다',
  '훈련 교과·실습의 난이도가 적절하였다',
  'AI 도구 활용 방법이 실무에서 적용 가능하도록 설계되었다',
  '훈련 강사의 전문성·현장 경험이 충분하였다',
  '전반적으로 훈련 품질이 우수하다',
] as const;

export const PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS = [
  '훈련 내용을 현업 업무에 실제 적용하고 있다',
  '훈련 후 업무 수행 방식이 개선되었다',
  '훈련이 부서·동료에게도 확산되고 있다',
  '훈련 성과가 조직 성과 향상에 기여하고 있다',
] as const;

export const PBL_SATISFACTION_SURVEY_LENGTH = PBL_SATISFACTION_SURVEY_QUESTIONS.length;
export const PBL_ACHIEVEMENT_SURVEY_LENGTH = PBL_ACHIEVEMENT_SURVEY_QUESTIONS.length;
export const PBL_EXTERNAL_EXPERT_SURVEY_LENGTH = PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS.length;
export const PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH =
  PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS.length;

/** 최소 AI 도구 활용 계획 단계 수 (양식 예시 3단계) */
export const PBL_MIN_AI_TOOL_USAGE_STAGES = 3;

/** 최소 교과목 프로파일 training_contents 행 수 (계획서 권고) */
export const PBL_MIN_TRAINING_CONTENT_ROWS = 1;
