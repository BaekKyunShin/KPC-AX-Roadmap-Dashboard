/**
 * PBL 데이터 → Python HWPX 함수 payload 변환기 (산인공 PBL 양식 v2).
 *
 * 입력:
 *   - pbl: PBLReportRow (pbl_reports DB 저장본 — pbl_content 포함)
 *   - project: Project (company_name, track 등)
 *   - interview: Interview (pbl_data — V2 PBLInterviewStrict)
 *   - linkedRoadmap: 선행 로드맵 인터뷰(camelCase 복원본, hydrateRoadmapInterview 출력)
 *
 * 출력: Python 측 `_placeholders_pbl` 가 기대하는 flat key-value + 반복 배열.
 *
 * 원칙:
 * - V2 PBLInterviewStrict (camelCase 정본) 단일 경로. V1 fallback 제거.
 * - Ⅱ-1-나 로드맵 수립·Ⅱ-2 요구분석·Ⅲ-1 수행활동·Ⅲ-3-가 과업 목록은 선행 로드맵
 *   인터뷰에서 자동 연계(linkedRoadmap). 미연계 시 빈 문자열·빈 배열 폴백(Ⅱ장 빈 양식).
 * - 운영계획(PBLContent.operation_plan) + 성과분석 측정지표(operation_plan.outcome_metrics)
 *   는 LLM 생성. 성과 확산 전략(구 Ⅴ-2)은 양식 삭제로 미출력.
 * - 누락(undefined/null/빈 배열) → 빈 문자열·빈 배열로 안전 변환.
 */
import type { Interview, Project } from '@/types/database';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLInterviewStrict, PBLTaskSelection } from '@/lib/schemas/interview-pbl';
import {
  INTERVIEW_METHOD_LABEL,
  type InterviewMethod,
  type RoadmapInterviewStrict,
} from '@/lib/schemas/interview-roadmap';

import type { PBLHwpxPayload } from './hwpx-client';
import { sanitizeFileNamePart } from './hwpx-filename';

/**
 * 양식 표지 4 서명자 (PM/외부전문가/내부전문가/주치의) 메타.
 * 인터뷰 페이지에서 받지 않고 프로젝트 메타에서 자동 인입.
 * actions.ts 의 exportPBLAsHwpxAction 가 컨설턴트·내부전문가 row 를 추가 조회해 전달.
 * 부분 전달 가능 (예: PM 만 알면 PM 만 채움, 나머지는 기존 fallback 유지).
 */
export interface PBLSignerEntry {
  affiliation: string;
  name: string;
}
export interface PBLSignerMeta {
  pm?: PBLSignerEntry;
  external_expert?: PBLSignerEntry;
  internal_expert?: PBLSignerEntry;
  doctor?: PBLSignerEntry;
}

export interface PBLHwpxPayloadInputs {
  pbl: PBLReportRow;
  project: Project;
  interview: Interview | null;
  /** 선행 로드맵 인터뷰(camelCase 복원본). 미연계 시 null → Ⅱ장 빈 양식. */
  linkedRoadmap?: Partial<RoadmapInterviewStrict> | null;
  signerMeta?: PBLSignerMeta;
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
 * 자유서술 텍스트의 양식 셀 출력을 정규화한다.
 *
 *  1) **동그라미 숫자 자동 줄바꿈** — ①②③…⑳ 앞 (string 시작 외) 에 \n 삽입.
 *     양식 셀이 paragraph 별로 머리기호(▪)를 자동 부여하므로 \n 분할 시 항목마다
 *     머리기호가 자연스럽게 붙는다.
 *  2) **각 라인 시작 머리기호 제거** — ▪ ● ◆ ■ □ - * + 같은 사용자/LLM 이 직접
 *     붙인 머리기호는 양식 셀의 자동 머리기호와 중복돼 "▪ ▪ 학습목표:" 처럼
 *     보이는 회귀가 있어 항상 strip 한다.
 *
 * 적용 대상: company_issues, course_necessity, training_contents[].detail.
 */
