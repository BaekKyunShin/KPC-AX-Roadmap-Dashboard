import { z } from 'zod';

// 세부직무/세부업무 스키마
export const jobTaskSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1, '업무명을 입력하세요.'),
  task_description: z.string().min(1, '업무 설명을 입력하세요.'),
  current_output: z.string().optional(), // 현재 산출물
  current_workflow: z.string().optional(), // 현재 업무 흐름
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'AD_HOC']).optional(),
  time_spent_hours: z.number().min(0).optional(), // 소요 시간 (시간 단위)
});

// 페인포인트 스키마
export const painPointSchema = z.object({
  id: z.string(),
  description: z.string().min(1, '페인포인트 설명을 입력하세요.'),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  priority: z.number().min(1).max(10), // 1~10 우선순위
  related_task_ids: z.array(z.string()).optional(), // 관련 업무 ID
  impact: z.string().optional(), // 영향도 설명
});

// 데이터/시스템 제약 스키마
export const constraintSchema = z.object({
  id: z.string(),
  type: z.enum(['DATA', 'SYSTEM', 'SECURITY', 'PERMISSION', 'OTHER']),
  description: z.string().min(1, '제약사항 설명을 입력하세요.'),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  workaround: z.string().optional(), // 우회 방법
});

// 개선 목표 스키마
export const improvementGoalSchema = z.object({
  id: z.string(),
  goal_description: z.string().min(1, '개선 목표를 입력하세요.'),
  kpi: z.string().optional(), // KPI 지표
  measurement_method: z.string().optional(), // 측정 방법
  target_value: z.string().optional(), // 목표 수치
  before_value: z.string().optional(), // Before 수치
  related_task_ids: z.array(z.string()).optional(), // 관련 업무 ID
});

// 기업 세부 정보 스키마
export const companyDetailsSchema = z.object({
  department: z.string().optional(), // 부서명
  team_size: z.number().min(1).optional(), // 팀 인원
  main_systems: z.array(z.string()).optional(), // 주요 사용 시스템
  data_sources: z.array(z.string()).optional(), // 데이터 소스
  current_tools: z.array(z.string()).optional(), // 현재 사용 도구
  ai_experience: z.string().optional(), // AI 도구 사용 경험
  training_history: z.string().optional(), // 기존 교육 이력
});

// 인터뷰 전체 스키마
export const interviewSchema = z.object({
  interview_date: z.string().min(1, '인터뷰 날짜를 입력하세요.'),
  company_details: companyDetailsSchema,
  job_tasks: z.array(jobTaskSchema).min(1, '최소 1개 이상의 세부업무를 입력하세요.'),
  pain_points: z.array(painPointSchema).min(1, '최소 1개 이상의 페인포인트를 입력하세요.'),
  constraints: z.array(constraintSchema).optional(),
  improvement_goals: z.array(improvementGoalSchema).min(1, '최소 1개 이상의 개선 목표를 입력하세요.'),
  notes: z.string().optional(), // 추가 메모
  customer_requirements: z.string().optional(), // 기업 요구사항
});

// 타입 추출
export type JobTask = z.infer<typeof jobTaskSchema>;
export type PainPoint = z.infer<typeof painPointSchema>;
export type Constraint = z.infer<typeof constraintSchema>;
export type ImprovementGoal = z.infer<typeof improvementGoalSchema>;
export type CompanyDetails = z.infer<typeof companyDetailsSchema>;
export type InterviewInput = z.infer<typeof interviewSchema>;

// 빈 항목 생성 헬퍼
export function createEmptyJobTask(): JobTask {
  return {
    id: crypto.randomUUID(),
    task_name: '',
    task_description: '',
    current_output: '',
    current_workflow: '',
    frequency: 'DAILY',
    time_spent_hours: 0,
  };
}

export function createEmptyPainPoint(): PainPoint {
  return {
    id: crypto.randomUUID(),
    description: '',
    severity: 'MEDIUM',
    priority: 5,
    related_task_ids: [],
    impact: '',
  };
}

export function createEmptyConstraint(): Constraint {
  return {
    id: crypto.randomUUID(),
    type: 'DATA',
    description: '',
    severity: 'MEDIUM',
    workaround: '',
  };
}

export function createEmptyImprovementGoal(): ImprovementGoal {
  return {
    id: crypto.randomUUID(),
    goal_description: '',
    kpi: '',
    measurement_method: '',
    target_value: '',
    before_value: '',
    related_task_ids: [],
  };
}
