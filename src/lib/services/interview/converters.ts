/**
 * 인터뷰 camelCase 스키마 ↔ DB snake_case 컬럼 converter
 *
 * Task 2.7-b (PR #2) — 신규 camelCase Zod 스키마(Task 2.1/2.2) 와 기존
 * interviews 테이블(snake_case JSONB 경로) 간 변환을 Server Action 경계에서
 * 수행한다. 기존 snake_case 스키마(roadmapInterviewSchema / pblInterviewSchema)
 * 계열은 병존(Task 2.11 cleanup 에서 제거).
 *
 * ── 매핑 원칙 (Task 2.7-a 리포트) ─────────────────────────────────────────
 *   overview.establishmentNecessity     → company_details.roadmap_overview.establishment_necessity
 *   overview.performanceActivities[]    → company_details.roadmap_overview.performance_activities  ★신규
 *   overview.aiLevel                    → company_details.roadmap_overview.ai_competency_level
 *   overview.selectedTask               → company_details.roadmap_overview.selected_tasks_summary
 *   requirements.hrdReportPdf           → company_details.roadmap_overview.hrd_report_attachment
 *     · fileName       ↔ file_name
 *     · url            ↔ storage_path
 *     · size           ↔ size
 *     · extractedText  ↔ extracted_text  (LLM 내부용, UI 노출 금지)
 *     · parseError     ↔ parse_error     (LLM 내부용, UI 노출 금지)
 *     · mime_type / uploaded_at 는 DB 전용 메타 (camelCase 미노출)
 *   requirements.companyRequirements.{status/problem/will/outcomes}
 *     ↔ company_details.roadmap_company_requirements.{company_status/main_problems/push_willingness/expected_outcomes}
 *   requirements.taskAnalysis[]         → interviews.job_tasks[] (legacy 필드명)
 *     · domain      ↔ roadmap_job
 *     · task        ↔ task_name
 *     · asIs        ↔ task_description
 *     · problem     ↔ roadmap_problems
 *     · dataTiming  ↔ roadmap_data_availability
 *     · aiScore     ↔ roadmap_ai_necessity
 *   requirements.taskAnalysisNote       → company_details.roadmap_analysis_notes.text
 *   requirements.taskAnalysisAttachment ↔ company_details.roadmap_analysis_notes.attachment_files[0] (단일)
 *   requirements.targetTask             ↔ interviews.improvement_goals[0] (단일 배열 원소)
 *     · name         ↔ kpi
 *     · reason       ↔ goal_description
 *     · expectedAsIs ↔ roadmap_as_is
 *     · expectedToBe ↔ roadmap_to_be
 *   training.competencies[]             → company_details.roadmap_competency_models
 *     · name       ↔ competency_name
 *     · definition ↔ competency_definition
 *     · knowledge/skill/attitude 동일
 *   training.ncsUsed + ncsMethodology/ncsDerivationMethod
 *     ↔ company_details.roadmap_ncs_usage.{uses_ncs/ncs_usage_method/competency_derivation_method}
 *   sttInsights (선택) ↔ interviews.stt_insights (JSONB 컬럼 직저장)
 *     · 6 카테고리(추가_업무·추가_페인포인트·숨은_니즈·조직_맥락·AI_태도·주요_인용)
 *       를 camelCase 스키마의 동일 키 그대로 보존. snake_case 별도 변환 없음
 *       (한국어 키라 케이스 변환 무의미). LLM 프롬프트는 buildSttInsightsSection
 *       이 stt_insights/sttInsights 둘 다 인식.
 *
 * ── PBL ─────────────────────────────────────────────────────────────────
 * PBL 은 `interviews.pbl_data` JSONB 하나에 camelCase 를 그대로 저장한다.
 * 기존 snake_case PBL 스키마(pblInterviewSchema)와 키가 겹치지 않으므로
 * Task 2.4/2.11 에서 기존 Client 가 제거될 때까지 병존 가능.
 */

