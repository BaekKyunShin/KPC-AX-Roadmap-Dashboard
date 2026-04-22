import { z } from 'zod';
// ISSUE-16: PBL 인터뷰도 ROADMAP 과 동일한 6 카테고리 STT 인사이트 스키마를 공유한다.
import { sttInsightsSchema } from './interview-roadmap';

// ============================================================================
// 산인공 PBL 인터뷰 양식 (docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf 3~11p)
// 양식 그대로의 한글 enum·라벨을 사용해 HWPX 생성 시 바로 삽입 가능하다.
// ============================================================================

// ----------------------------------------------------------------------------
// 공용 enum (양식 한글 그대로)
// ----------------------------------------------------------------------------

export const AI_LEVEL = z.enum(['AI기초형', 'AI탐구형', 'AI활용형', 'AI선도형']);
export type AILevel = z.infer<typeof AI_LEVEL>;

export const TRAINING_PLACE = z.enum(['사내', '사외']);
export type TrainingPlaceType = z.infer<typeof TRAINING_PLACE>;

export const AI_TOOL_CAPACITY = z.enum(['가능', '제한적', '불가능']);
export type AIToolCapacity = z.infer<typeof AI_TOOL_CAPACITY>;

export const NETWORK_LEVEL = z.enum(['양호', '보통', '개선필요']);
export type NetworkLevel = z.infer<typeof NETWORK_LEVEL>;

export const OPERATION_MODE = z.enum(['대면', '비대면']);
export type OperationMode = z.infer<typeof OPERATION_MODE>;

export const TRAINING_GOAL_OPTIONS = [
  '기술문제 해결',
  '공정 최적화',
  '불량률 감소',
  '기술 매뉴얼 개발',
  '기타',
] as const;
export type TrainingGoal = (typeof TRAINING_GOAL_OPTIONS)[number];

export const AI_LEVEL_GRADE: Record<AILevel, '기초' | '초급' | '중급' | '고급'> = {
  AI기초형: '기초',
  AI탐구형: '초급',
  AI활용형: '중급',
  AI선도형: '고급',
};

export const AI_LEVEL_OPTIONS: ReadonlyArray<{
  value: AILevel;
  grade: '기초' | '초급' | '중급' | '고급';
  description: string;
}> = [
  {
    value: 'AI기초형',
    grade: '기초',
    description:
      'AI 및 디지털 기술 도입에 대한 인식은 있으나, 실제 활용은 거의 없거나 매우 제한적인 단계',
  },
  {
    value: 'AI탐구형',
    grade: '초급',
    description:
      '일부 구성원이 AI 도구를 시범적으로 사용하고 있으며, 업무 일부에 적용을 검토·시도하는 단계',
  },
  {
    value: 'AI활용형',
    grade: '중급',
    description:
      '부서 단위로 AI 도구·자동화를 활용하고 있으며, 데이터 기반 의사결정이 일부 업무에 정착된 단계',
  },
  {
    value: 'AI선도형',
    grade: '고급',
    description:
      '전사적으로 AI를 도입해 자체 모델·워크플로우를 운영하며, 타 조직 확산을 선도하는 단계',
  },
];

// ----------------------------------------------------------------------------
// Ⅰ. 훈련과정 개요 (3p)
// ----------------------------------------------------------------------------

export const contactSchema = z.object({
  position: z.string().default(''),
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().email('이메일 형식을 확인하세요.').or(z.literal('')).default(''),
});

export const courseOverviewSchema = z.object({
  company_name: z.string().default(''),
  business_registration_no: z.string().default(''),
  industry_code: z.string().default(''),
  industry_main: z.string().default(''),
  address: z.string().default(''),
  training_address: z.string().default(''),
  jurisdiction_office: z.string().default(''),
  contact: contactSchema.default({ position: '', name: '', phone: '', email: '' }),
  course_name: z.string().min(1, '과정명을 입력하세요.'),
  ncs_code: z.string().default(''),
  training_hours: z.number().int().positive('훈련시간은 1 이상이어야 합니다.'),
  trainee_count: z.number().int().positive('훈련생 수는 1 이상이어야 합니다.'),
  training_job: z.string().min(1, '훈련 직무를 입력하세요.'),
  ai_level: AI_LEVEL,
  training_goals: z
    .array(z.enum(TRAINING_GOAL_OPTIONS))
    .min(1, '훈련 목표를 최소 1개 선택하세요.'),
});
export type PBLCourseOverview = z.infer<typeof courseOverviewSchema>;

