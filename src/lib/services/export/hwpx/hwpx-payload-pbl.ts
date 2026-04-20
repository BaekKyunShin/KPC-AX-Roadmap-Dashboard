/**
 * PBL 데이터 → Python HWPX 함수 payload 변환기 (Step 10 Task 6).
 *
 * 입력:
 *   - pbl: PBLReportRow (pbl_reports DB 저장본 — pbl_content 포함)
 *   - project: Project (company_name, track)
 *   - interview: Interview (pbl_data — 양식 2번 Ⅰ~Ⅲ)
 *
 * 출력: Python 측 `_placeholders_pbl.py` 가 기대하는 flat key-value 구조 + 반복 배열.
 *
 * 원칙:
 * - 누락(undefined/null/빈 배열) → 빈 문자열·빈 배열로 안전 변환
 * - 양식 한글 라벨을 그대로 사용 (체크박스 토글은 Python replace로 처리)
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

function toInterviewPBL(interview: Interview | null): PBLInterviewInput | null {
  if (!interview) return null;
  const raw = (interview as unknown as { pbl_data?: PBLInterviewInput | null }).pbl_data;
  return raw ?? null;
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * PBL 보고서 + 인터뷰 데이터 → Python 함수 payload.
 */
export function buildPBLHwpxPayload(inputs: PBLHwpxPayloadInputs): PBLHwpxPayload {
  const { pbl, project, interview } = inputs;
  const pblContent: PBLContent | null = (pbl.pbl_content as PBLContent | null) ?? null;
  const pblInterview = toInterviewPBL(interview);

  // 인터뷰 기반 Ⅰ~Ⅲ 추출
  const overview = pblInterview?.courseOverview;
  const companyStatus = pblInterview?.companyStatus;
  const trainingEnv = pblInterview?.trainingEnvironment;
  const hrd = pblInterview?.hrdNecessity;
  const perf = pblInterview?.performanceActivities;
  const problem = pblInterview?.problemDefinition;
  const targets = pblInterview?.targetTasks;
  const aiLevel = pblInterview?.aiLevelDiagnosis;

  // 운영계획·성과분석은 pbl_content (LLM 생성 산출물)
  const opPlan = pblContent?.operation_plan;
  const trainingPlan = opPlan?.training_plan;
  const evalPlan = opPlan?.evaluation_plan;
  const performance = pblContent?.performance_analysis;

  // 보고서 날짜 (확정 시점 우선, 없으면 업데이트 시점)
  const rawDate = pbl.finalized_at || pbl.updated_at;
  const reportDate = rawDate
    ? new Date(rawDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';

  const companyName = project.company_name ?? overview?.company_name ?? '';
  const courseName = overview?.course_name ?? trainingPlan?.overview?.course_name ?? '';

  // 훈련 기간 포맷
  const period = trainingPlan?.overview?.training_period;
  const trainingPeriod =
    period?.start && period?.end ? `${period.start} ~ ${period.end}` : '';

  // 과정평가 결과 라벨
  const evalResultRaw = evalPlan?.course_evaluation?.evaluation_result;
  const evalResult =
    evalResultRaw === 'Pass'
      ? 'Pass'
      : evalResultRaw === 'Fail'
      ? 'Fail'
      : evalResultRaw === '예정'
      ? '예정'
      : '';

  const data: Record<string, unknown> = {
    // 표지
    company_name: companyName,
    course_name: courseName,
    report_date: reportDate,

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

    // Ⅱ. 훈련 요구 분석
    business_issues: companyStatus?.business_issues ?? '',
    organization: (companyStatus?.organization ?? []).map((o) => ({
      department_name: o.department_name,
      tasks: o.tasks ?? [],
    })),
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
    problem_background: problem?.problem_definition?.background ?? '',
    problem_core: problem?.problem_definition?.core_problem ?? '',
    problem_scope: problem?.problem_definition?.scope ?? '',
    problem_constraints: problem?.problem_definition?.constraints ?? '',
    problem_priorities: (problem?.problem_priorities ?? []).map((p) => ({
      problem_name: p.problem_name,
      priority: p.priority,
      selected: p.selected,
    })),
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
    ai_current_level: (aiLevel?.current_ai_level ?? '') as AILevel | '',
    ai_expected_level: (aiLevel?.expected_ai_level ?? '') as AILevel | '',
    ai_improvement_reason: aiLevel?.improvement_reason ?? '',
    current_ai_level_label: aiLevel?.current_ai_level ?? '',
    expected_ai_level_label: aiLevel?.expected_ai_level ?? '',

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
    training_period: trainingPeriod,
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

    // Ⅴ. 성과분석 및 확산 전략
    quantitative_metrics: performance?.quantitative_metrics ?? [],
    qualitative_metrics: performance?.qualitative_metrics ?? [],
    internalization_plan: performance?.internalization_plan ?? [],
    dissemination_plan: performance?.dissemination_plan ?? [],
  };

  return {
    track: 'PBL' as const,
    fileName: buildFileName(companyName, pbl.version_number),
    data,
  };
}
