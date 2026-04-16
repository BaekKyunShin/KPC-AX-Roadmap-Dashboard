import { z } from 'zod';
import { sttInsightsSchema } from './interview';

// ============================================================================
// 산인공 로드맵 인터뷰 양식 (docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf)
// ============================================================================

// Ⅰ-2. 주요 활동 "수행 방법" - 양식 예시: 대면 / 비대면(화상회의) / 대면(워크숍)
export const interviewMethodEnum = z.enum(['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER']);
export type InterviewMethod = z.infer<typeof interviewMethodEnum>;

export const INTERVIEW_METHOD_LABEL: Record<InterviewMethod, string> = {
  ONSITE: '대면',
  VIDEO: '비대면(화상회의)',
  WORKSHOP: '워크숍',
  OTHER: '기타',
};

export const INTERVIEW_METHOD_OPTIONS: ReadonlyArray<{ value: InterviewMethod; label: string }> = [
  { value: 'ONSITE', label: '대면' },
  { value: 'VIDEO', label: '비대면(화상회의)' },
  { value: 'WORKSHOP', label: '워크숍' },
  { value: 'OTHER', label: '기타' },
];

// Ⅰ. 개요 (산인공 양식 Ⅰ-1 수립 필요성 + Ⅰ-3 수립 주요 결과)
// - ai_competency_level: Ⅰ-3 기업 AI 역량 수준 체크
//   BEGINNER=초급(AI기초형) / INTERMEDIATE=중급(AI탐구형) / ADVANCED=고급(AI활용형·선도형)
// - hrd_report_attachment: Ⅱ-1 HRD이음 진단 보고서 PDF 첨부
//   { storage_path: bucket 내부 경로, file_name: 원본 파일명, mime_type, size, uploaded_at }
export const AI_COMPETENCY_LEVEL = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type AiCompetencyLevel = z.infer<typeof AI_COMPETENCY_LEVEL>;

export const AI_COMPETENCY_LEVEL_LABEL: Record<AiCompetencyLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

export const AI_COMPETENCY_LEVEL_SUBTITLE: Record<AiCompetencyLevel, string> = {
  BEGINNER: 'AI기초형',
  INTERMEDIATE: 'AI탐구형',
  ADVANCED: 'AI활용형·선도형',
};

export const AI_COMPETENCY_LEVEL_OPTIONS: ReadonlyArray<{
  value: AiCompetencyLevel;
  label: string;
  subtitle: string;
}> = [
  { value: 'BEGINNER', label: '초급', subtitle: 'AI기초형' },
  { value: 'INTERMEDIATE', label: '중급', subtitle: 'AI탐구형' },
  { value: 'ADVANCED', label: '고급', subtitle: 'AI활용형·선도형' },
];

// HRD이음 진단 보고서 첨부 메타 (Storage 'interview-attachments' 버킷)
export const hrdReportAttachmentSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().optional(),
  size: z.number().nonnegative().optional(),
  uploaded_at: z.string().optional(),
});
export type HrdReportAttachment = z.infer<typeof hrdReportAttachmentSchema>;

export const overviewSchema = z.object({
  establishment_necessity: z.string().min(1, '수립 필요성을 입력하세요 (5줄 내외).'),
  ai_competency_level: AI_COMPETENCY_LEVEL,
  selected_tasks_summary: z.string().min(1, '선정 과업을 입력하세요.'),
  roadmap_summary: z.string().min(1, '수립 주요내용 요약을 입력하세요 (1장 이내).'),
  hrd_report_attachment: hrdReportAttachmentSchema.optional(),
});

// Ⅱ-2. 기업 요구분석 (4필드 텍스트)
export const companyRequirementsSchema = z.object({
  company_status: z.string().min(1, '기업 현황을 입력하세요.'),
  main_problems: z.string().min(1, '주요 문제를 입력하세요.'),
  push_willingness: z.string().min(1, '추진 의지를 입력하세요.'),
  expected_outcomes: z.string().min(1, '기대 성과를 입력하세요.'),
});

// Ⅱ-3. 과업·워크플로우 분석표 항목
export const taskWorkflowItemSchema = z.object({
  id: z.string(),
  job: z.string().min(1, '직무를 입력하세요.'),
  task_name: z.string().min(1, '과업명을 입력하세요.'),
  as_is: z.string().min(1, '현행 방식을 입력하세요.'),
  problems: z.string().min(1, '문제점을 입력하세요.'),
  data_availability: z.string().min(1, '데이터 보유 현황을 입력하세요.'),
  ai_necessity: z.number().int().min(1).max(5),
});

// Ⅱ-4. 훈련대상 과업 선정
export const trainingTargetSchema = z.object({
  id: z.string(),
  task_name: z.string().min(1, '과업명을 입력하세요.'),
  selection_reason: z.string().min(1, '선정 사유를 입력하세요.'),
  as_is: z.string().min(1, '현행을 입력하세요.'),
  to_be: z.string().min(1, '개선 목표를 입력하세요.'),
});