// ----------------------------------------------------------------------------
// Ⅱ-1. 기업 현황 분석 (4p)
// ----------------------------------------------------------------------------

export const orgUnitSchema = z.object({
  id: z.string(),
  department_name: z.string().min(1, '부서명을 입력하세요.'),
  tasks: z.array(z.string()).default([]),
});
export type PBLOrgUnit = z.infer<typeof orgUnitSchema>;

export const companyStatusSchema = z.object({
  business_issues: z.string().min(1, '경영 이슈를 입력하세요.'),
  organization: z.array(orgUnitSchema).min(1, '조직도에 최소 1개 부서를 추가하세요.'),
});
export type PBLCompanyStatus = z.infer<typeof companyStatusSchema>;

// ----------------------------------------------------------------------------
// Ⅱ-2. 훈련환경 분석 (5p)
// ----------------------------------------------------------------------------

export const trainingPlaceSchema = z.object({
  /** 사내·사외 복수 선택 가능 (양식 원본: 체크박스) */
  types: z.array(TRAINING_PLACE).default([]),
  /** 구체 훈련장소 (예: 본사 3층 교육장·○○컨벤션센터) — 양식 원본 "*훈련장소" 칸 */
  location: z.string().default(''),
  /** 훈련장소 특이사항 — 양식 원본 "*훈련장소 특이사항(추가 훈련장 필요 사유 기재)" */
  special_notes: z.string().default(''),
});

export const internalInstructorSchema = z.object({
  used: z.boolean(),
  name: z.string().default(''),
  position: z.string().default(''),
});

export const targetCharacteristicsSchema = z.object({
  career: z.string().default(''),
  level: z.string().default(''),
});

export const aiInfrastructureSchema = z.object({
  ai_tools: AI_TOOL_CAPACITY,
  network: NETWORK_LEVEL,
  pc_count: z.number().int().nonnegative().default(0),
  etc_equipment: z.string().default(''),
});

export const expectationSchema = z.object({
  as_is: z.string().min(1, '현재(As-Is)를 입력하세요.'),
  to_be: z.string().min(1, '향후(To-Be)를 입력하세요.'),
});

export const trainingEnvironmentSchema = z.object({
  proper_training_hours: z.number().int().positive('적정 훈련시간을 입력하세요.'),
  training_place: trainingPlaceSchema,
  internal_instructor: internalInstructorSchema,
  target_count: z.number().int().positive('대상 인원을 입력하세요.'),
  target_characteristics: targetCharacteristicsSchema,
  ai_infrastructure: aiInfrastructureSchema,
  training_needs_analysis: z.string().min(1, 'AI훈련 요구분석 결과를 입력하세요.'),
  expectation: expectationSchema,
});
export type PBLTrainingEnvironment = z.infer<typeof trainingEnvironmentSchema>;

// ----------------------------------------------------------------------------
// Ⅱ-3. HRD 제안·과정개발 필요성 (6p)
// ----------------------------------------------------------------------------

export const trainingHistoryItemSchema = z.object({
  id: z.string(),
  seq: z.number().int().nonnegative().default(0),
  program: z.string().default(''),
  course_name: z.string().default(''),
  method: z.string().default(''),
  duration_days: z.number().int().nonnegative().default(0),
});

export const supportHistoryItemSchema = z.object({
  id: z.string(),
  year: z.string().default(''),
  annual_limit: z.number().int().nonnegative().default(0),
  supported: z.number().int().nonnegative().default(0),
  ratio: z.string().default(''),
});

export const recommendationSchema = z.object({
  id: z.string(),
  rank: z.number().int().min(1).max(3),
  program: z.string().default(''),
  proposal: z.string().default(''),
});

export const hrdNecessitySchema = z.object({
  training_history: z.array(trainingHistoryItemSchema).default([]),
  support_history: z.array(supportHistoryItemSchema).default([]),
  recommendations: z.array(recommendationSchema).default([]),
  course_development_necessity: z.string().min(1, '과정개발 필요성을 입력하세요.'),
});
export type PBLHrdNecessity = z.infer<typeof hrdNecessitySchema>;

// ----------------------------------------------------------------------------
// Ⅲ-1. 훈련과제 도출 수행활동 (7p)
// ----------------------------------------------------------------------------

export const performanceParticipantsSchema = z.object({
  pm: z.string().default(''),
  external_expert: z.string().default(''),
  internal_expert: z.string().default(''),
  jurisdiction_manager: z.string().default(''),
});

