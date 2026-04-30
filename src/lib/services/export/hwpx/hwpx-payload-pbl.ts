/**
 * PBL 데이터 → Python HWPX 함수 payload 변환기.
 *
 * 입력:
 *   - pbl: PBLReportRow (pbl_reports DB 저장본 — pbl_content 포함)
 *   - project: Project (company_name, track 등)
 *   - interview: Interview (pbl_data — V2 PBL 인터뷰 정본 또는 V1 legacy)
 *
 * 출력: Python 측 `_placeholders_pbl.py` 가 기대하는 flat key-value 구조 + 반복 배열.
 *
 * 원칙:
 * - V2 PBLInterviewStrict (PR #28, camelCase 정본) 우선 처리.
 * - V1 PBLInterviewInput (snake_case legacy) 도 fallback 처리 (기존 데이터 보호).
 * - V2 인터뷰 키 (companyName, companyIssues, organization, activities,
 *   problems, priority, target, currentAiLevel, expectedAiLevel) 매핑.
 * - 운영계획 (PBLContent.operation_plan) 은 V1 그대로 (snake_case 정본).
 * - 누락(undefined/null/빈 배열) → 빈 문자열·빈 배열로 안전 변환.
 */
import type { Interview, Project } from '@/types/database';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type {
  AILevel,
  PBLInterviewInput,
  TrainingGoal,
  TrainingPlaceType,
} from '@/lib/schemas/interview-pbl';
import type { PBLInterviewStrict, PBLAILevel } from '@/lib/schemas/interview-pbl';

import type { PBLHwpxPayload } from './hwpx-client';
import { sanitizeFileNamePart } from './hwpx-filename';

export interface PBLHwpxPayloadInputs {
  pbl: PBLReportRow;
  project: Project;
  interview: Interview | null;
}