// 분석 메모 + 첨부파일 (선택)
export const analysisNotesSchema = z.object({
  text: z.string().default(''),
  attachment_urls: z.array(z.string().url()).default([]),
});

// 참석자 (interview.ts와 호환 유지)
export const roadmapParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '이름을 입력하세요.'),
  position: z.string().optional(),
});

// 전체 로드맵 인터뷰 스키마 (수동 저장용 - 엄격)
export const roadmapInterviewSchema = z.object({
  overview: overviewSchema,
  interview_date: z.string().min(1, '인터뷰 날짜를 입력하세요.'),
  interview_round: z.number().int().min(1, '인터뷰 차수는 1 이상이어야 합니다.'),
  interview_time: z.string().min(1, '인터뷰 시간을 입력하세요.'),
  interview_method: interviewMethodEnum,
  participants: z.array(roadmapParticipantSchema).min(1, '최소 1명 이상의 참석자를 입력하세요.'),
  company_requirements: companyRequirementsSchema,
  task_workflow_items: z.array(taskWorkflowItemSchema).min(1, '최소 1개의 과업을 분석하세요.'),
  analysis_notes: analysisNotesSchema.default({ text: '', attachment_urls: [] }),
  training_targets: z.array(trainingTargetSchema).min(1, '최소 1개의 훈련대상 과업을 선정하세요.'),
  notes: z.string().default(''),
  stt_insights: sttInsightsSchema.optional(),
});

// 자동저장용 (전 필드 optional)
export const roadmapInterviewAutoSaveSchema = z.object({
  overview: z
    .object({
      establishment_necessity: z.string().optional(),
      ai_competency_level: AI_COMPETENCY_LEVEL.optional(),
      selected_tasks_summary: z.string().optional(),
      roadmap_summary: z.string().optional(),
      hrd_report_attachment: hrdReportAttachmentSchema.optional(),
    })
    .optional(),
  interview_date: z.string().optional(),
  interview_round: z.number().int().optional(),
  interview_time: z.string().optional(),
  interview_method: interviewMethodEnum.optional(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.string().optional(),
  })).optional(),
  company_requirements: z.object({
    company_status: z.string(),
    main_problems: z.string(),
    push_willingness: z.string(),
    expected_outcomes: z.string(),
  }).optional(),
  task_workflow_items: z.array(z.object({
    id: z.string(),
    job: z.string(),
    task_name: z.string(),
    as_is: z.string(),
    problems: z.string(),
    data_availability: z.string(),
    ai_necessity: z.number().int().min(1).max(5),
  })).optional(),
  analysis_notes: z.object({
    text: z.string().default(''),
    attachment_urls: z.array(z.string()).default([]),
  }).optional(),
  training_targets: z.array(z.object({
    id: z.string(),
    task_name: z.string(),
    selection_reason: z.string(),
    as_is: z.string(),
    to_be: z.string(),
  })).optional(),
  notes: z.string().optional(),
  stt_insights: sttInsightsSchema.optional(),
});

// ============================================================================
// 타입
// ============================================================================

export type Overview = z.infer<typeof overviewSchema>;
export type CompanyRequirements = z.infer<typeof companyRequirementsSchema>;
export type TaskWorkflowItem = z.infer<typeof taskWorkflowItemSchema>;
export type TrainingTarget = z.infer<typeof trainingTargetSchema>;
export type AnalysisNotes = z.infer<typeof analysisNotesSchema>;
export type RoadmapParticipant = z.infer<typeof roadmapParticipantSchema>;
export type RoadmapInterview = z.infer<typeof roadmapInterviewSchema>;
export type RoadmapInterviewInput = z.input<typeof roadmapInterviewSchema>;
export type RoadmapInterviewAutoSaveInput = z.input<typeof roadmapInterviewAutoSaveSchema>;

// ============================================================================
// 빈 항목 생성 헬퍼
// ============================================================================

export function createEmptyOverview(): Overview {
  return {
    establishment_necessity: '',
    ai_competency_level: 'BEGINNER',
    selected_tasks_summary: '',
    roadmap_summary: '',
  };
}

export function createEmptyRoadmapParticipant(): RoadmapParticipant {
  return {
    id: crypto.randomUUID(),
    name: '',
    position: '',
  };
}

export function createEmptyTaskWorkflowItem(): TaskWorkflowItem {
  return {
    id: crypto.randomUUID(),
    job: '',
    task_name: '',
    as_is: '',
    problems: '',
    data_availability: '',
    ai_necessity: 3,
  };
}

export function createEmptyTrainingTarget(): TrainingTarget {
  return {
    id: crypto.randomUUID(),
    task_name: '',
    selection_reason: '',
    as_is: '',
    to_be: '',
  };
}

// ============================================================================
// 레거시 interviews 행 ↔ 로드맵 양식 매핑
// ----------------------------------------------------------------------------
// 기존 interviews 테이블 컬럼(company_details, job_tasks, pain_points,
// improvement_goals 등)을 신규 RoadmapInterview Partial로 변환한다.
// 본 Step에서 신규 DB 컬럼을 추가하지 않으므로 애플리케이션 레이어 매핑으로
// 호환성을 확보한다. Step 12에서 roadmap_data 전용 컬럼으로 이전 예정.
// ============================================================================

