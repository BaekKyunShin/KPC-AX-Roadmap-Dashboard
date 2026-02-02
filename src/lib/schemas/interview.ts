import { z } from 'zod';

// 인터뷰 참석자 스키마
export const interviewParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '이름을 입력하세요.'),
  position: z.string().optional(), // 직급/직책
});

// 세부직무/세부업무 스키마
export const jobTaskSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1, '업무명을 입력하세요.'),
  task_description: z.string().min(1, '업무 설명을 입력하세요.'),
});

// 페인포인트 스키마
export const painPointSchema = z.object({
  id: z.string(),
  description: z.string().min(1, '페인포인트 설명을 입력하세요.'),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  related_task_ids: z.array(z.string()).optional(), // 관련 업무 ID
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

// 주요 사용 시스템/도구 프리셋 (한국 중소기업 실제 사용 기준, 사용 빈도순 정렬)
// 출처: 2023-2024 ERP/그룹웨어 시장 점유율 조사, 업무 도구 사용 현황 조사
export const SYSTEM_TOOL_PRESETS = [
  // ===== 거의 모든 기업이 사용 (최상위) =====
  'MS Office (Excel, Word, PPT)',
  '한글 (HWP)',
  '전자결재',
  // ===== ERP (더존 89% 중소기업 점유율) =====
  'ERP (더존 Smart A)',
  'ERP (더존 위하고)',
  'ERP (더존 아마란스10)',
  'ERP (이카운트)',
  'ERP (영림원 K시스템)',
  'ERP (SAP)',
  // ===== 그룹웨어 (하이웍스 25.8% 1위) =====
  '그룹웨어 (하이웍스)',
  '그룹웨어 (네이버웍스)',
  '그룹웨어 (다우오피스)',
  '그룹웨어 (카카오워크)',
  // ===== 협업/커뮤니케이션 =====
  'Microsoft Teams',
  'Slack',
  'Zoom',
  'Google Workspace',
  'Notion',
  '협업툴 (잔디)',
  // ===== 회계/세무 =====
  '회계 (케이렙/세무사랑)',
  '회계 (경리나라)',
  '인사급여시스템',
  // ===== 생산/물류 (제조업) =====
  'MES (제조실행시스템)',
  'WMS (창고관리시스템)',
  'SCM (공급망관리)',
  'CRM (고객관리)',
  // ===== CAD/설계 (제조업) =====
  'CAD (AutoCAD)',
  'CAD (캐디안)',
  'CAD (SolidWorks)',
  'CAD (Inventor)',
  // ===== 디자인/개발 (특정 직군) =====
  'Figma',
  'Adobe Photoshop',
  'Python',
  'SQL',
] as const;

// 기업 세부 정보 스키마
export const companyDetailsSchema = z.object({
  systems_and_tools: z.array(z.string()).optional(), // 주요 사용 시스템/도구 (통합)
  ai_experience: z.string().min(1, 'AI 도구 사용 경험을 입력하세요.'), // AI 도구 사용 경험 (필수)
});

// STT 인사이트 스키마 (LLM 추출 결과)
export const sttInsightsSchema = z.object({
  추가_업무: z.array(z.string()).optional(),
  추가_페인포인트: z.array(z.string()).optional(),
  숨은_니즈: z.array(z.string()).optional(),
  조직_맥락: z.string().optional(),
  AI_태도: z.string().optional(),
  주요_인용: z.array(z.string()).optional(),
});

// 인터뷰 전체 스키마
export const interviewSchema = z.object({
  interview_date: z.string().min(1, '인터뷰 날짜를 입력하세요.'),
  participants: z.array(interviewParticipantSchema).min(1, '최소 1명 이상의 참석자를 입력하세요.'),
  company_details: companyDetailsSchema,
  job_tasks: z.array(jobTaskSchema).min(1, '최소 1개 이상의 세부업무를 입력하세요.'),
  pain_points: z.array(painPointSchema).min(1, '최소 1개 이상의 페인포인트를 입력하세요.'),
  constraints: z.array(constraintSchema).optional(),
  improvement_goals: z.array(improvementGoalSchema).min(1, '최소 1개 이상의 개선 목표를 입력하세요.'),
  notes: z.string().optional(), // 추가 메모
  customer_requirements: z.string().optional(), // 기업 요구사항
  stt_insights: sttInsightsSchema.optional(), // STT에서 추출한 인사이트
});

// 타입 추출
export type InterviewParticipant = z.infer<typeof interviewParticipantSchema>;
export type JobTask = z.infer<typeof jobTaskSchema>;
export type PainPoint = z.infer<typeof painPointSchema>;
export type Constraint = z.infer<typeof constraintSchema>;
export type ImprovementGoal = z.infer<typeof improvementGoalSchema>;
export type CompanyDetails = z.infer<typeof companyDetailsSchema>;
export type SttInsights = z.infer<typeof sttInsightsSchema>;
export type InterviewInput = z.infer<typeof interviewSchema>;

// 빈 항목 생성 헬퍼
export function createEmptyParticipant(): InterviewParticipant {
  return {
    id: crypto.randomUUID(),
    name: '',
    position: '',
  };
}

export function createEmptyJobTask(): JobTask {
  return {
    id: crypto.randomUUID(),
    task_name: '',
    task_description: '',
  };
}

export function createEmptyPainPoint(): PainPoint {
  return {
    id: crypto.randomUUID(),
    description: '',
    severity: 'MEDIUM',
    related_task_ids: [],
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