import type {
  RoadmapInterviewStrict,
  RoadmapTaskAnalysisItem,
  RoadmapPerformanceActivity,
  RoadmapCompanyRequirements,
  RoadmapHrdReportPdf,
  RoadmapTaskAnalysisAttachment,
  RoadmapTargetTask,
  SttInsights,
} from '@/lib/schemas/interview-roadmap';
import type {
  PBLInterviewStrict,
  PBLTrainingEnv,
  PBLProblemDefinitionSheet,
} from '@/lib/schemas/interview-pbl';

// ============================================================================
// 내부 DB 타입 (interviews 테이블 JSONB 경로 — snake_case)
// ----------------------------------------------------------------------------
// 기존 `mapInterviewRowToRoadmapInterview` 의 LegacyCompanyDetails 와 축을
//공유하되, Task 2.7-a 에서 확정된 신규 키(performance_activities 등)를 포함한
// 더 완전한 타입을 정의한다. Task 2.11 cleanup 시 양쪽을 통합한다.
// ============================================================================

interface DbHrdReportAttachment {
  file_name: string;
  storage_path: string;
  mime_type?: string;
  size?: number;
  uploaded_at?: string;
  extracted_text?: string;
  parse_error?: string;
}

interface DbPerformanceActivity {
  round: number;
  date: string;
  time_range: string;
  content: string;
  method: string;
  pm_name: string;
  expert_name: string;
}

interface DbRoadmapOverview {
  establishment_necessity: string;
  performance_activities: DbPerformanceActivity[];
  ai_competency_level: string;
  selected_tasks_summary: string;
  hrd_report_attachment: DbHrdReportAttachment | null;
}

interface DbRoadmapCompanyRequirementsRemarks {
  status?: string;
  problem?: string;
  will?: string;
  outcomes?: string;
}

interface DbRoadmapCompanyRequirements {
  company_status: string;
  main_problems: string;
  push_willingness: string;
  expected_outcomes: string;
  /** 행별 비고 (#6 fix). JSONB 임의 키 — DB 컬럼 추가 불필요. */
  remarks?: DbRoadmapCompanyRequirementsRemarks;
}

interface DbRoadmapAnalysisNotes {
  text: string;
  attachment_files: DbHrdReportAttachment[];
}

export interface RoadmapInterviewDbUpdate {
  company_details: {
    roadmap_overview: DbRoadmapOverview;
    roadmap_company_requirements: DbRoadmapCompanyRequirements;
    roadmap_analysis_notes: DbRoadmapAnalysisNotes;
  };
  job_tasks: Array<{
    roadmap_job: string;
    task_name: string;
    task_description: string;
    roadmap_improvement: string;
  }>;
  improvement_goals: Array<{
    kpi: string;
    goal_description: string;
    roadmap_as_is: string;
    roadmap_to_be: string;
  }>;
  // STT 인사이트 — interviews.stt_insights 컬럼(JSONB)에 직저장.
  // camelCase 스키마의 sttInsights 와 동일 구조를 그대로 보존(키도 동일).
  stt_insights: SttInsights | null;
}

// ============================================================================
// 로드맵 — camelCase → DB
// ============================================================================

// ----------------------------------------------------------------------------
// HRD PDF / 분석노트 첨부 camelCase ↔ snake_case 왕복
// ----------------------------------------------------------------------------
// 내부 전용 필드(extractedText/parseError) 는 LLM 프롬프트(Task 2.9/2.10) 가
// 읽어야 하므로 DB 의 extracted_text / parse_error 와 왕복 보존한다. UI 컴포넌트
// 는 이 필드를 렌더링하지 않는다 (Client 이관 Task 2.3-a~d 담당자 주의).
function hrdPdfToDb(pdf: RoadmapHrdReportPdf | null): DbHrdReportAttachment | null {
  if (!pdf) return null;
  const base: DbHrdReportAttachment = {
    file_name: pdf.fileName,
    storage_path: pdf.url,
    size: pdf.size,
  };
  if (pdf.extractedText !== undefined) base.extracted_text = pdf.extractedText;
  if (pdf.parseError !== undefined) base.parse_error = pdf.parseError;
  return base;
}