interface LegacyCompanyDetails {
  ai_experience?: string;
  systems_and_tools?: string[];
  roadmap_company_requirements?: {
    company_status?: string;
    main_problems?: string;
    push_willingness?: string;
    expected_outcomes?: string;
  };
  roadmap_interview_method?: InterviewMethod | string;
  roadmap_analysis_notes?: {
    text?: string;
    attachment_urls?: string[];
  };
}

interface LegacyJobTask {
  id?: string;
  task_name?: string;
  task_description?: string;
  roadmap_job?: string;
  roadmap_problems?: string;
  roadmap_data_availability?: string;
  roadmap_ai_necessity?: number | string;
}

interface LegacyImprovementGoal {
  id?: string;
  goal_description?: string;
  kpi?: string;
  roadmap_as_is?: string;
  roadmap_to_be?: string;
}

interface LegacyInterviewRow {
  interview_date?: string | null;
  interview_round?: number | null;
  interview_time?: string | null;
  participants?: unknown;
  company_details?: LegacyCompanyDetails | null;
  job_tasks?: LegacyJobTask[] | null;
  pain_points?: Array<{ id?: string; description?: string }> | null;
  improvement_goals?: LegacyImprovementGoal[] | null;
  notes?: string | null;
  customer_requirements?: string | null;
  stt_insights?: unknown;
}

function clampAiNecessity(value: number | string | undefined): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n as number)) return 3;
  const int = Math.trunc(n as number);
  return int < 1 || int > 5 ? 3 : int;
}

export function mapInterviewRowToRoadmapInterview(
  row: LegacyInterviewRow | null
): Partial<RoadmapInterview> {
  if (!row) return {};

  const partial: Partial<RoadmapInterview> = {};

  if (row.interview_date) partial.interview_date = row.interview_date;
  if (typeof row.interview_round === 'number') partial.interview_round = row.interview_round;
  if (row.interview_time) partial.interview_time = row.interview_time;

  // 수행 방법 복원 — 미보유 시 기본값 ONSITE
  const savedMethod = row.company_details?.roadmap_interview_method;
  const validMethods: InterviewMethod[] = ['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER'];
  partial.interview_method = (savedMethod && validMethods.includes(savedMethod as InterviewMethod))
    ? (savedMethod as InterviewMethod)
    : 'ONSITE';

  if (Array.isArray(row.participants)) {
    partial.participants = row.participants as RoadmapParticipant[];
  }

  // 분석 노트 복원
  const savedAn = row.company_details?.roadmap_analysis_notes;
  if (savedAn) {
    partial.analysis_notes = {
      text: savedAn.text ?? '',
      attachment_urls: Array.isArray(savedAn.attachment_urls) ? savedAn.attachment_urls : [],
    };
  }

  // 우선순위: roadmap_company_requirements(원본 4필드) > legacy ai_experience + customer_requirements
  const savedCr = row.company_details?.roadmap_company_requirements;
  if (savedCr) {
    partial.company_requirements = {
      company_status: savedCr.company_status ?? '',
      main_problems: savedCr.main_problems ?? '',
      push_willingness: savedCr.push_willingness ?? '',
      expected_outcomes: savedCr.expected_outcomes ?? '',
    };
  } else if (row.company_details || row.customer_requirements) {
    const aiExp = row.company_details?.ai_experience ?? '';
    const tools = row.company_details?.systems_and_tools?.join(', ') ?? '';
    partial.company_requirements = {
      company_status: [aiExp, tools].filter(Boolean).join(' / '),
      main_problems: '',
      push_willingness: '',
      expected_outcomes: row.customer_requirements ?? '',
    };
  }

  if (Array.isArray(row.job_tasks) && row.job_tasks.length > 0) {
    partial.task_workflow_items = row.job_tasks.map((t) => ({
      id: t.id ?? crypto.randomUUID(),
      job: t.roadmap_job ?? '',
      task_name: t.task_name ?? '',
      as_is: t.task_description ?? '',
      problems: t.roadmap_problems ?? '',
      data_availability: t.roadmap_data_availability ?? '',
      ai_necessity: clampAiNecessity(t.roadmap_ai_necessity),
    }));
  }

  if (Array.isArray(row.improvement_goals) && row.improvement_goals.length > 0) {
    partial.training_targets = row.improvement_goals.map((g) => ({
      id: g.id ?? crypto.randomUUID(),
      task_name: g.kpi ?? '',
      selection_reason: g.goal_description ?? '',
      as_is: g.roadmap_as_is ?? '',
      to_be: g.roadmap_to_be ?? '',
    }));
  }

  if (typeof row.notes === 'string') partial.notes = row.notes;

  if (row.stt_insights && typeof row.stt_insights === 'object') {
    partial.stt_insights = row.stt_insights as RoadmapInterview['stt_insights'];
  }

  return partial;
}