function buildFileName(companyName: string, versionNumber: number): string {
  const safe = sanitizeFileNamePart(companyName, 'PBL');
  return `${safe}_PBL_v${versionNumber}.hwpx`;
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * pbl_data JSONB 가 V2 정본인지 V1 legacy 인지 판별.
 * V2: companyName 키 (PBLOverviewSchema 의 필수) 가 최상위에 존재.
 * V1: courseOverview 키 (pblInterviewSchema 의 nested overview).
 */
type InterviewBranch =
  | { kind: 'v2'; data: PBLInterviewStrict }
  | { kind: 'v1'; data: PBLInterviewInput }
  | { kind: 'empty' };

function classifyInterview(interview: Interview | null): InterviewBranch {
  if (!interview) return { kind: 'empty' };
  const raw = (interview as unknown as { pbl_data?: Record<string, unknown> | null }).pbl_data;
  if (!raw || typeof raw !== 'object') return { kind: 'empty' };
  if ('companyName' in raw || 'courseName' in raw || 'companyIssues' in raw) {
    return { kind: 'v2', data: raw as PBLInterviewStrict };
  }
  if ('courseOverview' in raw || 'companyStatus' in raw) {
    return { kind: 'v1', data: raw as PBLInterviewInput };
  }
  return { kind: 'empty' };
}

/**
 * PBL V2 인터뷰 → Python 함수 payload data dict.
 * SSOT v2 (`docs/references/hwpx-placeholders.json`) 의 py_key (snake_case) 정합.
 */
function buildDataFromV2(
  v2: PBLInterviewStrict,
  pblContent: PBLContent | null,
  companyName: string,
  reportDate: string,
): Record<string, unknown> {
  const opPlan = pblContent?.operation_plan;
  const trainingPlan = opPlan?.training_plan;
  const evalPlan = opPlan?.evaluation_plan;

  const trainingPeriodFromOps = trainingPlan?.overview?.training_period;
  const opsTrainingPeriod =
    trainingPeriodFromOps?.start && trainingPeriodFromOps?.end
      ? `${trainingPeriodFromOps.start} ~ ${trainingPeriodFromOps.end}`
      : '';

  const evalResultRaw = evalPlan?.course_evaluation?.evaluation_result;
  const evalResult =
    evalResultRaw === 'Pass' || evalResultRaw === 'Fail' || evalResultRaw === '예정'
      ? evalResultRaw
      : '';

  return {
    // ==================== 표지 ====================
    company_name: v2.companyName ?? companyName,
    course_name: v2.courseName ?? '',
    report_date: reportDate,
    // V2 schema 에 없는 표지 메타 — 빈 문자열 fallback (옵션 A 전환 시 D-4 와
    // 동일하게 별도 채움). 양식상 자동 채움은 결과 화면 V2 에서 직접 처리됨.
    pm_affiliation: '',
    pm_name: '',
    external_expert_affiliation: '',
    external_expert_name: '',
    internal_expert_affiliation: companyName,
    internal_expert_name: '',
    doctor_affiliation: '',
    doctor_name: '',

    // ==================== Ⅰ. 훈련과정 개요 ====================
    business_registration_no: '',
    industry_code: '',
    industry_main: '',
    address: '',
    training_address: '',
    jurisdiction_office: '',
    contact_position: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    ncs_code: v2.ncsCode ?? '',
    training_hours: safeString(v2.trainingHours),
    training_target_label: v2.trainingTarget ?? '',
    training_form: v2.trainingForm ?? '',
    training_period: v2.trainingPeriod ?? opsTrainingPeriod,
    business_issues: v2.businessIssues ?? '',

    // ==================== Ⅱ. 훈련 요구 분석 ====================
    company_issues: v2.companyIssues ?? '',
    // V2 organization { orgTree, mainWork[] } 통째 전달 — Python 측에서 flatten
    organization: v2.organization ?? { orgTree: [], mainWork: [] },
    // V2 trainingEnv 자유서술 (V1 의 6 셀 분리는 fallback 으로 빈 문자열)
    training_env_internal_status: '',
    training_env_external_status: '',
    training_env_internal_capability: '',
    training_env_external_capability: '',
    training_env_internal_facility: v2.trainingEnv ?? '',
    training_env_external_facility: '',
    // V2 hrdReportPdf {fileName, url, ...} → URL 또는 fileName
    hrd_report_attachment: v2.hrdReportPdf
      ? v2.hrdReportPdf.url || v2.hrdReportPdf.fileName || ''
      : '',
    course_necessity: v2.courseNecessity ?? '',

    // ==================== Ⅲ. AI기반 훈련과제 도출 ====================
    activities: (v2.activities ?? []).map((a) => ({
      round: a.round,
      date: a.date,
      content: a.content,
      method: a.method,
      participants: a.participants,
    })),
    // V1 호환: 양식 13x6 표 채우기는 generate.py 의 _fill_pbl_performance_activities
    // 가 activities (V2) 우선, performance_activities (V1) fallback 으로 처리.
    performance_activities: [] as Array<Record<string, unknown>>,
    // R8 PBL-자체-04 — 양식 5×2 "문제 정의서" 표 정합 (4 정형 라벨 단일 세트).
    // generate.py 의 _fill_pbl_problems 가 양식 4행 (배경/핵심/범위/제약) 으로 채움.
    problem_definition_sheet: {
      background: v2.problemDefinitionSheet?.background ?? '',
      core: v2.problemDefinitionSheet?.core ?? '',
      scope: v2.problemDefinitionSheet?.scope ?? '',
      constraints: v2.problemDefinitionSheet?.constraints ?? '',
    },
    // V1 fallback (hwpx-payload-pbl.test.ts 가 problems 키 의 존재를 검사하지 않음)
    problems: [] as Array<Record<string, unknown>>,
    priorities: (v2.priority?.items ?? []).map((p) => ({
      problem: p.problem,
      score: p.score,
      rank: p.rank,
    })),
    priority_method: v2.priority?.method ?? '',
    target: v2.target ?? null,
    target_necessity: v2.target?.necessity ?? '',
    // V2 currentAiLevel/expectedAiLevel 영문 enum + note
    current_ai_level: v2.currentAiLevel?.level ?? '',
    current_ai_level_note: v2.currentAiLevel?.note ?? '',
    expected_ai_level: v2.expectedAiLevel?.level ?? '',
    expected_ai_level_note: v2.expectedAiLevel?.note ?? '',

    // ==================== Ⅳ. 운영계획 (PBLContent) — V1 그대로 ====================
    training_goal: opPlan?.training_goal ?? '',
    ai_tool_usage_plan: (opPlan?.ai_tool_usage_plan ?? []).map((i) => ({
      stage: i.stage,
      main_activity: i.main_activity,
      ai_tools: i.ai_tools ?? [],
      utilized_data: i.utilized_data,
      purpose: i.purpose,
      specific_method: i.specific_method,
    })),
    training_plan_course_name: trainingPlan?.overview?.course_name ?? '',
    learning_group: trainingPlan?.learning_group
      ? {
          instructors: trainingPlan.learning_group.instructors ?? [],
          trainees: trainingPlan.learning_group.trainees ?? [],
        }
      : { instructors: [], trainees: [] },
    subject_profile_course_name: trainingPlan?.subject_profile?.course_name ?? '',
    total_training_hours: safeString(trainingPlan?.subject_profile?.total_hours),
    subject_training_goals: (trainingPlan?.subject_profile?.training_goals ?? []).join('\n'),
    subject_ai_tools: (trainingPlan?.subject_profile?.ai_tools ?? []).join('\n'),
    subject_utilized_data: trainingPlan?.subject_profile?.utilized_data ?? '',
    subject_analysis_method: trainingPlan?.subject_profile?.analysis_method ?? '',
    subject_total_sum_hours: safeString(trainingPlan?.subject_profile?.total_sum_hours),
    training_contents: (trainingPlan?.subject_profile?.training_contents ?? []).map((c) => ({
      unit_name: c.unit_name,
      detail: c.detail,
      training_hours: c.training_hours,
      instructor_hours: {
        external: c.instructor_hours?.external ?? 0,
        internal: c.instructor_hours?.internal ?? 0,
      },
    })),
    facilities: (trainingPlan?.facilities ?? []).map((f) => ({
      seq: f.seq,
      category: f.category,
      name: f.name,
      spec: f.spec,
      location: f.location,
    })),
    training_instructors: (trainingPlan?.training_instructors ?? []).map((i) => ({
      name: i.name,
      internal_external: i.internal_external,
      career_years: i.career_years,
      work_name: i.work_name,
      detailed_training_content: i.detailed_training_content ?? [],
    })),
    course_eval_course_name: evalPlan?.course_evaluation?.course_name ?? '',
    course_eval_target: evalPlan?.course_evaluation?.evaluation_target ?? '',
    course_eval_date: evalPlan?.course_evaluation?.evaluation_date ?? '',
    course_eval_criteria: evalPlan?.course_evaluation?.evaluation_criteria ?? '',
    course_eval_result: evalResult,
    course_eval_overall_comment: evalPlan?.course_evaluation?.overall_comment ?? '',
    course_evaluation_methods: evalPlan?.course_evaluation?.evaluation_methods ?? [],
    performance_checklist: (evalPlan?.course_evaluation?.performance_checklist ?? []).map(
      (c) => ({
        unit_name: c.unit_name,
        evaluation_criteria: c.evaluation_criteria,
        performance_level: c.performance_level,
      }),
    ),

    // V2 에서 사용 안 되는 V1 필드 (양식상 PDF 첨부로 통합 / 결과 화면 미노출).
    // _placeholders_pbl 측이 빈 배열을 받으면 표 영역 reset 만 수행.
    training_history: [],
    support_history: [],
    recommendations: [],
    // V1 호환 키 (HWPX 표 14행 본문 체크박스). V2 인터뷰에 별도 필드 없음 → 빈 배열.
    training_goals: [] as TrainingGoal[],
    training_place_types: [] as TrainingPlaceType[],
    internal_instructor_used: false,

    // V2 에 없는 V1 호환 셀 (필요 시 fallback 빈 문자열)
    proper_training_hours: '',
    training_place_location: '',
    training_place_special_notes: '',
    internal_instructor_name: '',
    internal_instructor_position: '',
    target_count: '',
    target_career: '',
    target_level: '',
    ai_tools_status: '',
    network_status: '',
    pc_count: '',
    etc_equipment: '',
    training_needs_analysis: '',
    expectation_as_is: '',
    expectation_to_be: '',
    course_development_necessity: v2.courseNecessity ?? '',
    training_job: '',
    trainee_count: '',
    // V2 표지 → 라벨 호환
    current_ai_level_label: v2.currentAiLevel?.level
      ? aiLevelEnumToLabel(v2.currentAiLevel.level)
      : '',
    expected_ai_level_label: v2.expectedAiLevel?.level
      ? aiLevelEnumToLabel(v2.expectedAiLevel.level)
      : '',
    ai_improvement_reason: v2.expectedAiLevel?.note ?? '',
    target_tasks_selection_reason: v2.target?.necessity ?? '',
    problem_background: '',
    problem_core: '',
    problem_scope: '',
    problem_constraints: '',
  };
}

/** V2 PBLAILevel (BASIC/EXPLORER/USER/LEADER) → 한글 AILevel 라벨 변환.
 *  enum 으로 막혀있어 모든 case 가 cover. default 는 dead branch 로 제거. */
function aiLevelEnumToLabel(level: PBLAILevel): AILevel {
  switch (level) {
    case 'BASIC':
      return 'AI기초형';
    case 'EXPLORER':
      return 'AI탐구형';
    case 'USER':
      return 'AI활용형';
    case 'LEADER':
      return 'AI선도형';
  }
}

/**
 * V1 PBL 인터뷰 → Python 함수 payload data dict (legacy 호환).
 * V1 데이터가 DB 에 남아 있는 경우 처리.
 */
function buildDataFromV1(
  v1: PBLInterviewInput,
  pblContent: PBLContent | null,
  companyName: string,
  reportDate: string,
): Record<string, unknown> {
  const overview = v1.courseOverview;
  const companyStatus = v1.companyStatus;
  const trainingEnv = v1.trainingEnvironment;
  const hrd = v1.hrdNecessity;
  const perf = v1.performanceActivities;
  const problem = v1.problemDefinition;
  const targets = v1.targetTasks;
  const aiLevel = v1.aiLevelDiagnosis;

  const opPlan = pblContent?.operation_plan;
  const trainingPlan = opPlan?.training_plan;
  const evalPlan = opPlan?.evaluation_plan;

  const period = trainingPlan?.overview?.training_period;
  const trainingPeriod =
    period?.start && period?.end ? `${period.start} ~ ${period.end}` : '';

  const evalResultRaw = evalPlan?.course_evaluation?.evaluation_result;
  const evalResult =
    evalResultRaw === 'Pass' || evalResultRaw === 'Fail' || evalResultRaw === '예정'
      ? evalResultRaw
      : '';

  const courseName = overview?.course_name ?? '';

  return {
    // 표지
    company_name: companyName || overview?.company_name || '',
    course_name: courseName,
    report_date: reportDate,
    pm_affiliation: '',
    pm_name: '',
    external_expert_affiliation: '',
    external_expert_name: '',
    internal_expert_affiliation: companyName,
    internal_expert_name: '',
    doctor_affiliation: '',
    doctor_name: '',

    // Ⅰ. 훈련과정 개요
    business_registration_no: overview?.business_registration_no ?? '',
    industry_code: overview?.industry_code ?? '',
    industry_main: overview?.industry_main ?? '',
    address: overview?.address ?? '',
    training_address: overview?.training_address ?? '',
    jurisdiction_office: overview?.jurisdiction_office ?? '',
    contact_position: overview?.contact?.position ?? '',
    contact_name: overview?.contact?.name ?? '',
    contact_phone: overview?.contact?.phone ?? '',
    contact_email: overview?.contact?.email ?? '',
    ncs_code: overview?.ncs_code ?? '',
    training_hours: safeString(overview?.training_hours),
    trainee_count: safeString(overview?.trainee_count),
    training_job: overview?.training_job ?? '',
    training_goals: (overview?.training_goals ?? []) as TrainingGoal[],
    training_target_label: '',
    training_form: '',
    training_period: trainingPeriod,
    business_issues: companyStatus?.business_issues ?? '',

    // Ⅱ. 훈련 요구 분석
    company_issues: companyStatus?.business_issues ?? '',
    organization: (companyStatus?.organization ?? []).map((o) => ({
      department_name: o.department_name,
      tasks: o.tasks ?? [],
    })),
    training_env_internal_status: '',
    training_env_external_status: '',
    training_env_internal_capability: '',
    training_env_external_capability: '',
    training_env_internal_facility: '',
    training_env_external_facility: '',
    proper_training_hours: safeString(trainingEnv?.proper_training_hours),
    training_place_types: (trainingEnv?.training_place?.types ?? []) as TrainingPlaceType[],
    training_place_location: trainingEnv?.training_place?.location ?? '',
    training_place_special_notes: trainingEnv?.training_place?.special_notes ?? '',
    internal_instructor_used: Boolean(trainingEnv?.internal_instructor?.used),
    internal_instructor_name: trainingEnv?.internal_instructor?.name ?? '',
    internal_instructor_position: trainingEnv?.internal_instructor?.position ?? '',
    target_count: safeString(trainingEnv?.target_count),
    target_career: trainingEnv?.target_characteristics?.career ?? '',
    target_level: trainingEnv?.target_characteristics?.level ?? '',
    ai_tools_status: trainingEnv?.ai_infrastructure?.ai_tools ?? '',
    network_status: trainingEnv?.ai_infrastructure?.network ?? '',
    pc_count: safeString(trainingEnv?.ai_infrastructure?.pc_count),
    etc_equipment: trainingEnv?.ai_infrastructure?.etc_equipment ?? '',
    training_needs_analysis: trainingEnv?.training_needs_analysis ?? '',
    expectation_as_is: trainingEnv?.expectation?.as_is ?? '',
    expectation_to_be: trainingEnv?.expectation?.to_be ?? '',
    training_history: (hrd?.training_history ?? []).map((h) => ({
      seq: h.seq ?? 0,
      program: h.program ?? '',
      course_name: h.course_name ?? '',
      method: h.method ?? '',
      duration_days: h.duration_days ?? 0,
    })),
    support_history: (hrd?.support_history ?? []).map((h) => ({
      year: h.year ?? '',
      annual_limit: h.annual_limit ?? 0,
      supported: h.supported ?? 0,
      ratio: h.ratio ?? '',
    })),
    recommendations: (hrd?.recommendations ?? []).map((r) => ({
      rank: r.rank,
      program: r.program ?? '',
      proposal: r.proposal ?? '',
    })),
    course_development_necessity: hrd?.course_development_necessity ?? '',
    course_necessity: hrd?.course_development_necessity ?? '',
    hrd_report_attachment: '',

    // Ⅲ. AI기반 훈련과제 도출
    performance_activities: (perf?.performance_activities ?? []).map((a) => ({
      round: a.round,
      date: a.date,
      content: a.content,
      method: a.method,
      operation_mode: a.operation_mode,
      participants: {
        pm: a.participants?.pm ?? '',
        external_expert: a.participants?.external_expert ?? '',
        internal_expert: a.participants?.internal_expert ?? '',
        jurisdiction_manager: a.participants?.jurisdiction_manager ?? '',
      },
    })),
    activities: [],
    problems: [],
    problem_background: problem?.problem_definition?.background ?? '',
    problem_core: problem?.problem_definition?.core_problem ?? '',
    problem_scope: problem?.problem_definition?.scope ?? '',
    problem_constraints: problem?.problem_definition?.constraints ?? '',
    problem_priorities: (problem?.problem_priorities ?? []).map((p) => ({
      problem_name: p.problem_name,
      priority: p.priority,
      selected: p.selected,
    })),
    priorities: [],
    priority_method: '',
    target_tasks: (targets?.target_tasks ?? []).map((t) => ({
      task_name: t.task_name,
      necessity: t.necessity,
      selected: t.selected,
    })),
    target_tasks_selection_reason: targets?.selection_reason ?? '',
    target_task_details: (targets?.target_task_details ?? []).map((d) => ({
      task_name: d.task_name,
      as_is: d.as_is,
      to_be: d.to_be,
      required_knowledge: d.required_knowledge,
      required_skill: d.required_skill,
    })),
    target: null,
    target_necessity: targets?.selection_reason ?? '',
    ai_current_level: (aiLevel?.current_ai_level ?? '') as AILevel | '',
    ai_expected_level: (aiLevel?.expected_ai_level ?? '') as AILevel | '',
    ai_improvement_reason: aiLevel?.improvement_reason ?? '',
    current_ai_level_label: aiLevel?.current_ai_level ?? '',
    expected_ai_level_label: aiLevel?.expected_ai_level ?? '',
    current_ai_level: '',
    current_ai_level_note: '',
    expected_ai_level: '',
    expected_ai_level_note: aiLevel?.improvement_reason ?? '',

    // Ⅳ. AI 기반 운영계획 수립
    training_goal: opPlan?.training_goal ?? '',
    ai_tool_usage_plan: (opPlan?.ai_tool_usage_plan ?? []).map((i) => ({
      stage: i.stage,
      main_activity: i.main_activity,
      ai_tools: i.ai_tools ?? [],
      utilized_data: i.utilized_data,
      purpose: i.purpose,
      specific_method: i.specific_method,
    })),
    training_plan_course_name: trainingPlan?.overview?.course_name ?? '',
    learning_group: trainingPlan?.learning_group
      ? {
          instructors: trainingPlan.learning_group.instructors ?? [],
          trainees: trainingPlan.learning_group.trainees ?? [],
        }
      : { instructors: [], trainees: [] },
    subject_profile_course_name: trainingPlan?.subject_profile?.course_name ?? '',
    total_training_hours: safeString(trainingPlan?.subject_profile?.total_hours),
    subject_training_goals: (trainingPlan?.subject_profile?.training_goals ?? []).join('\n'),
    subject_ai_tools: (trainingPlan?.subject_profile?.ai_tools ?? []).join('\n'),
    subject_utilized_data: trainingPlan?.subject_profile?.utilized_data ?? '',
    subject_analysis_method: trainingPlan?.subject_profile?.analysis_method ?? '',
    subject_total_sum_hours: safeString(trainingPlan?.subject_profile?.total_sum_hours),
    training_contents: (trainingPlan?.subject_profile?.training_contents ?? []).map((c) => ({
      unit_name: c.unit_name,
      detail: c.detail,
      training_hours: c.training_hours,
      instructor_hours: {
        external: c.instructor_hours?.external ?? 0,
        internal: c.instructor_hours?.internal ?? 0,
      },
    })),
    facilities: (trainingPlan?.facilities ?? []).map((f) => ({
      seq: f.seq,
      category: f.category,
      name: f.name,
      spec: f.spec,
      location: f.location,
    })),
    training_instructors: (trainingPlan?.training_instructors ?? []).map((i) => ({
      name: i.name,
      internal_external: i.internal_external,
      career_years: i.career_years,
      work_name: i.work_name,
      detailed_training_content: i.detailed_training_content ?? [],
    })),
    course_eval_course_name: evalPlan?.course_evaluation?.course_name ?? '',
    course_eval_target: evalPlan?.course_evaluation?.evaluation_target ?? '',
    course_eval_date: evalPlan?.course_evaluation?.evaluation_date ?? '',
    course_eval_criteria: evalPlan?.course_evaluation?.evaluation_criteria ?? '',
    course_eval_result: evalResult,
    course_eval_overall_comment: evalPlan?.course_evaluation?.overall_comment ?? '',
    course_evaluation_methods: evalPlan?.course_evaluation?.evaluation_methods ?? [],
    performance_checklist: (evalPlan?.course_evaluation?.performance_checklist ?? []).map(
      (c) => ({
        unit_name: c.unit_name,
        evaluation_criteria: c.evaluation_criteria,
        performance_level: c.performance_level,
      }),
    ),
  };
}

/** 인터뷰 데이터 없음 — 모든 키를 빈 값으로 채운 dict.
 *  ai level 은 enum 빈 문자열 처리 (체크박스 모두 □). */
function buildDataEmpty(
  pblContent: PBLContent | null,
  companyName: string,
  reportDate: string,
): Record<string, unknown> {
  // 빈 V2 객체 — currentAiLevel/expectedAiLevel 만 undefined 처리하기 위해 부분 캐스팅
  const empty = {
    companyName: '',
    courseName: '',
    ncsCode: '',
    trainingHours: 0,
    trainingTarget: '',
    trainingForm: '',
    trainingPeriod: '',
    businessIssues: '',
    companyIssues: '',
    organization: { orgTree: [], mainWork: [] },
    trainingEnv: '',
    hrdReportPdf: null,
    courseNecessity: '',
    activities: [],
    problems: [],
    priority: { items: [], method: '' },
    target: { name: '', code: '', scope: '', necessity: '', necessity_score: 3, details: [] },
    currentAiLevel: undefined,
    expectedAiLevel: undefined,
  } as unknown as PBLInterviewStrict;
  return buildDataFromV2(empty, pblContent, companyName, reportDate);
}

/**
 * PBL 보고서 + 인터뷰 데이터 → Python 함수 payload.
 */
export function buildPBLHwpxPayload(inputs: PBLHwpxPayloadInputs): PBLHwpxPayload {
  const { pbl, project, interview } = inputs;
  const pblContent: PBLContent | null = (pbl.pbl_content as PBLContent | null) ?? null;
  const branch = classifyInterview(interview);

  const rawDate = pbl.finalized_at || pbl.updated_at;
  const reportDate = rawDate
    ? new Date(rawDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';

  const companyName = project.company_name;  // Project.company_name 은 필수 string

  let data: Record<string, unknown>;
  if (branch.kind === 'v2') {
    data = buildDataFromV2(branch.data, pblContent, companyName, reportDate);
    // V2 인터뷰 의 companyName 이 있으면 우선 사용 (project 의 company_name 과 다를 수 있음)
    if (branch.data.companyName) {
      data.company_name = branch.data.companyName;
    }
  } else if (branch.kind === 'v1') {
    data = buildDataFromV1(branch.data, pblContent, companyName, reportDate);
  } else {
    data = buildDataEmpty(pblContent, companyName, reportDate);
  }

  // PBL 양식 Ⅰ. 신청서 자동표출 7필드 override (마이그 071 — PBL-자체-01)
  // — 양식 안내문상 "신청서 기준으로 자동 불러옴" 영역. project 테이블이 단일
  //   진실 원천이며 인터뷰 입력값과 충돌 시 project 가 우선.
  data.business_registration_no = project.business_reg_no ?? '';
  data.industry_code = project.industry_code ?? '';
  data.industry_main = project.industry ?? '';
  data.address = project.company_address ?? '';
  data.training_address = project.training_address ?? '';
  data.jurisdiction_office = project.jurisdiction_branch ?? '';
  data.contact_name = project.contact_name ?? '';
  data.contact_position = project.contact_position ?? '';
  data.contact_phone = project.contact_phone ?? '';
  data.contact_email = project.contact_email ?? '';

  // 표지·결과보고서 표지에 들어가는 company_name 은 항상 채움
  const finalCompanyName = (data.company_name as string) || companyName;
  data.company_name = finalCompanyName;
  // 외부 노출 파일명도 같은 기준
  return {
    track: 'PBL' as const,
    fileName: buildFileName(finalCompanyName, pbl.version_number),
    data,
  };
}