function attachmentToDb(
  a: RoadmapTaskAnalysisAttachment | null | undefined
): DbHrdReportAttachment | null {
  if (!a) return null;
  const base: DbHrdReportAttachment = {
    file_name: a.fileName,
    storage_path: a.url,
  };
  if (a.extractedText !== undefined) base.extracted_text = a.extractedText;
  if (a.parseError !== undefined) base.parse_error = a.parseError;
  return base;
}

function performanceActivityToDb(a: RoadmapPerformanceActivity): DbPerformanceActivity {
  return {
    round: a.round,
    date: a.date,
    time_range: a.timeRange,
    content: a.content,
    method: a.method,
    pm_name: a.pmName,
    expert_name: a.expertName,
  };
}

function taskAnalysisItemToDb(t: RoadmapTaskAnalysisItem): {
  roadmap_job: string;
  task_name: string;
  task_description: string;
  roadmap_improvement: string;
} {
  return {
    roadmap_job: t.domain,
    task_name: t.task,
    task_description: t.asIs,
    // v2: 문제점·데이터발생시점·AI필요도 3필드가 개선점 1필드로 통합됨
    roadmap_improvement: t.improvement,
  };
}

function companyRequirementsToDb(cr: RoadmapCompanyRequirements): DbRoadmapCompanyRequirements {
  const result: DbRoadmapCompanyRequirements = {
    company_status: cr.status,
    main_problems: cr.problem,
    push_willingness: cr.will,
    expected_outcomes: cr.outcomes,
  };
  if (cr.remarks) {
    const remarks: DbRoadmapCompanyRequirementsRemarks = {};
    if (cr.remarks.status !== undefined) remarks.status = cr.remarks.status;
    if (cr.remarks.problem !== undefined) remarks.problem = cr.remarks.problem;
    if (cr.remarks.will !== undefined) remarks.will = cr.remarks.will;
    if (cr.remarks.outcomes !== undefined) remarks.outcomes = cr.remarks.outcomes;
    if (Object.keys(remarks).length > 0) result.remarks = remarks;
  }
  return result;
}

function targetTaskToDb(t: RoadmapTargetTask): {
  kpi: string;
  goal_description: string;
  roadmap_as_is: string;
  roadmap_to_be: string;
} {
  return {
    kpi: t.name,
    goal_description: t.reason,
    roadmap_as_is: t.expectedAsIs,
    roadmap_to_be: t.expectedToBe,
  };
}

/**
 * camelCase 로드맵 인터뷰 (신규 Zod) → DB interviews 행 update payload.
 *
 * Partial 입력도 허용(자동 저장 경로)하므로 모든 필드 접근을 optional 로 처리한다.
 * 누락된 필드는 DB 기본값(빈 문자열/빈 배열)으로 채운다.
 */
export function mapRoadmapInterviewToDb(
  data: Partial<RoadmapInterviewStrict>
): RoadmapInterviewDbUpdate {
  const attachment = attachmentToDb(data.taskAnalysisAttachment ?? null);
  const attachmentFiles: DbHrdReportAttachment[] = attachment ? [attachment] : [];

  return {
    company_details: {
      roadmap_overview: {
        establishment_necessity: data.establishmentNecessity ?? '',
        performance_activities: (data.performanceActivities ?? []).map(performanceActivityToDb),
        ai_competency_level: data.aiLevel ?? 'BEGINNER',
        selected_tasks_summary: data.selectedTask ?? '',
        hrd_report_attachment: hrdPdfToDb(data.hrdReportPdf ?? null),
      },
      roadmap_company_requirements: companyRequirementsToDb(
        data.companyRequirements ?? { status: '', problem: '', will: '', outcomes: '' }
      ),
      // v2: "분석내용" 표는 양식에서 삭제되었으나, 추가 업로드 자료 첨부는 유지된다.
      // text 는 더 이상 입력받지 않으므로 빈 문자열로 저장한다.
      roadmap_analysis_notes: {
        text: '',
        attachment_files: attachmentFiles,
      },
    },
    job_tasks: (data.taskAnalysis ?? []).map(taskAnalysisItemToDb),
    improvement_goals: data.targetTask ? [targetTaskToDb(data.targetTask)] : [],
    stt_insights: data.sttInsights ?? null,
  };
}

