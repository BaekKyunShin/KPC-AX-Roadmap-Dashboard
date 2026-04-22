import { z } from 'zod';

// ============================================================================
// STT 인사이트 스키마 (LLM이 STT 원문에서 추출하는 구조화 인사이트)
// ============================================================================

export const sttInsightsSchema = z.object({
  추가_업무: z.array(z.string()).optional(),
  추가_페인포인트: z.array(z.string()).optional(),
  숨은_니즈: z.array(z.string()).optional(),
  조직_맥락: z.string().optional(),
  AI_태도: z.string().optional(),
  주요_인용: z.array(z.string()).optional(),
});

export type SttInsights = z.infer<typeof sttInsightsSchema>;

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

// HRD이음 진단 보고서 / 분석노트 첨부 메타 (Storage 'interview-attachments' 버킷)
// extracted_text: file-parser 모듈로 업로드 직후 동기 추출한 본문 (5000자 truncate)
// parse_error  : 파싱 실패 시 사유 (텍스트 미추출 사유를 LLM 프롬프트에 노출)
export const hrdReportAttachmentSchema = z.object({
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().optional(),
  size: z.number().nonnegative().optional(),
  uploaded_at: z.string().optional(),
  extracted_text: z.string().optional(),
  parse_error: z.string().optional(),
});
export type HrdReportAttachment = z.infer<typeof hrdReportAttachmentSchema>;

// Ⅰ-3 `roadmap_summary`(수립 주요내용 요약)는 로드맵 생성 시 LLM 이 자동 생성한다
// (ISSUE-04, 2026-04-21 담당자 확정). 사용자 입력 필드에서는 optional 로 완화.
export const overviewSchema = z.object({
  establishment_necessity: z.string().min(1, '수립 필요성을 입력하세요 (5줄 내외).'),
  ai_competency_level: AI_COMPETENCY_LEVEL,
  selected_tasks_summary: z.string().min(1, '선정 과업을 입력하세요.'),
  roadmap_summary: z.string().optional(),
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

// 분석 메모 + 첨부 파일 (ISSUE-14: URL 배열 → 파일 객체 배열)
// hrdReportAttachmentSchema 를 재사용해 Storage 'interview-attachments' 버킷에
// 업로드된 파일 메타(storage_path/file_name/mime_type/size/uploaded_at)를 보관한다.
// production 의 attachment_urls 사용 row 는 0건이라 단순 교체가 안전하다.
export const analysisNotesSchema = z.object({
  text: z.string().default(''),
  attachment_files: z.array(hrdReportAttachmentSchema).default([]),
});

// Ⅲ-1. 역량 모델링 (ISSUE-04, 2026-04-21 담당자 확정)
// 산인공 양식 1번 Ⅲ-1 표 기준으로 역량 1건은 역량명·정의·지식(K)·기술(S)·태도(A) 를
// 각각 자유 서술 블록으로 받는다. LLM 은 이 요약 텍스트를 받아 학습 설계용 배열
// (knowledge[]·skills[]·attitudes[]) 로 확장한다.
export const competencyModelSchema = z.object({
  id: z.string(),
  competency_name: z.string().min(1, '역량명을 입력하세요.'),
  competency_definition: z.string().min(1, '역량 정의(수행준거)를 입력하세요.'),
  knowledge: z.string().min(1, '필요 지식을 입력하세요.'),
  skill: z.string().min(1, '필요 기술을 입력하세요.'),
  attitude: z.string().min(1, '필요 태도를 입력하세요.'),
});

// Ⅲ-1. NCS 활용 블록 (루트 1건)
// uses_ncs=true → NCS 능력단위를 어떻게 참고·수정했는지 서술 (ncs_usage_method)
// uses_ncs=false → NCS 없이 어떻게 도출했는지 서술 (competency_derivation_method)
export const ncsUsageSchema = z
  .object({
    uses_ncs: z.boolean(),
    ncs_usage_method: z.string().optional(),
    competency_derivation_method: z.string().optional(),
  })
  .refine(
    (d) =>
      d.uses_ncs
        ? (d.ncs_usage_method?.trim() ?? '') !== ''
        : (d.competency_derivation_method?.trim() ?? '') !== '',
    {
      message: 'NCS 활용 여부에 맞는 내용을 입력하세요.',
      path: ['ncs_usage_method'],
    },
  );

// 참석자 (interview.ts와 호환 유지)
export const roadmapParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '이름을 입력하세요.'),
  position: z.string().optional(),
});

