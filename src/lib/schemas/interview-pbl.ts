/**
 * 산인공 AI PBL 과정개발보고서 (양식 2) 인터뷰 Zod 스키마.
 *
 * 기준 문서: docs/references/2026-04-23-current-fields-inventory.md (양식 2, Ⅰ·Ⅱ·Ⅲ 장)
 *
 * ============================================================================
 * 본 파일은 두 계열의 스키마를 병존시킨다.
 *
 * ## 1) 기존 snake_case 스키마 (유지)
 *   - `courseOverviewSchema`, `companyStatusSchema`, `trainingEnvironmentSchema`,
 *     `hrdNecessitySchema`, `performanceActivitiesSchema`, `problemDefinitionSchema`,
 *     `targetTasksSchema`, `aiLevelDiagnosisSchema`, `pblInterviewSchema`,
 *     `pblInterviewAutoSaveSchema` 및 빈 항목 헬퍼들.
 *   - ISSUE-14/ISSUE-16 시점 호출부(Client 컴포넌트 · Server Actions · HWPX · LLM)가
 *     여전히 사용 중이므로 **유지**. 제거는 Task 2.4/2.7 에서 이관 후.
 *
 * ## 2) 신규 camelCase 스키마 (PR #2 Task 2.2, 양식 1:1 정합)
 *
 * 본 스키마 대상: 양식 2 Ⅰ·Ⅱ·Ⅲ 장 의 [인터뷰 입력] / [PDF 첨부] 만.
 * Ⅳ (운영계획 수립) · Ⅴ (성과분석) 은 [결과·LLM 생성] 이므로 별도 스키마 (Task 2.6).
 * Ⅳ-4-나 결과평가 계획 은 [고정 양식·결과 화면 제외] 이므로 어떤 스키마에도 포함 안 함.
 *
 * | 양식 섹션 | 라벨 | Zod 필드 |
 * |---|---|---|
 * | Ⅰ 훈련과정 개요                 | [인터뷰]   | PBLOverview.* |
 * | Ⅱ-1-가 기업 경영 이슈           | [인터뷰]   | PBLAnalysis.companyIssues |
 * | Ⅱ-1-나 조직 및 주요 업무        | [인터뷰]   | PBLAnalysis.organization.{orgTree, mainWork} |
 * | Ⅱ-2 기업 훈련환경 분석          | [인터뷰]   | PBLAnalysis.trainingEnv |
 * | Ⅱ-3-가 HRD이음 컨설팅 결과 PDF  | [PDF 첨부] | PBLAnalysis.hrdReportPdf |
 * | Ⅱ-3-나 AI훈련과정 개발 필요성   | [인터뷰]   | PBLAnalysis.courseNecessity |
 * | Ⅲ-1 훈련과제 도출 수행활동      | [인터뷰]   | PBLTasks.activities[] |
 * | Ⅲ-2-가 문제 도출                | [인터뷰]   | PBLTasks.problems[] |
 * | Ⅲ-2-나 문제 우선순위 결정       | [인터뷰]   | PBLTasks.priority |
 * | Ⅲ-3 가·나·다 훈련대상 업무      | [인터뷰]   | PBLTasks.target |
 * | Ⅲ-4-가 현재 AI역량 수준         | [인터뷰]   | PBLTasks.currentAiLevel (BASIC|EXPLORER|USER|LEADER) |
 * | Ⅲ-4-나 예상 AI역량 수준         | [인터뷰]   | PBLTasks.expectedAiLevel (동일 enum) |
 *
 * ============================================================================
 * 이중 검증 구조:
 * - Strict (최종 제출): `PBLInterviewStrictSchema` — 필수 필드 + superRefine.
 * - Loose  (자동 저장): `PBLInterviewSchema.partial()` — 모든 최상위 필드 optional.
 *
 * ============================================================================
 * 마이그레이션 메모:
 * 기존 snake_case 스키마들은 본 파일 상단에 **병존** 상태로 남겨둔다.
 * Task 2.4 (PBL 인터뷰 Client 재구현) / Task 2.7 (Server Actions 갱신) 에서
 * 호출부를 camelCase 로 이관한 뒤 snake_case 를 제거한다.
 */