// ============================================================================
// 로드맵 — DB → camelCase
// ============================================================================

interface DbRoadmapInterviewRow {
  interview_date?: string | null;
  company_details?: {
    roadmap_overview?: {
      establishment_necessity?: string;
      performance_activities?: Array<{
        round?: number;
        date?: string;
        time_range?: string;
        content?: string;
        method?: string;
        pm_name?: string;
        expert_name?: string;
      }>;
      ai_competency_level?: string;
      selected_tasks_summary?: string;
      hrd_report_attachment?: {
        file_name?: string;
        storage_path?: string;
        mime_type?: string;
        size?: number;
        uploaded_at?: string;
        extracted_text?: string;
        parse_error?: string;
      } | null;
    } | null;
    roadmap_company_requirements?: {
      company_status?: string;
      main_problems?: string;
      push_willingness?: string;
      expected_outcomes?: string;
      remarks?: {
        status?: string;
        problem?: string;
        will?: string;
        outcomes?: string;
      };
    } | null;
    roadmap_analysis_notes?: {
      text?: string;
      attachment_files?: Array<{
        file_name?: string;
        storage_path?: string;
        mime_type?: string;
        size?: number;
        uploaded_at?: string;
        extracted_text?: string;
        parse_error?: string;
      }>;
    } | null;
    roadmap_competency_models?: Array<{
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
  } | null;
  job_tasks?: Array<{
    roadmap_job?: string;
    task_name?: string;
    task_description?: string;
    // v2 신규 통합 필드
    roadmap_improvement?: string;
    // v1 하위호환 (읽기 시 roadmap_improvement 로 승격)
    roadmap_problems?: string;
    roadmap_data_availability?: string;
    roadmap_ai_necessity?: number | string;
  }> | null;
  improvement_goals?: Array<{
    kpi?: string;
    goal_description?: string;
    roadmap_as_is?: string;
    roadmap_to_be?: string;
  }> | null;
  stt_insights?: SttInsights | null;
}

/**
 * v1 과업 3필드(문제점·데이터발생시점·AI필요도) → v2 improvement 1필드 승격.
 *
 * 운영 DB 에 v1 데이터가 실재하므로, roadmap_improvement 가 없으면 구 3필드를
 * 라벨과 함께 합성한다. 빈 값은 건너뛴다. (roadmap-storage-mapper 의
 * promoteLegacyNcs 와 동일한 "구 키 → 신 키 승격" 패턴)
 */
function promoteLegacyTaskImprovement(t: {
  roadmap_improvement?: string;
  roadmap_problems?: string;
  roadmap_data_availability?: string;
  roadmap_ai_necessity?: number | string;
}): string {
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

function coerceAiLevel(v: string | undefined): RoadmapInterviewStrict['aiLevel'] {
  if (v === 'INTERMEDIATE' || v === 'ADVANCED' || v === 'BEGINNER') return v;
  return 'BEGINNER';
}

function dbHrdToPdf(
  att:
    | {
        file_name?: string;
        storage_path?: string;
        mime_type?: string;
        size?: number;
        uploaded_at?: string;
        extracted_text?: string;
        parse_error?: string;
      }
    | null
    | undefined
): RoadmapHrdReportPdf | null {
  if (!att || typeof att !== 'object') return null;
  if (!att.file_name || !att.storage_path) return null;
  const result: RoadmapHrdReportPdf = {
    fileName: att.file_name,
    url: att.storage_path,
    size: typeof att.size === 'number' ? att.size : 0,
  };
  if (att.extracted_text !== undefined) result.extractedText = att.extracted_text;
  if (att.parse_error !== undefined) result.parseError = att.parse_error;
  return result;
}

function dbToAttachment(
  row:
    | {
        file_name?: string;
        storage_path?: string;
        extracted_text?: string;
        parse_error?: string;
      }
    | null
    | undefined
): RoadmapTaskAnalysisAttachment | undefined {
  if (!row || !row.file_name || !row.storage_path) return undefined;
  const result: RoadmapTaskAnalysisAttachment = {
    fileName: row.file_name,
    url: row.storage_path,
  };
  if (row.extracted_text !== undefined) result.extractedText = row.extracted_text;
  if (row.parse_error !== undefined) result.parseError = row.parse_error;
  return result;
}

/**
 * DB interviews 행 → camelCase 로드맵 인터뷰 (신규 Zod Partial).
 *
 * 부분 입력 row 에도 안전하게 동작 (모든 필드 optional). 누락된 필드는 빈 기본값.
 * HRD PDF 의 extracted_text / parse_error 는 LLM 내부 전용이므로 camelCase 에
 * 노출하지 않는다.
 */
export function mapDbToRoadmapInterview(
  row: DbRoadmapInterviewRow | null
): Partial<RoadmapInterviewStrict> {
  if (!row) {
    return {
      establishmentNecessity: '',
      performanceActivities: [],
      aiLevel: 'BEGINNER',
      selectedTask: '',
      hrdReportPdf: null,
      companyRequirements: { status: '', problem: '', will: '', outcomes: '' },
      taskAnalysis: [],
    };
  }

  const cd = row.company_details ?? {};
  const ov = cd.roadmap_overview ?? {};
  const cr = cd.roadmap_company_requirements ?? {};
  const an = cd.roadmap_analysis_notes ?? {};

  const performanceActivities: RoadmapPerformanceActivity[] = (ov.performance_activities ?? [])
    .filter((a) => !!a)
    .map((a) => ({
      round: typeof a.round === 'number' ? a.round : 1,
      date: a.date ?? '',
      timeRange: a.time_range ?? '',
      content: a.content ?? '',
      method: a.method ?? 'ONSITE',
      pmName: a.pm_name ?? '',
      expertName: a.expert_name ?? '',
    }));

  const taskAnalysis: RoadmapTaskAnalysisItem[] = (row.job_tasks ?? [])
    .filter((t) => !!t)
    .map((t) => ({
      domain: t.roadmap_job ?? '',
      task: t.task_name ?? '',
      asIs: t.task_description ?? '',
      // v2 improvement 우선, 없으면 v1 3필드 승격 (운영 DB 호환)
      improvement: promoteLegacyTaskImprovement(t),
    }));

  const attachmentFiles = Array.isArray(an.attachment_files) ? an.attachment_files : [];
  const taskAnalysisAttachment = dbToAttachment(attachmentFiles[0]);

  const improvementFirst = (row.improvement_goals ?? [])[0];
  const targetTask: RoadmapTargetTask | undefined = improvementFirst
    ? {
        name: improvementFirst.kpi ?? '',
        reason: improvementFirst.goal_description ?? '',
        expectedAsIs: improvementFirst.roadmap_as_is ?? '',
        expectedToBe: improvementFirst.roadmap_to_be ?? '',
      }
    : undefined;

  const result: Partial<RoadmapInterviewStrict> = {
    establishmentNecessity: ov.establishment_necessity ?? '',
    performanceActivities,
    aiLevel: coerceAiLevel(ov.ai_competency_level),
    selectedTask: ov.selected_tasks_summary ?? '',
    hrdReportPdf: dbHrdToPdf(ov.hrd_report_attachment ?? null),
    companyRequirements: {
      status: cr.company_status ?? '',
      problem: cr.main_problems ?? '',
      will: cr.push_willingness ?? '',
      outcomes: cr.expected_outcomes ?? '',
      ...(cr.remarks ? { remarks: { ...cr.remarks } } : {}),
    },
    taskAnalysis,
  };

  if (taskAnalysisAttachment) {
    result.taskAnalysisAttachment = taskAnalysisAttachment;
  }
  if (targetTask) {
    result.targetTask = targetTask;
  }

  // STT 인사이트 — interviews.stt_insights 컬럼이 채워져 있을 때만 camelCase
  // sttInsights 키를 노출. null/undefined 면 키 자체를 결과에 두지 않는다
  // (Partial<RoadmapInterviewStrict> 의 optional 의미 보존).
  if (row.stt_insights) {
    result.sttInsights = row.stt_insights;
  }

  return result;
}

// ============================================================================
// PBL — camelCase ↔ DB (pbl_data JSONB 통째)
// ============================================================================

export interface PBLInterviewDbUpdate {
  pbl_data: Record<string, unknown>;
}

/**
 * camelCase PBL 인터뷰 → DB interviews.pbl_data JSONB update payload.
 *
 * 기존 snake_case pblInterviewSchema 와 키 충돌이 없고 HWPX/LLM 경로도 camelCase
 * 를 직접 소비할 예정이므로 변환 없이 통째로 저장한다.
 */
export function mapPBLInterviewToDb(data: Partial<PBLInterviewStrict>): PBLInterviewDbUpdate {
  return { pbl_data: data as Record<string, unknown> };
}

/**
 * DB interviews 행 → camelCase PBL 인터뷰 (신규 Zod Partial).
 *
 * pbl_data=null 또는 row=null 이면 빈 객체 반환.
 */
export function mapDbToPBLInterview(
  row: { pbl_data?: Record<string, unknown> | null } | null
): Partial<PBLInterviewStrict> {
  if (!row) return {};
  const data = row.pbl_data;
  if (!data || typeof data !== 'object') return {};
  return data as Partial<PBLInterviewStrict>;
}

/**
 * 객체에서 값이 undefined/null 인 키를 제거한 얕은 복사본을 반환한다.
 *
 * `{ ...current, ...stripNullish(patch) }` 형태로 부분 patch 를 병합할 때,
 * patch 가 어떤 키를 explicit undefined/null 로 담아도 current 값을 덮어쓰지
 * 않도록 한다 — `patch.x ?? current.x` 의 nullish 시맨틱과 동일. (키 자체가
 * 없으면 spread 대상이 아니므로 current 가 자연히 유지된다.)
 */
function stripNullish<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * PBL 훈련환경(trainingEnv) 부분 병합 — `current` 위에 `patch` 의 비-nullish 키만 덮는다.
 *
 * 16 필드의 하드코딩 기본값을 두지 않는다(스키마 `.default()` 와의 이중정의 제거).
 * 누락 필드의 default 충전·값 검증은 호출부의 `PBLInterviewSchema.partial().safeParse`
 * 가 단일 출처로 담당한다. nested 객체(aiInfraDetail·targetCharacteristics 등)는
 * 비재귀 통째 교체이며(deepMerge 아님), patch 가 키를 omit/undefined/null 로 두면
 * current 가 보존된다.
 */
export function mergeTrainingEnv(
  current: Partial<PBLTrainingEnv> | undefined,
  patch: Partial<PBLTrainingEnv>
): Partial<PBLTrainingEnv> {
  return { ...current, ...stripNullish(patch) };
}

/**
 * PBL 문제정의서(problemDefinitionSheet) 부분 병합 — `mergeTrainingEnv` 와 동일 시맨틱.
 * 4 필드 `.default('')` 충전은 호출부 스키마 parse 가 담당한다.
 */
export function mergeProblemDefinitionSheet(
  current: Partial<PBLProblemDefinitionSheet> | undefined,
  patch: Partial<PBLProblemDefinitionSheet>
): Partial<PBLProblemDefinitionSheet> {
  return { ...current, ...stripNullish(patch) };
}