export const performanceActivityItemSchema = z.object({
  id: z.string(),
  round: z.number().int().positive('차수는 1 이상이어야 합니다.'),
  date: z.string().min(1, '수행 일자를 입력하세요.'),
  content: z.string().min(1, '수행 내용을 입력하세요.'),
  method: z.string().min(1, '수행 방법을 입력하세요.'),
  operation_mode: OPERATION_MODE,
  participants: performanceParticipantsSchema,
});

export const performanceActivitiesSchema = z.object({
  performance_activities: z
    .array(performanceActivityItemSchema)
    .min(1, '최소 1차시의 수행활동을 입력하세요.'),
});
export type PBLPerformanceActivities = z.infer<typeof performanceActivitiesSchema>;

// ----------------------------------------------------------------------------
// Ⅲ-2. 문제 도출·우선순위 (8p)
// ----------------------------------------------------------------------------

export const problemDefinitionDetailSchema = z.object({
  background: z.string().min(1, '배경을 입력하세요.'),
  core_problem: z.string().min(1, '핵심문제를 입력하세요.'),
  scope: z.string().min(1, '문제범위를 입력하세요.'),
  constraints: z.string().min(1, '제약조건을 입력하세요.'),
});

export const problemPrioritySchema = z.object({
  id: z.string(),
  problem_name: z.string().min(1, '문제명을 입력하세요.'),
  priority: z.number().int().min(1).max(5),
  selected: z.boolean(),
});

export const problemDefinitionSchema = z.object({
  problem_definition: problemDefinitionDetailSchema,
  problem_priorities: z
    .array(problemPrioritySchema)
    .min(1, '최소 1개의 문제를 입력하세요.'),
});
export type PBLProblemDefinition = z.infer<typeof problemDefinitionSchema>;

// ----------------------------------------------------------------------------
// Ⅲ-3. 훈련대상 업무 선정 (9~10p)
// ----------------------------------------------------------------------------

export const targetTaskItemSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1, '업무명을 입력하세요.'),
  necessity: z.number().int().min(1).max(5),
  selected: z.boolean(),
});

export const targetTaskDetailSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1, '업무명을 입력하세요.'),
  as_is: z.string().min(1, 'As-IS를 입력하세요.'),
  to_be: z.string().min(1, 'To-Be를 입력하세요.'),
  required_knowledge: z.string().min(1, '요구지식을 입력하세요.'),
  required_skill: z.string().min(1, '요구기술을 입력하세요.'),
});

export const targetTasksSchema = z.object({
  target_tasks: z.array(targetTaskItemSchema).min(1, '최소 1개의 훈련대상 업무를 선정하세요.'),
  selection_reason: z.string().min(1, '선정 사유를 입력하세요.'),
  target_task_details: z
    .array(targetTaskDetailSchema)
    .min(1, '선정 업무 세부내용을 최소 1개 입력하세요.'),
});
export type PBLTargetTasks = z.infer<typeof targetTasksSchema>;

// ----------------------------------------------------------------------------
// Ⅲ-4. AI수준 진단 (11p)
// ----------------------------------------------------------------------------

export const aiLevelDiagnosisSchema = z.object({
  current_ai_level: AI_LEVEL,
  expected_ai_level: AI_LEVEL,
  improvement_reason: z.string().min(1, '향상 사유를 입력하세요.'),
});
export type PBLAILevelDiagnosis = z.infer<typeof aiLevelDiagnosisSchema>;

// ----------------------------------------------------------------------------
// 전체 통합 (엄격)
// ----------------------------------------------------------------------------

export const pblInterviewSchema = z.object({
  courseOverview: courseOverviewSchema,
  companyStatus: companyStatusSchema,
  trainingEnvironment: trainingEnvironmentSchema,
  hrdNecessity: hrdNecessitySchema,
  performanceActivities: performanceActivitiesSchema,
  problemDefinition: problemDefinitionSchema,
  targetTasks: targetTasksSchema,
  aiLevelDiagnosis: aiLevelDiagnosisSchema,
  // ISSUE-16: STT 인사이트는 선택 — 입력 안 해도 인터뷰가 통과되어야 한다.
  sttInsights: sttInsightsSchema.optional(),
});
export type PBLInterview = z.infer<typeof pblInterviewSchema>;
export type PBLInterviewInput = z.input<typeof pblInterviewSchema>;