function normalizeListText(text: string | undefined | null): string {
  if (!text) return '';
  const withBreaks = text.replace(/(?<=\S)\s*(?=[①-⑳])/g, '\n');
  return withBreaks
    .split('\n')
    .map((line) => line.replace(/^\s*[▪●◆■□\-*+•·]+\s*/u, ''))
    .join('\n');
}

/** Project 의 신청서 자동표출 필드 → Ⅰ. 개요 override dict.
 *  양식 안내문상 "신청서 기준으로 자동 불러옴" 영역. project 가 단일 진실 원천. */
function buildApplicationMetaP02(project: Project): Record<string, string> {
  const fallback = (v: string | null | undefined): string => v ?? '';
  return {
    business_registration_no: fallback(project.business_reg_no),
    industry_code: fallback(project.industry_code),
    industry_main: fallback(project.industry),
    address: fallback(project.company_address),
    training_address: fallback(project.training_address),
    jurisdiction_office: fallback(project.jurisdiction_branch),
    contact_name: fallback(project.contact_name),
    contact_position: fallback(project.contact_position),
    contact_phone: fallback(project.contact_phone),
    contact_email: fallback(project.contact_email),
  };
}

/** `trainingEnv` 정형 객체 → Ⅱ-3 훈련환경 분석(P-05) 매핑 dict.
 *
 *  Python `_fill_pbl_training_env` (양식 12×7) 의 데이터 영역과 1:1 정합.
 *  V2 정본은 항상 객체. null/undefined 는 빈 dict 로 안전 변환.
 *  Legacy 호환: `internalInstructorUsage` 키가 없고 강사 배열이 있으면 'YES' 로 추론.
 */
function buildTrainingEnvP05(env: PBLInterviewStrict['trainingEnv'] | undefined): {
  proper_training_hours: string;
  training_place_location: string;
  training_place_special_notes: string;
  internal_instructor_name: string;
  internal_instructor_position: string;
  ai_tools_status: string;
  network_status: string;
  pc_count: string;
  etc_equipment: string;
  target_count: string;
  target_career: string;
  target_level: string;
  training_needs_analysis: string;
  expectation_as_is: string;
  expectation_to_be: string;
  internal_instructor_usage: 'YES' | 'NO' | '';
  internal_instructor_used: boolean;
} {
  if (!env || typeof env !== 'object') {
    return {
      proper_training_hours: '',
      training_place_location: '',
      training_place_special_notes: '',
      internal_instructor_name: '',
      internal_instructor_position: '',
      ai_tools_status: '',
      network_status: '',
      pc_count: '',
      etc_equipment: '',
      target_count: '',
      target_career: '',
      target_level: '',
      training_needs_analysis: '',
      expectation_as_is: '',
      expectation_to_be: '',
      internal_instructor_usage: '',
      internal_instructor_used: false,
    };
  }
  const firstInternalInstructor = env.internalInstructors?.[0];
  const target = env.targetCharacteristics ?? { career: '', level: '' };
  const infra = env.aiInfraDetail ?? {
    toolCapacity: 'AVAILABLE' as const,
    networkStatus: 'GOOD' as const,
    pcCount: 0,
  };
  const toolLabel = {
    AVAILABLE: '가능',
    LIMITED: '제한적',
    UNAVAILABLE: '불가능',
  }[infra.toolCapacity];
  const networkLabel = {
    GOOD: '양호',
    NORMAL: '보통',
    IMPROVEMENT_NEEDED: '개선필요',
  }[infra.networkStatus];

  const usage: 'YES' | 'NO' =
    env.internalInstructorUsage ?? ((env.internalInstructors?.length ?? 0) > 0 ? 'YES' : 'NO');
  const primary = env.internalInstructorPrimary ?? { name: '', position: '' };
  const internalName = usage === 'YES' ? primary.name || firstInternalInstructor?.name || '' : '';
  const internalPosition =
    usage === 'YES' ? primary.position || firstInternalInstructor?.position || '' : '';
  const traineeCount = env.targetTraineeCount ?? 0;
  const targetCountStr = traineeCount > 0 ? String(traineeCount) : '';
  const otherEquip = (env.otherEquipment ?? '').trim();
  const etcEquipment = otherEquip.length > 0 ? otherEquip : (env.aiInfrastructure ?? '');

  return {
    proper_training_hours: env.properTrainingHours ?? '',
    training_place_location: env.internalPlace ?? '',
    training_place_special_notes: env.externalPlace ?? '',
    internal_instructor_name: internalName,
    internal_instructor_position: internalPosition,
    ai_tools_status: toolLabel,
    network_status: networkLabel,
    pc_count: String(infra.pcCount ?? 0),
    etc_equipment: etcEquipment,
    target_count: targetCountStr,
    target_career: target.career ?? '',
    target_level: target.level ?? '',
    training_needs_analysis: env.trainingNeedsAnalysis ?? '',
    expectation_as_is: env.expectationAsIs ?? '',
    expectation_to_be: env.expectationToBe ?? '',
    internal_instructor_usage: usage,
    internal_instructor_used: usage === 'YES',
  };
}