import { z } from 'zod';
// ISSUE-16: PBL 인터뷰도 ROADMAP 과 동일한 6 카테고리 STT 인사이트 스키마를 공유한다.
// ISSUE-14 (PBL 확장): Ⅱ-3-가 HRD이음 보고서 PDF 단일 첨부 — 로드맵 Ⅱ-1 HRD4U 첨부와 동일 스키마 재사용.
import { hrdReportAttachmentSchema, sttInsightsSchema } from './interview-roadmap';

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
  // Ⅱ-3-가. 기업HRD이음컨설팅 결과 (전산 자동 표출) — PDF 단일 첨부 · 선택
  hrd_report_attachment: hrdReportAttachmentSchema.optional(),
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

// ============================================================================
// PR #2 Task 2.2 — 양식 1:1 정합 신규 스키마 (camelCase)
// ----------------------------------------------------------------------------
// 기준 문서 양식 2 Ⅰ·Ⅱ·Ⅲ 장 을 1:1 로 정합하는 신규 스키마. 파일 상단 주석의
// 섹션 ↔ 필드 매핑표 참고. 기존 snake_case 스키마와 병존 (Task 2.4/2.7 이관 시 제거).
//
// Ⅳ (운영계획 수립) · Ⅴ (성과분석) 은 [결과·LLM 생성] 이므로 본 스키마 대상 아님.
// Ⅳ-4-나 결과평가 계획 은 [고정 양식·결과 화면 제외] 이므로 어떤 스키마에도 포함 안 함.
// ============================================================================

// -- AI역량 수준 enum (4종) ---------------------------------------------------
// 양식 원문 한글 라벨(AI기초형·AI탐구형·AI활용형·AI선도형)은 기존 `AI_LEVEL`
// 에서 계속 유지한다. 신규 camelCase 스키마는 영문 enum 을 사용해 HWPX/LLM
// 페이로드에서 표기 흔들림을 방지하고, UI 라벨 매핑은 별도 상수로 제공한다.
//
// BASIC    = AI기초형 (기초) — AI 인식은 있으나 활용 거의 없음
// EXPLORER = AI탐구형 (초급) — 학습·파일럿 검토 중
// USER     = AI활용형 (중급) — 부서 단위 활용, 데이터 기반 개선 시작
// LEADER   = AI선도형 (고급) — 조직 전반 내재화, AX 전환 완료
export const PBL_AI_LEVEL_ENUM = z.enum(['BASIC', 'EXPLORER', 'USER', 'LEADER']);
export type PBLAILevel = z.infer<typeof PBL_AI_LEVEL_ENUM>;

export const PBL_AI_LEVEL_LABEL: Record<PBLAILevel, string> = {
  BASIC: 'AI기초형',
  EXPLORER: 'AI탐구형',
  USER: 'AI활용형',
  LEADER: 'AI선도형',
};

// -- Ⅰ 훈련과정 개요 [인터뷰] -------------------------------------------------
// 양식 Ⅰ 의 표 (기업명·훈련과정명·NCS·시간·대상 등) 중 인터뷰 단계에서 입력
// 받는 핵심 필드만 추린다. 주소·관할 등 신청서 자동 불러옴 항목은 결과 화면에서
// 별도로 바인딩하므로 본 스키마에서는 다루지 않는다.
export const PBLOverviewSchema = z.object({
  companyName: z.string().min(1, '기업명을 입력하세요.'),
  courseName: z.string().min(1, '훈련과정명을 입력하세요.'),
  // Ⅰ NCS 분류 — 양식 원문 "200107 인공지능" 예시. 신청서 자동 불러옴 가능해 optional.
  ncsCode: z.string().optional(),
  trainingHours: z
    .number({ message: '훈련시간은 숫자여야 합니다.' })
    .int({ message: '훈련시간은 정수여야 합니다 (소수 불가).' })
    .positive({ message: '훈련시간은 1 이상이어야 합니다.' }),
  trainingTarget: z.string().min(1, '훈련대상(훈련생)을 입력하세요.'),
  trainingForm: z.string().min(1, '훈련형태를 입력하세요.'),
  trainingPeriod: z.string().min(1, '훈련기간을 입력하세요.'),
  businessIssues: z.string().min(1, '사업 쟁점(경영 이슈 요약)을 입력하세요.'),
});
export type PBLOverview = z.infer<typeof PBLOverviewSchema>;