// 전체 로드맵 인터뷰 스키마 (수동 저장용 - 엄격)
// ISSUE-10: interview_time(단일) 을 interview_start_time / interview_end_time 으로 분리.
//           legacy production row 3건은 mapInterviewRowToRoadmapInterview 에서 fallback 처리.
export const roadmapInterviewSchema = z.object({
  overview: overviewSchema,
  interview_date: z.string().min(1, '인터뷰 날짜를 입력하세요.'),
  interview_round: z.number().int().min(1, '인터뷰 차수는 1 이상이어야 합니다.'),
  interview_start_time: z.string().min(1, '시작 시간을 입력하세요.'),
  interview_end_time: z.string().min(1, '종료 시간을 입력하세요.'),
  interview_method: interviewMethodEnum,
  participants: z.array(roadmapParticipantSchema).min(1, '최소 1명 이상의 참석자를 입력하세요.'),
  company_requirements: companyRequirementsSchema,
  task_workflow_items: z.array(taskWorkflowItemSchema).min(1, '최소 1개의 과업을 분석하세요.'),
  analysis_notes: analysisNotesSchema.default({ text: '', attachment_files: [] }),
  training_targets: z.array(trainingTargetSchema).min(1, '최소 1개의 훈련대상 과업을 선정하세요.'),
  competency_models: z
    .array(competencyModelSchema)
    .min(1, '최소 1개의 역량 모델을 입력하세요.'),
  ncs_usage: ncsUsageSchema,
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
  interview_start_time: z.string().optional(),
  interview_end_time: z.string().optional(),
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
    attachment_files: z.array(hrdReportAttachmentSchema).default([]),
  }).optional(),
  training_targets: z.array(z.object({
    id: z.string(),
    task_name: z.string(),
    selection_reason: z.string(),
    as_is: z.string(),
    to_be: z.string(),
  })).optional(),
  // 자동저장 중간 상태 허용: 역량 필드 일부가 비어 있어도 통과
  competency_models: z
    .array(
      z.object({
        id: z.string(),
        competency_name: z.string().optional(),
        competency_definition: z.string().optional(),
        knowledge: z.string().optional(),
        skill: z.string().optional(),
        attitude: z.string().optional(),
      }),
    )
    .optional(),
  // 자동저장 중간 상태 허용: refine 없이 느슨하게
  ncs_usage: z
    .object({
      uses_ncs: z.boolean(),
      ncs_usage_method: z.string().optional(),
      competency_derivation_method: z.string().optional(),
    })
    .optional(),
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
export type CompetencyModel = z.infer<typeof competencyModelSchema>;
export type NcsUsage = z.infer<typeof ncsUsageSchema>;
export type RoadmapInterview = z.infer<typeof roadmapInterviewSchema>;
export type RoadmapInterviewInput = z.input<typeof roadmapInterviewSchema>;
export type RoadmapInterviewAutoSaveInput = z.input<typeof roadmapInterviewAutoSaveSchema>;

// ============================================================================
// 빈 항목 생성 헬퍼
// ============================================================================