/**
 * 선행 로드맵 인터뷰(camelCase) → PBL Ⅱ장·Ⅲ장 연계 py_key dict.
 *
 * 신규 PBL 양식이 로드맵 보고서에서 자동 연계하도록 지정한 구간:
 *   - Ⅱ-1-나 AI훈련 로드맵 수립 (수립 배경·주요 활동·수립 결과=AI역량·선정 과업)
 *   - Ⅱ-2 AI 도입·활용 요구분석 (기업 요구분석·과업 분석표·훈련대상 과업)
 *   - Ⅲ-1 훈련과제 도출 수행활동 (로드맵 수행활동 2역할 → 양식 4역할 표의 PM·내부전문가 행)
 *   - Ⅲ-3-가 훈련대상 업무 선정 (로드맵 과업 4열 + PBL 입력 2열: AI필요도·훈련선정)
 *
 * `linked` 미연계(null) 시 전 키를 빈 값으로 폴백해 Ⅱ장을 빈 양식으로 출력한다.
 */
function buildRoadmapLinkageForPBL(
  linked: Partial<RoadmapInterviewStrict> | null | undefined,
  taskSelections: PBLTaskSelection[]
): Record<string, unknown> {
  const activities = (linked?.performanceActivities ?? []).map((a) => ({
    round: a.round ?? 1,
    date: [a.date ?? '', a.timeRange ?? ''].filter(Boolean).join('\n'),
    content: a.content ?? '',
    method: INTERVIEW_METHOD_LABEL[a.method as InterviewMethod] ?? a.method ?? '',
    pm_name: a.pmName ?? '',
    expert_name: a.expertName ?? '',
  }));
  const tasks = (linked?.taskAnalysis ?? []).map((t) => ({
    job: t.domain ?? '',
    task: t.task ?? '',
    as_is: t.asIs ?? '',
    improvement: t.improvement ?? '',
  }));
  const cr = linked?.companyRequirements;
  const target = linked?.targetTask;

  return {
    // Ⅱ-1-나 AI훈련 로드맵 수립
    roadmap_setup_background: linked?.establishmentNecessity ?? '',
    roadmap_setup_activities: activities,
    // 수립 결과 — AI역량 수준(3단계 체크박스 토글) + 선정 과업
    roadmap_ai_level: linked?.aiLevel ?? '',
    roadmap_selected_task: linked?.selectedTask ?? '',
    // Ⅱ-2 AI 도입·활용 요구분석
    roadmap_req_company_status: cr?.status ?? '',
    roadmap_req_main_problems: cr?.problem ?? '',
    roadmap_req_push_willingness: cr?.will ?? '',
    roadmap_req_expected_outcomes: cr?.outcomes ?? '',
    roadmap_task_analysis: tasks,
    roadmap_target_task: target
      ? {
          name: target.name ?? '',
          reason: target.reason ?? '',
          as_is: target.expectedAsIs ?? '',
          to_be: target.expectedToBe ?? '',
        }
      : { name: '', reason: '', as_is: '', to_be: '' },
    // Ⅲ-1 수행활동 (로드맵 수행활동 연계 — Ⅱ-1-나 주요 활동과 동일 소스)
    roadmap_perf_activities: activities,
    // Ⅲ-3-가 훈련대상 업무 선정 (로드맵 과업 4열 + PBL taskSelections 2열)
    roadmap_task_selections: tasks.map((t, i) => ({
      job: t.job,
      task: t.task,
      as_is: t.as_is,
      improvement: t.improvement,
      ai_necessity: taskSelections[i]?.ai_necessity ?? '',
      training_selected: taskSelections[i]?.training_selected ?? false,
    })),
  };
}