// -- Ⅱ-1-나 조직도 노드 (재귀 구조) -----------------------------------------
// 양식 Ⅱ-1-나 의 조직도는 "부서(팀)명 + 업무명" 블록이 상하로 연결된 트리 구조.
// UI 에서 n-depth 트리를 표현하기 위해 재귀 타입으로 정의한다.
// zod 의 `z.lazy()` 로 자기참조를 해결한다.
export type PBLOrgTreeNode = {
  id: string;
  name: string;
  children: PBLOrgTreeNode[];
};

export const PBLOrgTreeNodeSchema: z.ZodType<PBLOrgTreeNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1, '조직 노드 이름을 입력하세요.'),
    children: z.array(PBLOrgTreeNodeSchema),
  }),
);

// -- Ⅱ-1-나 주요 업무 행 ------------------------------------------------------
// 양식의 "업무명" 컬럼이 "부서별 주요 업무" 를 3~N 행으로 풀어 쓰는 구조.
// 조직도(orgTree) 와 별도로 "어느 부서 × 어떤 역할 × 상세" 를 저장해 HWPX 표
// repeat_rows 생성 시 1행씩 바로 매핑한다.
export const PBLMainWorkItemSchema = z.object({
  dept: z.string().min(1, '부서명을 입력하세요.'),
  role: z.string().min(1, '역할을 입력하세요.'),
  description: z.string().min(1, '주요 업무 설명을 입력하세요.'),
});
export type PBLMainWorkItem = z.infer<typeof PBLMainWorkItemSchema>;

// -- Ⅱ-1-나 조직 및 주요 업무 -----------------------------------------------
export const PBLOrganizationSchema = z.object({
  orgTree: z.array(PBLOrgTreeNodeSchema),
  mainWork: z.array(PBLMainWorkItemSchema),
});
export type PBLOrganization = z.infer<typeof PBLOrganizationSchema>;

// -- Ⅱ-3-가 HRD이음 보고서 PDF ----------------------------------------------
// Storage (interview-attachments 버킷) 에서 반환된 메타를 보관. 신규 명명
// (fileName/url/size) — 기존 `hrdReportAttachmentSchema` 와 구조 상이하며
// 로드맵 `RoadmapHrdReportPdfSchema` 와 동일 축을 공유한다.
//
// **내부 전용 필드 (UI 노출 금지)**
//   - extractedText: upload Action 이 PDF 파싱하여 주입. LLM 프롬프트가 읽는다.
//   - parseError   : upload/파싱 실패 사유. LLM 프롬프트에 사유 표출.
// Server Action 경계(save/fetch)에서 DB 의 extracted_text / parse_error 와 왕복 보존.
export const PBLHrdReportPdfSchema = z.object({
  fileName: z.string().min(1),
  url: z.string().min(1),
  size: z.number().nonnegative(),
  /** LLM 내부용 (UI 노출 금지). upload Action 이 PDF 파싱하여 주입. */
  extractedText: z.string().optional(),
  /** upload/파싱 실패 시 에러 메시지 (UI 노출 금지). */
  parseError: z.string().optional(),
});
export type PBLHrdReportPdf = z.infer<typeof PBLHrdReportPdfSchema>;

// -- Ⅱ 훈련 요구 분석 [인터뷰 + PDF 첨부] ----------------------------------
export const PBLAnalysisSchema = z.object({
  // Ⅱ-1-가 기업 경영 이슈
  companyIssues: z.string().min(1, '기업 경영 이슈(bullet 서술)를 입력하세요.'),
  // Ⅱ-1-나 조직도 + 주요 업무
  organization: PBLOrganizationSchema,
  // Ⅱ-2 기업 훈련환경 분석 (표 + 박스 자유서술 — 세부 필드는 기존 snake_case
  // trainingEnvironmentSchema 에서 다루고, 본 신규 스키마는 요약/자유서술로 저장)
  trainingEnv: z.string().min(1, '훈련환경 분석 결과를 입력하세요.'),
  // Ⅱ-3-가 HRD이음 PDF — 미첨부 허용 (null)
  hrdReportPdf: PBLHrdReportPdfSchema.nullable(),
  // Ⅱ-3-나 AI훈련과정 개발 필요성
  courseNecessity: z.string().min(1, 'AI훈련과정 개발 필요성을 입력하세요.'),
});
export type PBLAnalysis = z.infer<typeof PBLAnalysisSchema>;

