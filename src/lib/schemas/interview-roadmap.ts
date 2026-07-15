/**
 * 산인공 AI훈련로드맵 컨설팅 보고서 (양식 1) 인터뷰 Zod 스키마.
 *
 * 기준 문서: docs/references/2026-04-23-current-fields-inventory.md
 *
 * ============================================================================
 * 섹션 ↔ 필드 매핑 (camelCase 신규 스키마 대상: [인터뷰 입력] / [인터뷰→결과] /
 * [PDF 첨부] 만). Ⅲ-2 훈련체계도 · Ⅲ-3 연간 훈련계획 · Ⅲ-4 훈련과정 상세는
 * [결과·LLM 생성] 이므로 본 스키마 대상이 아니며, Task 2.5 의 결과 페이지
 * 스키마에서 다룬다.
 *
 * | 양식 섹션 | 라벨 | Zod 필드 |
 * |---|---|---|
 * | Ⅰ-1 수립 필요성        | [인터뷰]        | RoadmapOverview.establishmentNecessity |
 * | Ⅰ-2 주요 활동          | [인터뷰]        | RoadmapOverview.performanceActivities[] |
 * | Ⅰ-3 AI 역량 수준       | [인터뷰→결과]   | RoadmapOverview.aiLevel (enum) |
 * | Ⅰ-3 선정 과업          | [인터뷰→결과]   | RoadmapOverview.selectedTask |
 * | Ⅱ-1 HRD이음 PDF        | [PDF 첨부]      | RoadmapRequirements.hrdReportPdf |
 * | Ⅱ-2 기업 요구분석      | [인터뷰]        | RoadmapRequirements.companyRequirements.{status,problem,will,outcomes} |
 * | Ⅱ-3 과업 분석표        | [인터뷰]        | RoadmapRequirements.taskAnalysis[] |
 * | Ⅱ-3 분석내용           | [인터뷰]        | RoadmapRequirements.taskAnalysisNote |
 * | Ⅱ-3 추가 첨부 (선택)   | [인터뷰]        | RoadmapRequirements.taskAnalysisAttachment? |
 * | Ⅱ-4 훈련대상 과업 선정 | [인터뷰]        | RoadmapRequirements.targetTask.{name,reason,expectedAsIs,expectedToBe} |
 * | Ⅲ-1 역량 모델링 표     | [인터뷰→결과]   | RoadmapTrainingInterview.competencies[] |
 * | Ⅲ-1 NCS 박스           | [인터뷰→결과]   | RoadmapTrainingInterview.ncsUsed + ncsMethodology?/ncsDerivationMethod? |
 *
 * ============================================================================
 * 이중 검증 구조:
 * - Strict (최종 제출): `RoadmapInterviewSchema` — 필수 필드 전부 요구.
 * - Loose  (자동 저장): `RoadmapInterviewSchema.partial()` — 모든 최상위 필드
 *   optional. 중간 저장된 JSON을 그대로 수용한다.
 *
 * ============================================================================
 * 마이그레이션 메모:
 * 기존 snake_case 스키마들(`roadmapInterviewSchema`, `overviewSchema`,
 * `companyRequirementsSchema` 등)은 본 파일 하단에 **병존** 상태로 남겨둔다.
 * Task 2.3 (Client 재구현) / Task 2.7 (Server Actions 갱신) 에서 호출부를
 * camelCase 로 이관한 뒤 snake_case 를 제거한다. 본 커밋에서 한꺼번에 교체하면
 * 33개 호출처(인터뷰 Client / 결과 Client / HWPX payload / LLM 서비스)가
 * 동시에 깨지므로 분리 이관 원칙을 따른다.
 */

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