/**
 * PBL V2 인터뷰 + 선행 로드맵 연계 → Python 함수 payload data dict.
 * SSOT v2 (`docs/references/hwpx-placeholders.json`) 의 py_key (snake_case) 정합.
 */
function buildDataFromV2(
  v2: PBLInterviewStrict,
  pblContent: PBLContent | null,
  linkedRoadmap: Partial<RoadmapInterviewStrict> | null | undefined,
  companyName: string,
  reportDate: string
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
    // 표지 4 서명자 — signerMeta 로 채움(buildPBLHwpxPayload). 빈 fallback.
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
    // 훈련 직무 — 로드맵 선정 과업(연계) 우선, 없으면 훈련과정명(Ⅰ) fallback.
    training_job: linkedRoadmap?.selectedTask?.trim() || v2.courseName?.trim() || '',

    // ==================== Ⅱ-1-가 기업 경영 이슈 (인터뷰) ====================
    company_issues: normalizeListText(v2.companyIssues),
    // 조직 및 주요 업무 — 로드맵과 동일하게 3 계층 제거. 빈 객체 안전 송신.
    organization: { orgTree: [], mainWork: [] },

    // ==================== Ⅱ-1-나 / Ⅱ-2 로드맵 자동 연계 ====================
    ...buildRoadmapLinkageForPBL(linkedRoadmap, v2.target?.taskSelections ?? []),

    // ==================== Ⅱ-2-가 / Ⅱ-3 훈련환경 (인터뷰) ====================
    hrd_report_attachment: v2.hrdReportPdf
      ? v2.hrdReportPdf.url || v2.hrdReportPdf.fileName || ''
      : '',
    ...buildTrainingEnvP05(v2.trainingEnv),
    // Ⅱ-1-다 AI훈련과정 개발 필요성 (인터뷰)
    course_necessity: normalizeListText(v2.courseNecessity),

    // ==================== Ⅲ. AI기반 훈련과제 도출 ====================
    // Ⅲ-2-가 문제 정의서 (양식 5×2 — 배경/핵심/범위/제약 단일 세트).
    problem_definition_sheet: {
      background: v2.problemDefinitionSheet?.background ?? '',
      core: v2.problemDefinitionSheet?.core ?? '',
      scope: v2.problemDefinitionSheet?.scope ?? '',
      constraints: v2.problemDefinitionSheet?.constraints ?? '',
    },
    // Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유, 인터뷰)
    target_necessity: v2.target?.necessity ?? '',
    // Ⅲ-3-다 훈련대상 업무 세부내용 (양식 4×5 — 업무명/AS-IS/TO-BE/요구지식/기술, 인터뷰)
    target_details: (v2.target?.details ?? []).map((d) => ({
      title: d.title,
      as_is: d.as_is,
      to_be: d.to_be,
      required_knowledge: d.required_knowledge,
      required_skill: d.required_skill,
    })),

    // ==================== Ⅳ. 운영계획 (PBLContent.operation_plan) ====================
    training_goal: opPlan?.training_goal ?? '',
    // Ⅳ-2 성과분석 측정 지표 (v1 Ⅴ장에서 이동 — operation_plan.outcome_metrics)
    training_goals: opPlan?.outcome_metrics?.selected_goals ?? [],
    quantitative_metrics: opPlan?.outcome_metrics?.quantitative ?? '',
    qualitative_metrics: opPlan?.outcome_metrics?.qualitative ?? '',
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
      detail: normalizeListText(c.detail),
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
    performance_checklist: (evalPlan?.course_evaluation?.performance_checklist ?? []).map((c) => ({
      unit_name: c.unit_name,
      evaluation_criteria: c.evaluation_criteria,
      performance_level: c.performance_level,
    })),
  };
}