// -- Ⅲ-1 수행활동 행 ---------------------------------------------------------
// 양식 Ⅲ-1 의 표는 "차수 × 4행(참석자) 병합" 구조. 본 스키마는 1 차수 = 1 객체로
// 저장하며, 참석자 4역할은 `participants` 필드에 자유서술로 합친다.
export const PBLActivityItemSchema = z.object({
  round: z
    .number({ message: '차수는 숫자여야 합니다.' })
    .int({ message: '차수는 정수여야 합니다.' })
    .positive({ message: '차수는 1 이상이어야 합니다.' }),
  date: z.string().min(1, '수행 일자를 입력하세요.'),
  content: z.string().min(1, '수행 내용을 입력하세요.'),
  method: z.string().min(1, '수행 방법을 입력하세요.'),
  participants: z.string().min(1, '참석자(성명)를 입력하세요.'),
});
export type PBLActivityItem = z.infer<typeof PBLActivityItemSchema>;

// -- Ⅲ-2-가 문제 도출 행 -----------------------------------------------------
// 양식 Ⅲ-2-가 문제 정의서는 "배경/핵심/범위/제약" 4필드 표 + 문제 목록.
// 본 스키마는 문제 목록(반복 행) 을 `problems[]` 로 단순화해 저장한다.
export const PBLProblemItemSchema = z.object({
  title: z.string().min(1, '문제명을 입력하세요.'),
  description: z.string().min(1, '문제 설명을 입력하세요.'),
  impact: z.string().min(1, '영향(임팩트)을 입력하세요.'),
});
export type PBLProblemItem = z.infer<typeof PBLProblemItemSchema>;

// -- Ⅲ-2-나 문제 우선순위 행 -----------------------------------------------
export const PBLPriorityItemSchema = z.object({
  problem: z.string().min(1, '문제명을 입력하세요.'),
  score: z
    .number({ message: '우선순위 점수는 숫자여야 합니다.' })
    .int({ message: '우선순위 점수는 정수여야 합니다 (소수 불가).' })
    .min(1, { message: '우선순위 점수는 1 이상이어야 합니다.' })
    .max(5, { message: '우선순위 점수는 5 이하여야 합니다.' }),
  rank: z
    .number({ message: '순위는 숫자여야 합니다.' })
    .int({ message: '순위는 정수여야 합니다.' })
    .positive({ message: '순위는 1 이상이어야 합니다.' }),
});
export type PBLPriorityItem = z.infer<typeof PBLPriorityItemSchema>;

// -- Ⅲ-2-나 문제 우선순위 결정 -----------------------------------------------
export const PBLPrioritySchema = z.object({
  items: z
    .array(PBLPriorityItemSchema)
    .min(1, '문제 우선순위 행을 최소 1개 입력하세요.'),
  method: z.string().min(1, '우선순위 결정 방법(AHP·협의 등)을 입력하세요.'),
});
export type PBLPriority = z.infer<typeof PBLPrioritySchema>;

// -- Ⅲ-3 다. 훈련대상 업무 세부내용 (AS-IS/TO-BE/지식/기술 요약 행) -----------
export const PBLTargetDetailSchema = z.object({
  title: z.string().min(1, '세부내용 제목을 입력하세요.'),
  description: z.string().min(1, '세부내용 설명을 입력하세요.'),
});
export type PBLTargetDetail = z.infer<typeof PBLTargetDetailSchema>;