// ----------------------------------------------------------------------------
// 자동저장용 (전 필드 optional, 부분 입력 허용)
// ----------------------------------------------------------------------------
// 작성 중간 단계의 부분 입력을 그대로 JSONB에 저장하므로, 각 서브 스키마의
// min/positive/email 검증을 우회해야 한다. z.any()로 값 자체를 완화해
// "과정명을 입력하세요" 등 빈 문자열 실패를 방지한다. 최종 제출 시에는
// `pblInterviewSchema`(엄격)로 검증한다.

export const pblInterviewAutoSaveSchema = z
  .object({
    courseOverview: z.any().optional(),
    companyStatus: z.any().optional(),
    trainingEnvironment: z.any().optional(),
    hrdNecessity: z.any().optional(),
    performanceActivities: z.any().optional(),
    problemDefinition: z.any().optional(),
    targetTasks: z.any().optional(),
    aiLevelDiagnosis: z.any().optional(),
  })
  .passthrough();
export type PBLInterviewAutoSaveInput = z.input<typeof pblInterviewAutoSaveSchema>;


// ----------------------------------------------------------------------------
// 빈 항목 생성 헬퍼
// ----------------------------------------------------------------------------

export function createEmptyOrgUnit(): PBLOrgUnit {
  return { id: crypto.randomUUID(), department_name: '', tasks: [] };
}

export function createEmptyPerformanceActivity() {
  return {
    id: crypto.randomUUID(),
    round: 1,
    date: '',
    content: '',
    method: '',
    operation_mode: '대면' as OperationMode,
    participants: {
      pm: '',
      external_expert: '',
      internal_expert: '',
      jurisdiction_manager: '',
    },
  };
}

export function createEmptyProblemPriority() {
  return {
    id: crypto.randomUUID(),
    problem_name: '',
    priority: 3,
    selected: false,
  };
}

export function createEmptyTargetTask() {
  return {
    id: crypto.randomUUID(),
    task_name: '',
    necessity: 3,
    selected: false,
  };
}

export function createEmptyTargetTaskDetail() {
  return {
    id: crypto.randomUUID(),
    task_name: '',
    as_is: '',
    to_be: '',
    required_knowledge: '',
    required_skill: '',
  };
}

export function createEmptyInstructor() {
  return {
    used: false,
    name: '',
    position: '',
  };
}

export function createEmptyTrainingHistoryItem() {
  return {
    id: crypto.randomUUID(),
    seq: 0,
    program: '',
    course_name: '',
    method: '',
    duration_days: 0,
  };
}

export function createEmptySupportHistoryItem() {
  return {
    id: crypto.randomUUID(),
    year: '',
    annual_limit: 0,
    supported: 0,
    ratio: '',
  };
}

export function createEmptyRecommendation() {
  return {
    id: crypto.randomUUID(),
    rank: 1,
    program: '',
    proposal: '',
  };
}

// ----------------------------------------------------------------------------
// 최초 빈 인터뷰 (PBLInterviewClient 초기값)
// ----------------------------------------------------------------------------

export function createEmptyPBLInterviewDraft(): PBLInterviewAutoSaveInput {
  return {
    courseOverview: {
      company_name: '',
      business_registration_no: '',
      industry_code: '',
      industry_main: '',
      address: '',
      training_address: '',
      jurisdiction_office: '',
      contact: { position: '', name: '', phone: '', email: '' },
      course_name: '',
      ncs_code: '',
      training_hours: 0,
      trainee_count: 0,
      training_job: '',
      ai_level: 'AI기초형',
      training_goals: [],
    },
    companyStatus: {
      business_issues: '',
      organization: [],
    },
    trainingEnvironment: {
      proper_training_hours: 0,
      training_place: { types: [], location: '', special_notes: '' },
      internal_instructor: { used: false, name: '', position: '' },
      target_count: 0,
      target_characteristics: { career: '', level: '' },
      ai_infrastructure: {
        ai_tools: '가능',
        network: '양호',
        pc_count: 0,
        etc_equipment: '',
      },
      training_needs_analysis: '',
      expectation: { as_is: '', to_be: '' },
    },
    hrdNecessity: {
      training_history: [],
      support_history: [],
      recommendations: [],
      course_development_necessity: '',
    },
    performanceActivities: {
      performance_activities: [],
    },
    problemDefinition: {
      problem_definition: {
        background: '',
        core_problem: '',
        scope: '',
        constraints: '',
      },
      problem_priorities: [],
    },
    targetTasks: {
      target_tasks: [],
      selection_reason: '',
      target_task_details: [],
    },
    aiLevelDiagnosis: {
      current_ai_level: 'AI기초형',
      expected_ai_level: 'AI활용형',
      improvement_reason: '',
    },
  };
}