// Ⅱ-3. 과업·워크플로우 분석표 항목 (양식 v2: 6열 → 4열)
// v1 의 problems·data_availability·ai_necessity 3필드가 roadmap_improvement 1필드로
// 통합됐다. roadmap_improvement = "개선점 및 AI 적용 가능성 (데이터 발생 여부 또는 보유현황)"
export const taskWorkflowItemSchema = z.object({
  id: z.string(),
  job: z.string().min(1, '직무를 입력하세요.'),
  task_name: z.string().min(1, '과업명을 입력하세요.'),
  as_is: z.string().min(1, '현행 방식을 입력하세요.'),
  roadmap_improvement: z.string().min(1, '개선점 및 AI 적용 가능성을 입력하세요.'),
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

// 양식 v2 (2026-07-13 개정): Ⅲ-1 역량 모델링·NCS 스텝이 양식에서 통째로 삭제되어
// competencyModelSchema·ncsUsageSchema 는 제거됐다 (Ⅲ장이 훈련과정 명세서 하나로 축소).

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
  participants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        position: z.string().optional(),
      })
    )
    .optional(),
  company_requirements: z
    .object({
      company_status: z.string(),
      main_problems: z.string(),
      push_willingness: z.string(),
      expected_outcomes: z.string(),
    })
    .optional(),
  task_workflow_items: z
    .array(
      z.object({
        id: z.string(),
        job: z.string(),
        task_name: z.string(),
        as_is: z.string(),
        roadmap_improvement: z.string(),
      })
    )
    .optional(),
  analysis_notes: z
    .object({
      text: z.string().default(''),
      attachment_files: z.array(hrdReportAttachmentSchema).default([]),
    })
    .optional(),
  training_targets: z
    .array(
      z.object({
        id: z.string(),
        task_name: z.string(),
        selection_reason: z.string(),
        as_is: z.string(),
        to_be: z.string(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  stt_insights: sttInsightsSchema.optional(),
});

// ============================================================================
// 타입
// ============================================================================

export type Overview = z.infer<typeof overviewSchema>;
export type TaskWorkflowItem = z.infer<typeof taskWorkflowItemSchema>;
export type TrainingTarget = z.infer<typeof trainingTargetSchema>;
export type RoadmapParticipant = z.infer<typeof roadmapParticipantSchema>;
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

export function createEmptyTaskWorkflowItem(): TaskWorkflowItem {
  return {
    id: crypto.randomUUID(),
    job: '',
    task_name: '',
    as_is: '',
    roadmap_improvement: '',
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
  // 양식 v2: Ⅲ-1 역량 모델링(roadmap_competency_models)·NCS(roadmap_ncs_usage) 는
  // 삭제됐다. 레거시 row 에 값이 남아 있어도 더 이상 읽지 않는다.
  // ISSUE-10 Step C-2: 시작/종료 시간 정식 저장 (JSONB).
  //   `interview_time` 단일 컬럼은 시작 시간만 legacy 호환용으로 함께 저장.
  roadmap_interview_time?: {
    start?: string;
    end?: string;
  } | null;
}

interface LegacyJobTask {
  id?: string;
  task_name?: string;
  task_description?: string;
  roadmap_job?: string;
  // v2 신규 통합 필드 (개선점 및 AI 적용 가능성)
  roadmap_improvement?: string;
  // v1 하위호환 — roadmap_improvement 가 없을 때 아래 3필드를 라벨과 함께 승격
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

/**
 * v1 과업 3필드(문제점·데이터발생시점·AI필요도) → v2 roadmap_improvement 1필드 승격.
 *
 * 운영 DB 에 v1 데이터가 실재하므로, roadmap_improvement 가 없으면 구 3필드를 라벨과
 * 함께 합성한다. 빈 값은 건너뛴다. (converters.ts 의 promoteLegacyTaskImprovement 와
 * 동일한 합성 규칙 — 두 경로가 동일 문자열을 LLM/요약에 전달하도록 통일)
 */
function promoteLegacyTaskImprovement(t: LegacyJobTask): string {
  if (typeof t.roadmap_improvement === 'string' && t.roadmap_improvement.trim() !== '') {
    return t.roadmap_improvement;
  }
  const parts: string[] = [];
  if (t.roadmap_problems?.trim()) parts.push(`문제점: ${t.roadmap_problems.trim()}`);
  if (t.roadmap_data_availability?.trim()) {
    parts.push(`데이터 발생 시점/보유현황: ${t.roadmap_data_availability.trim()}`);
  }
  const score = t.roadmap_ai_necessity;
  if (score !== undefined && score !== null && `${score}`.trim() !== '') {
    parts.push(`AI 도입·활용 필요도: ${score}`);
  }
  return parts.join('\n');
}

export function mapInterviewRowToRoadmapInterview(
  row: LegacyInterviewRow | null
): Partial<RoadmapInterview> {
  if (!row) return {};

  const partial: Partial<RoadmapInterview> = {};

  if (row.interview_date) partial.interview_date = row.interview_date;
  if (typeof row.interview_round === 'number') partial.interview_round = row.interview_round;

  // ISSUE-10 Step C-2: 시간 필드 매핑 우선순위.
  //   1) company_details.roadmap_interview_time JSONB { start, end } — 정식 저장 경로
  //   2) interview_start_time / interview_end_time 컬럼 — 향후 마이그 대비 hook
  //   3) legacy 단일 interview_time 컬럼 → start 로 fallback (production 3건 호환)
  const savedTime = row.company_details?.roadmap_interview_time;
  if (savedTime?.start || savedTime?.end) {
    partial.interview_start_time = savedTime.start ?? '';
    partial.interview_end_time = savedTime.end ?? '';
  } else if (row.interview_start_time || row.interview_end_time) {
    partial.interview_start_time = row.interview_start_time ?? '';
    partial.interview_end_time = row.interview_end_time ?? '';
  } else if (row.interview_time) {
    partial.interview_start_time = row.interview_time;
    partial.interview_end_time = '';
  }

  // 수행 방법 복원 — 미보유 시 기본값 ONSITE
  const savedMethod = row.company_details?.roadmap_interview_method;
  const validMethods: InterviewMethod[] = ['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER'];
  partial.interview_method =
    savedMethod && validMethods.includes(savedMethod as InterviewMethod)
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
        (
          f
        ): f is {
          storage_path: string;
          file_name: string;
          mime_type?: string;
          size?: number;
          uploaded_at?: string;
          extracted_text?: string;
          parse_error?: string;
        } => !!f && typeof f.storage_path === 'string' && typeof f.file_name === 'string'
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
      // v2: "분석내용"(text) 표가 양식에서 삭제되어 레거시 text 는 더 이상 승격하지 않는다.
      // 추가 첨부(attachment_files) 는 LLM 설계 참고용으로 유지한다.
      text: '',
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
      // v2: improvement 우선, 없으면 v1 3필드 승격 (운영 DB 호환)
      roadmap_improvement: promoteLegacyTaskImprovement(t),
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

  // 양식 v2: Ⅲ-1 역량 모델링(competency_models)·NCS(ncs_usage) 복원 로직은 삭제됐다
  // (양식에서 표가 통째로 사라짐). 레거시 row 에 값이 남아 있어도 반환하지 않는다.

  if (typeof row.notes === 'string') partial.notes = row.notes;

  if (row.stt_insights && typeof row.stt_insights === 'object') {
    partial.stt_insights = row.stt_insights as RoadmapInterview['stt_insights'];
  }

  return partial;
}

// ============================================================================
// PR #2 Task 2.1 — 양식 1:1 정합 신규 스키마 (camelCase)
// ----------------------------------------------------------------------------
// 기준 문서 양식 1 Ⅰ·Ⅱ·Ⅲ-1 을 1:1 로 정합하는 신규 스키마. 파일 상단 주석의
// 섹션 ↔ 필드 매핑표 참고. 기존 snake_case 스키마와 병존 (Task 2.3/2.7 이관 시 제거).
// ============================================================================

// -- Ⅰ-2 주요 활동 행 ---------------------------------------------------------
// 양식은 1차/2차/3차 × (수행일시·수행내용·수행방법·PM·내부전문가) 2행×6열 병합.
// 각 차수는 UI상 1 row 로 표현되며, 본 스키마는 1 row = 1 객체로 저장한다.
export const RoadmapPerformanceActivitySchema = z.object({
  round: z.number().int().min(1, '차수는 1 이상이어야 합니다.'),
  date: z.string(), // 'YYYY-MM-DD' 또는 양식 표기 '26.00.00'
  timeRange: z.string(), // 'HH:mm~HH:mm'
  content: z.string(),
  method: z.string(), // ONSITE | VIDEO | WORKSHOP | OTHER (기존 interviewMethodEnum 와 호환)
  pmName: z.string(),
  expertName: z.string(),
});
export type RoadmapPerformanceActivity = z.infer<typeof RoadmapPerformanceActivitySchema>;

// -- Ⅰ 개요 -------------------------------------------------------------------
// aiLevel 은 기존 AI_COMPETENCY_LEVEL 과 동일 enum (BEGINNER|INTERMEDIATE|ADVANCED).
// 양식 Ⅰ-3 의 "AI훈련로드맵 수립 주요내용 요약" 은 결과 페이지에서 LLM 자동 생성
// 되므로 본 인터뷰 스키마에서는 다루지 않는다.
export const RoadmapOverviewSchema = z.object({
  establishmentNecessity: z.string().min(1, '수립 필요성을 입력하세요 (5줄 내외).'),
  performanceActivities: z
    .array(RoadmapPerformanceActivitySchema)
    .max(5, '주요 활동은 최대 5차까지 입력할 수 있습니다.'),
  aiLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  selectedTask: z.string().min(1, '선정 과업을 입력하세요.'),
});

// -- Ⅱ-1 HRD이음 진단 보고서 PDF ---------------------------------------------
// 파일 업로드 후 Storage (interview-attachments 버킷) 에서 반환된 메타를 보관.
// 신규 명명 — fileName / url / size. (기존 hrdReportAttachmentSchema 와 구조 상이.)
//
// **내부 전용 필드 (UI 노출 금지)**
//   - extractedText: upload Action 이 PDF 파싱하여 주입. Task 2.9/2.10 LLM 프롬프트가 읽는다.
//   - parseError   : 업로드/파싱 실패 시 사유. LLM 프롬프트에 사유 표출.
// 두 필드는 Server Action 경계(save/fetch)에서 DB 의 extracted_text / parse_error 와
// 왕복 보존된다. Client 컴포넌트는 이 필드를 렌더링하지 않는다.
export const RoadmapHrdReportPdfSchema = z.object({
  fileName: z.string().min(1),
  url: z.string().min(1),
  size: z.number().nonnegative(),
  /** LLM 내부용 (UI 노출 금지). upload Action 이 PDF 파싱하여 주입. */
  extractedText: z.string().optional(),
  /** upload/파싱 실패 시 에러 메시지 (UI 노출 금지). */
  parseError: z.string().optional(),
});
export type RoadmapHrdReportPdf = z.infer<typeof RoadmapHrdReportPdfSchema>;

// -- Ⅱ-2 기업 요구분석 --------------------------------------------------------
// 양식 비고 칼럼 = 행별 사용자 입력란 (#6 fix). 4개 행마다 옵셔널 비고를 보관한다.
export const RoadmapCompanyRequirementsRemarksSchema = z.object({
  status: z.string().optional(),
  problem: z.string().optional(),
  will: z.string().optional(),
  outcomes: z.string().optional(),
});
export type RoadmapCompanyRequirementsRemarks = z.infer<
  typeof RoadmapCompanyRequirementsRemarksSchema
>;

export const RoadmapCompanyRequirementsSchema = z.object({
  status: z.string().min(1, '기업 현황을 입력하세요.'),
  problem: z.string().min(1, '주요 문제를 입력하세요.'),
  will: z.string().min(1, '추진 의지를 입력하세요.'),
  outcomes: z.string().min(1, '기대 성과를 입력하세요.'),
  remarks: RoadmapCompanyRequirementsRemarksSchema.optional(),
});
export type RoadmapCompanyRequirements = z.infer<typeof RoadmapCompanyRequirementsSchema>;

// -- Ⅱ-3 과업·워크플로우 분석표 (양식 v2: 6열 → 4열) ------------------------
// v1 의 problem·dataTiming·aiScore 3열이 improvement 1열로 통합됐다.
//   improvement = "개선점 및 AI 적용 가능성 (데이터 발생 여부 또는 보유현황)"
export const RoadmapTaskAnalysisItemSchema = z.object({
  domain: z.string().min(1, '직무를 입력하세요.'),
  task: z.string().min(1, '과업을 입력하세요.'),
  asIs: z.string().min(1, '현행 방식(As-Is)을 입력하세요.'),
  improvement: z.string().min(1, '개선점 및 AI 적용 가능성을 입력하세요.'),
});
export type RoadmapTaskAnalysisItem = z.infer<typeof RoadmapTaskAnalysisItemSchema>;

// -- Ⅱ-3 추가 첨부 (선택) ----------------------------------------------------
// 분석 노트 추가 첨부도 Ⅱ-1 HRD PDF 와 동일한 내부 필드(extractedText/parseError)를
// 공유한다. upload Action 이 파싱 결과를 주입하면 Server Action 이 DB 의
// attachment_files[0].extracted_text / parse_error 와 왕복 보존한다.
export const RoadmapTaskAnalysisAttachmentSchema = z.object({
  fileName: z.string().min(1),
  url: z.string().min(1),
  /** LLM 내부용 (UI 노출 금지). upload Action 이 파싱하여 주입. */
  extractedText: z.string().optional(),
  /** upload/파싱 실패 시 에러 메시지 (UI 노출 금지). */
  parseError: z.string().optional(),
});
export type RoadmapTaskAnalysisAttachment = z.infer<typeof RoadmapTaskAnalysisAttachmentSchema>;

// -- Ⅱ-4 훈련대상 과업 선정 --------------------------------------------------
export const RoadmapTargetTaskSchema = z.object({
  name: z.string().min(1, '훈련대상 과업명을 입력하세요.'),
  reason: z.string().min(1, '선정 사유를 입력하세요.'),
  expectedAsIs: z.string().min(1, '기대효과 — 현행(As-Is)을 입력하세요.'),
  expectedToBe: z.string().min(1, '기대효과 — 개선(To-Be)을 입력하세요.'),
});
export type RoadmapTargetTask = z.infer<typeof RoadmapTargetTaskSchema>;

// -- Ⅱ 요구분석 -------------------------------------------------------------
export const RoadmapRequirementsSchema = z.object({
  // HRD이음 PDF — 미첨부 허용. PBL 측 hrdReportPdf 와 동일하게 키 자체 누락
  // (undefined) 도 허용하기 위해 nullish() 사용 (production 인터뷰 폼이
  // 미첨부 시 키를 omit 해 저장하므로 nullable 만으로는 Required 오류 발생).
  hrdReportPdf: RoadmapHrdReportPdfSchema.nullish(),
  companyRequirements: RoadmapCompanyRequirementsSchema,
  taskAnalysis: z.array(RoadmapTaskAnalysisItemSchema).min(1, '최소 1개 이상의 과업을 분석하세요.'),
  // v2: "분석내용"(taskAnalysisNote) 표는 양식에서 삭제됨. 추가 업로드 자료 첨부는 유지.
  taskAnalysisAttachment: RoadmapTaskAnalysisAttachmentSchema.nullable().optional(),
  targetTask: RoadmapTargetTaskSchema,
});

// -- 통합 스키마: Ⅰ + Ⅱ ------------------------------------------------------
// v2 에서 Ⅲ-1 역량 모델링·NCS 스텝이 양식에서 삭제되어 인터뷰에서도 제거됐다.
// RoadmapInterviewSchema 는 plain `z.object()` (ZodObject) 형태로 유지해
// 최종 제출 / 자동 저장 양쪽에서 재사용할 수 있게 한다.
export const RoadmapInterviewSchema = RoadmapOverviewSchema.merge(RoadmapRequirementsSchema)
  // STT 인사이트(선택) — 마지막 Step "인터뷰 녹취 STT 첨부" 추출 결과.
  // optional 이라 strict 제출에 영향 없음. 자동저장은 부분 입력 그대로 보존.
  .extend({ sttInsights: sttInsightsSchema.optional() });
export type RoadmapInterviewStrict = z.infer<typeof RoadmapInterviewSchema>;

// V2 camelCase autoSave 전용 (#011 fix).
//
// `RoadmapInterviewSchema.partial()` 은 shallow 라 nested 객체/배열의 inner schema
// 가 그대로 strict 로 남는다. zod 의 `.partial()` 은 필드를 optional 로 만들 뿐
// 값이 존재하면 여전히 `.min(1)` 등 inner 제약이 적용된다. UI 가 mount 시
// prefilled 로 넣는 빈 행/슬롯 (companyRequirements 의 빈 4 필드, taskAnalysis 의
// 빈 행, competencies 의 빈 행, targetTask 의 빈 4 필드, 빈 배열) 이 자동저장
// partial 검증에서 fail → `{ success: false, error: ... }` 반환 → 클라이언트
// 라벨 "저장 실패" 영구 고착의 silent fail.
//
// 본 schema 는 nested string 까지 모두 `.optional()` 로 재정의 (빈 string 도
// 통과) + 모든 배열의 `.min(1)` 제거 + 빈 배열 허용 + element 의 빈 필드도 통과.
// 최종 제출은 `RoadmapInterviewStrictSchema` 가 책임. mapping 함수
// (`mapRoadmapInterviewToDb` in converters.ts) 는 모든 필드에 fallback 기본값
// 주입을 이미 처리한다. `aiScore` 등 enum/range 는 값이 들어왔을 때만 검증되어
// type-safety 는 유지.
const RoadmapPerformanceActivityAutoSaveSchema = z.object({
  round: z.number().int().min(1).optional(),
  date: z.string().optional(),
  timeRange: z.string().optional(),
  content: z.string().optional(),
  method: z.string().optional(),
  pmName: z.string().optional(),
  expertName: z.string().optional(),
});

const RoadmapCompanyRequirementsAutoSaveSchema = z.object({
  status: z.string().optional(),
  problem: z.string().optional(),
  will: z.string().optional(),
  outcomes: z.string().optional(),
});

const RoadmapTaskAnalysisItemAutoSaveSchema = z.object({
  domain: z.string().optional(),
  task: z.string().optional(),
  asIs: z.string().optional(),
  improvement: z.string().optional(),
});

const RoadmapTargetTaskAutoSaveSchema = z.object({
  name: z.string().optional(),
  reason: z.string().optional(),
  expectedAsIs: z.string().optional(),
  expectedToBe: z.string().optional(),
});

export const RoadmapInterviewAutoSaveSchema = z.object({
  // Ⅰ 개요
  establishmentNecessity: z.string().optional(),
  performanceActivities: z.array(RoadmapPerformanceActivityAutoSaveSchema).optional(),
  aiLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  selectedTask: z.string().optional(),
  // Ⅱ 요구분석
  hrdReportPdf: RoadmapHrdReportPdfSchema.partial().nullable().optional(),
  companyRequirements: RoadmapCompanyRequirementsAutoSaveSchema.optional(),
  taskAnalysis: z.array(RoadmapTaskAnalysisItemAutoSaveSchema).optional(),
  taskAnalysisAttachment: RoadmapTaskAnalysisAttachmentSchema.partial().nullable().optional(),
  targetTask: RoadmapTargetTaskAutoSaveSchema.optional(),
  // STT 인사이트(선택) — 마지막 Step. 자동저장 경로에서 sttInsights JSON 보존.
  sttInsights: sttInsightsSchema.optional(),
});

// 엄격 스키마 (최종 제출 경계에서 사용).
// v2 에서 NCS XOR 검증이 삭제되어 통합 스키마와 동일하지만, 호출부 호환을 위해
// 별도 export 를 유지한다 (향후 제출 전용 refine 이 필요하면 여기에 부착).
export const RoadmapInterviewStrictSchema = RoadmapInterviewSchema;