/**
 * PBL 보고서 + 인터뷰 + 선행 로드맵 연계 → Python 함수 payload.
 */
export function buildPBLHwpxPayload(inputs: PBLHwpxPayloadInputs): PBLHwpxPayload {
  const { pbl, project, interview, linkedRoadmap, signerMeta } = inputs;
  const pblContent: PBLContent | null = (pbl.pbl_content as PBLContent | null) ?? null;

  // pbl_data JSONB → V2 인터뷰 (빈/누락은 빈 객체로 안전 처리 → 전 필드 폴백)
  const raw = (interview as unknown as { pbl_data?: Record<string, unknown> | null } | null)
    ?.pbl_data;
  const v2 = (raw && typeof raw === 'object' ? raw : {}) as PBLInterviewStrict;

  const rawDate = pbl.finalized_at || pbl.updated_at;
  const reportDate = rawDate
    ? new Date(rawDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';

  const companyName = project.company_name; // Project.company_name 은 필수 string
  const data = buildDataFromV2(v2, pblContent, linkedRoadmap ?? null, companyName, reportDate);

  if (v2.companyName) {
    data.company_name = v2.companyName;
  }

  // Ⅰ. 개요 신청서 자동표출 override — project 가 단일 진실 원천.
  Object.assign(data, buildApplicationMetaP02(project));

  // 표지·결과보고서 표지 4 서명자 자동 인입 (signerMeta 있을 때만 덮어쓰기).
  if (signerMeta) {
    if (signerMeta.pm) {
      data.pm_affiliation = signerMeta.pm.affiliation;
      data.pm_name = signerMeta.pm.name;
    }
    if (signerMeta.external_expert) {
      data.external_expert_affiliation = signerMeta.external_expert.affiliation;
      data.external_expert_name = signerMeta.external_expert.name;
    }
    if (signerMeta.internal_expert) {
      data.internal_expert_affiliation = signerMeta.internal_expert.affiliation;
      data.internal_expert_name = signerMeta.internal_expert.name;
    }
    if (signerMeta.doctor) {
      data.doctor_affiliation = signerMeta.doctor.affiliation;
      data.doctor_name = signerMeta.doctor.name;
    }
  }

  const finalCompanyName = (data.company_name as string) || companyName;
  data.company_name = finalCompanyName;
  return {
    track: 'PBL' as const,
    fileName: buildFileName(finalCompanyName, pbl.version_number),
    data,
  };
}

/**
 * 테스트 모드(/test-pbl) 전용 — DB row 없이 in-memory 입력만으로 PBL HWPX
 * payload 를 구성. 선행 로드맵 연계는 옵션(미지정 시 Ⅱ장 빈 양식).
 */
export interface InMemoryPBLPayloadInputs {
  content: PBLContent;
  interview: PBLInterviewStrict;
  linkedRoadmap?: Partial<RoadmapInterviewStrict> | null;
  companyName: string;
  versionNumber?: number;
  reportDate?: string;
}

export function buildPBLHwpxPayloadFromInputs(inputs: InMemoryPBLPayloadInputs): PBLHwpxPayload {
  const versionNumber = inputs.versionNumber ?? 1;
  const reportDate =
    inputs.reportDate ??
    new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const companyName =
    inputs.interview.companyName?.trim() || inputs.companyName.trim() || '테스트기업';

  const data = buildDataFromV2(
    inputs.interview,
    inputs.content,
    inputs.linkedRoadmap ?? null,
    companyName,
    reportDate
  );
  data.company_name = companyName;

  return {
    track: 'PBL' as const,
    fileName: buildFileName(companyName, versionNumber),
    data,
  };
}