export function createEmptyOverview(): Overview {
  // roadmap_summary 는 LLM 자동생성이므로 초기에 포함하지 않는다 (undefined).
  return {
    establishment_necessity: '',
    ai_competency_level: 'BEGINNER',
    selected_tasks_summary: '',
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

export function createEmptyCompetencyModel(): CompetencyModel {
  return {
    id: crypto.randomUUID(),
    competency_name: '',
    competency_definition: '',
    knowledge: '',
    skill: '',
    attitude: '',
  };
}

export function createEmptyNcsUsage(): NcsUsage {
  return {
    uses_ncs: false,
    competency_derivation_method: '',
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
    // ISSUE-14: 신규 attachment_files 우선, legacy attachment_urls 는 무시
    attachment_files?: Array<{
      storage_path?: string;
      file_name?: string;
      mime_type?: string;
      size?: number;
      uploaded_at?: string;
      extracted_text?: string;
      parse_error?: string;
    }>;
    attachment_urls?: string[];
  };
  // Ⅰ장 개요 (OFA-06.5 신규)
  roadmap_overview?: {
    establishment_necessity?: string;
    ai_competency_level?: AiCompetencyLevel | string;
    selected_tasks_summary?: string;
    roadmap_summary?: string;
    hrd_report_attachment?: {
      storage_path?: string;
      file_name?: string;
      mime_type?: string;
      size?: number;
      uploaded_at?: string;
      extracted_text?: string;
      parse_error?: string;
    } | null;
  } | null;
  // Ⅲ-1 역량 모델링 + NCS 활용 (ISSUE-04 신규, 2026-04-21)
  roadmap_competency_models?: Array<{
    id?: string;
    competency_name?: string;
    competency_definition?: string;
    knowledge?: string;
    skill?: string;
    attitude?: string;
  }> | null;
  roadmap_ncs_usage?: {
    uses_ncs?: boolean;
    ncs_usage_method?: string;
    competency_derivation_method?: string;
  } | null;
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
  // ISSUE-10: 신규 시작/종료 컬럼. 단일 interview_time 은 legacy production 3건 fallback 용으로 유지.
  interview_start_time?: string | null;
  interview_end_time?: string | null;
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

  // ISSUE-10: 시간 필드 매핑.
  // 우선순위: 신규 interview_start_time/end_time → legacy 단일 interview_time → 미설정.
  // production 3건의 legacy row 는 단일 값 → start_time fallback, end_time 은 빈 문자열.
  if (row.interview_start_time || row.interview_end_time) {
    partial.interview_start_time = row.interview_start_time ?? '';
    partial.interview_end_time = row.interview_end_time ?? '';
  } else if (row.interview_time) {
    partial.interview_start_time = row.interview_time;
    partial.interview_end_time = '';
  }

  // 수행 방법 복원 — 미보유 시 기본값 ONSITE
  const savedMethod = row.company_details?.roadmap_interview_method;
  const validMethods: InterviewMethod[] = ['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER'];
  partial.interview_method = (savedMethod && validMethods.includes(savedMethod as InterviewMethod))
    ? (savedMethod as InterviewMethod)
    : 'ONSITE';

  if (Array.isArray(row.participants)) {
    partial.participants = row.participants as RoadmapParticipant[];
  }

  // 분석 노트 복원 (ISSUE-14: attachment_urls → attachment_files)
  // 신규 attachment_files 객체 배열을 우선 적용. legacy attachment_urls 는 production 0건이라
  // 안전장치로 무시(빈 배열)한다. 파일 메타가 storage_path/file_name 둘 다 있어야 채택.
  const savedAn = row.company_details?.roadmap_analysis_notes;
  if (savedAn) {
    const rawFiles = Array.isArray(savedAn.attachment_files) ? savedAn.attachment_files : [];
    const attachmentFiles: HrdReportAttachment[] = rawFiles
      .filter(
        (f): f is { storage_path: string; file_name: string; mime_type?: string; size?: number; uploaded_at?: string; extracted_text?: string; parse_error?: string } =>
          !!f && typeof f.storage_path === 'string' && typeof f.file_name === 'string',
      )
      .map((f) => ({
        storage_path: f.storage_path,
        file_name: f.file_name,
        mime_type: f.mime_type,
        size: f.size,
        uploaded_at: f.uploaded_at,
        extracted_text: f.extracted_text,
        parse_error: f.parse_error,
      }));
    partial.analysis_notes = {
      text: savedAn.text ?? '',
      attachment_files: attachmentFiles,
    };
  }

  // Ⅰ장 개요 복원 (OFA-06.5 신규)
  const savedOv = row.company_details?.roadmap_overview;
  if (savedOv) {
    const validLevels: AiCompetencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const lvl = savedOv.ai_competency_level;
    const level: AiCompetencyLevel = validLevels.includes(lvl as AiCompetencyLevel)
      ? (lvl as AiCompetencyLevel)
      : 'BEGINNER';
    const att = savedOv.hrd_report_attachment;
    partial.overview = {
      establishment_necessity: savedOv.establishment_necessity ?? '',
      ai_competency_level: level,
      selected_tasks_summary: savedOv.selected_tasks_summary ?? '',
      roadmap_summary: savedOv.roadmap_summary ?? '',
      hrd_report_attachment:
        att && typeof att.storage_path === 'string' && typeof att.file_name === 'string'
          ? {
              storage_path: att.storage_path,
              file_name: att.file_name,
              mime_type: att.mime_type,
              size: att.size,
              uploaded_at: att.uploaded_at,
              extracted_text: att.extracted_text,
              parse_error: att.parse_error,
            }
          : undefined,
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

  // Ⅲ-1 역량 모델링 + NCS 활용 복원 (ISSUE-04 신규)
  const savedCompetencies = row.company_details?.roadmap_competency_models;
  if (Array.isArray(savedCompetencies) && savedCompetencies.length > 0) {
    partial.competency_models = savedCompetencies.map((c) => ({
      id: c.id ?? crypto.randomUUID(),
      competency_name: c.competency_name ?? '',
      competency_definition: c.competency_definition ?? '',
      knowledge: c.knowledge ?? '',
      skill: c.skill ?? '',
      attitude: c.attitude ?? '',
    }));
  }

  const savedNcs = row.company_details?.roadmap_ncs_usage;
  if (savedNcs && typeof savedNcs.uses_ncs === 'boolean') {
    partial.ncs_usage = savedNcs.uses_ncs
      ? { uses_ncs: true, ncs_usage_method: savedNcs.ncs_usage_method ?? '' }
      : {
          uses_ncs: false,
          competency_derivation_method: savedNcs.competency_derivation_method ?? '',
        };
  }

  if (typeof row.notes === 'string') partial.notes = row.notes;

  if (row.stt_insights && typeof row.stt_insights === 'object') {
    partial.stt_insights = row.stt_insights as RoadmapInterview['stt_insights'];
  }

  return partial;
}