// -- Ⅲ-3 가·나·다 훈련대상 업무 통합 ----------------------------------------
// 양식 Ⅲ-3 가(선정), 나(선정 사유), 다(세부내용) 를 단일 객체로 통합.
// `code` 는 NCS 분류 자동 채움 경로 대비 optional.
export const PBLTargetSchema = z.object({
  name: z.string().min(1, '훈련대상 업무명을 입력하세요.'),
  code: z.string().optional(),
  scope: z.string().min(1, '업무 범위(부서·인원 등)를 입력하세요.'),
  necessity: z.string().min(1, 'AI기반 문제해결 필요성(선정 사유)을 입력하세요.'),
  details: z.array(PBLTargetDetailSchema),
});
export type PBLTarget = z.infer<typeof PBLTargetSchema>;

// -- Ⅲ-4 가·나 AI역량 수준 (현재/예상 공통 구조) ----------------------------
export const PBLAiLevelAssessmentSchema = z.object({
  level: PBL_AI_LEVEL_ENUM,
  note: z.string().default(''),
});
export type PBLAiLevelAssessment = z.infer<typeof PBLAiLevelAssessmentSchema>;

// -- Ⅲ AI기반 훈련과제 도출 [인터뷰] ---------------------------------------
export const PBLTasksSchema = z.object({
  // Ⅲ-1 수행활동
  activities: z
    .array(PBLActivityItemSchema)
    .min(1, '수행활동 최소 1차수 이상을 입력하세요.'),
  // Ⅲ-2-가 문제 도출
  problems: z.array(PBLProblemItemSchema).min(1, '문제를 최소 1건 이상 입력하세요.'),
  // Ⅲ-2-나 문제 우선순위 결정
  priority: PBLPrioritySchema,
  // Ⅲ-3 훈련대상 업무 (가·나·다 통합)
  target: PBLTargetSchema,
  // Ⅲ-4-가 현재 AI역량 수준
  currentAiLevel: PBLAiLevelAssessmentSchema,
  // Ⅲ-4-나 예상 AI역량 수준
  expectedAiLevel: PBLAiLevelAssessmentSchema,
});
export type PBLTasks = z.infer<typeof PBLTasksSchema>;

// -- 통합 스키마: Ⅰ + Ⅱ + Ⅲ --------------------------------------------------
// PBLInterviewSchema 는 plain `z.object()` (ZodObject) 형태로 유지해 최종 제출/
// 자동 저장 양쪽에서 재사용할 수 있게 한다.
// - Strict (최종 제출):  `PBLInterviewStrictSchema.safeParse`  → superRefine 검증.
// - Loose  (자동 저장):  `PBLInterviewSchema.partial()`         → 빈 객체 {} 통과.
//
// zod v3 에서 `.refine()`·`.superRefine()` 결과는 ZodEffects 로 감싸져
// `.partial()`·`.merge()` 를 제공하지 않는다. 따라서 조건부 검증은 본 ZodObject
// 위에 별도 export 로 부착하고, 본체는 ZodObject 를 유지한다.
export const PBLInterviewSchema = PBLOverviewSchema.merge(PBLAnalysisSchema).merge(
  PBLTasksSchema,
);
export type PBLInterviewStrict = z.infer<typeof PBLInterviewSchema>;

// 조건부 검증까지 포함한 엄격 스키마 (최종 제출 경계에서 사용).
// Ⅱ-3 양식 작성 안내 상 "HRD이음 보고서 PDF 또는 AI훈련과정 개발 필요성 중
// 하나는 반드시 제공" 되어야 한다 → hrdReportPdf=null 일 때 courseNecessity
// (trim 후 비공백) 이 필수. 본체 `courseNecessity` 자체는 min(1) 로 이미
// 보호되나, 공백만 입력된 케이스를 strict 경계에서 한 번 더 차단한다.
export const PBLInterviewStrictSchema = PBLInterviewSchema.superRefine((d, ctx) => {
  if (d.hrdReportPdf === null) {
    const trimmed = (d.courseNecessity ?? '').trim();
    if (trimmed === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'HRD이음 보고서 PDF 가 없을 때는 AI훈련과정 개발 필요성(Ⅱ-3-나)을 반드시 작성해야 합니다.',
        path: ['courseNecessity'],
      });
    }
  }
});
