/**
 * 로드맵 데이터 → Python HWPX 함수 payload 변환기 — 산인공 양식 v2 (2026-07-13 개정)
 *
 * 입력: RoadmapVersion (DB 저장본) + Project + Interview
 * 출력: Python 측이 기대하는 key-value 구조
 *
 * 원칙:
 * - 누락(undefined/null/빈 배열) → 빈 문자열 또는 빈 배열로 안전 변환
 * - v2 에서 역량 모델링·NCS·훈련체계도·연간 훈련계획 표가 양식에서 삭제되어
 *   해당 payload 키도 함께 제거됨. Ⅲ장 산출물은 훈련과정 명세서 6개뿐이다.
 * - 명세서에 훈련시기(training_period)·훈련수준(training_level) 이 신규 추가됨
 */
import { fromRoadmapVersionColumns } from '@/lib/services/roadmap/roadmap-storage-mapper';
import { TRAINING_LEVEL_LABEL, type RoadmapResult } from '@/lib/services/roadmap/roadmap-types';
import type { Interview, Project, RoadmapVersion } from '@/types/database';
import { INTERVIEW_METHOD_LABEL, type InterviewMethod } from '@/lib/schemas/interview-roadmap';
import { splitByUnit } from '@/lib/utils/list-format';
import { formatTimeRange } from '@/lib/utils/time';

import type { RoadmapHwpxPayload } from './hwpx-client';
import { formatReportDate } from './hwpx-date';
import { sanitizeFileNamePart } from './hwpx-filename';

export interface RoadmapHwpxPayloadInputs {
  roadmap: RoadmapVersion;
  project: Project;
  interview: Interview | null;
}

/**
 * InterviewLike — V2 인터뷰 (mapRoadmapInterviewToDb 출력) + V1 legacy fallback.
 *
 * V2 마이그레이션 후 production 데이터:
 *   - job_tasks[] 키: roadmap_job · task_name · task_description · roadmap_problems
 *                     · roadmap_data_availability · roadmap_ai_necessity
 *   - improvement_goals[] 키: kpi · goal_description · roadmap_as_is · roadmap_to_be
 *   - performance_activities → company_details.roadmap_overview.performance_activities[]
 *
 * 단일 컬럼 (interview_date·interview_round·interview_method·interview_time·participants)
 * 은 V1 legacy. V2 에서는 performance_activities[].pm_name / expert_name 사용.
 *
 * V2 우선 매핑 + V1 fallback (`?? V1`) 으로 안전하게 호환.
 */
interface InterviewLike {
  company_details?: {
    roadmap_overview?: {
      establishment_necessity?: string;
      ai_competency_level?: string;
      selected_tasks_summary?: string;
      roadmap_summary?: string;
      hrd_report_attachment?: { storage_path?: string; file_name?: string };
      // V2: 차수별 수행 활동 배열 (mapRoadmapInterviewToDb 가 저장하는 정식 경로)
      performance_activities?: Array<{
        round?: number;
        date?: string;
        time_range?: string;
        content?: string;
        method?: string;
        pm_name?: string;
        expert_name?: string;
      }>;
    };
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
    };
    roadmap_analysis_notes?: {
      text?: string;
      attachment_urls?: string[];
    };
    // ISSUE-10 Step C-2: 시작/종료 시간 JSONB
    roadmap_interview_time?: {
      start?: string;
      end?: string;
    };
  };
  job_tasks?: Array<{
    id?: string;
    // v2 DB 키 (mapRoadmapInterviewToDb 출력)
    roadmap_job?: string;
    task_name?: string;
    task_description?: string;
    roadmap_improvement?: string;
    // v1 legacy 키 (읽기 하위호환 — improvement 로 승격)
    job?: string;
    as_is?: string;
    roadmap_problems?: string;
    roadmap_data_availability?: string;
    roadmap_ai_necessity?: number | string;
  }>;
  improvement_goals?: Array<{
    id?: string;
    // V2 DB 키
    kpi?: string;
    goal_description?: string;
    roadmap_as_is?: string;
    roadmap_to_be?: string;
    // V1 legacy 키 (fallback)
    task_name?: string;
    selection_reason?: string;
    as_is?: string;
    to_be?: string;
  }>;
  // V1 legacy 단일 컬럼 (V2 에서는 performance_activities[] 로 대체됨)
  interview_date?: string;
  interview_round?: number;
  interview_time?: string;
  interview_method?: string;
  participants?: Array<{ id?: string; name?: string; position?: string }>;
}

function buildFileName(companyName: string, versionNumber: number): string {
  const safe = sanitizeFileNamePart(companyName, '로드맵');
  return `${safe}_로드맵_v${versionNumber}.hwpx`;
}

function participantsToPython(
  participants: Array<{ name?: string; position?: string }> | undefined | null
): Array<{ role: string; name: string; hrd4u_id: string }> {
  if (!participants) return [];
  return participants.map((p) => ({
    role: p.position || '',
    name: p.name || '',
    hrd4u_id: '',
  }));
}

function pickByPosition(
  participants: Array<{ name?: string; position?: string }> | undefined | null,
  keywords: string[]
): { name: string; position: string } | null {
  if (!participants) return null;
  const found = participants.find((p) => keywords.some((k) => (p.position || '').includes(k)));
  return found ? { name: found.name || '', position: found.position || '' } : null;
}

function normalizeLevel(level: RoadmapResult['outcome_summary']['ai_competency_level']): string {
  return level; // 이미 BEGINNER/INTERMEDIATE/ADVANCED
}

export function buildRoadmapHwpxPayload(inputs: RoadmapHwpxPayloadInputs): RoadmapHwpxPayload {
  const { roadmap, project, interview } = inputs;
  const typedInterview = interview as InterviewLike | null;

  // 1) DB 컬럼 → LLM 결과 구조로 복원
  const result = fromRoadmapVersionColumns({
    diagnosis_summary: roadmap.diagnosis_summary,
    roadmap_matrix: roadmap.roadmap_matrix as unknown,
    pbl_course: roadmap.pbl_course as unknown,
    courses: roadmap.courses as unknown,
  });

  // 2) 인터뷰 기반 보조 데이터
  const overview = typedInterview?.company_details?.roadmap_overview;
  const cr = typedInterview?.company_details?.roadmap_company_requirements;
  const notes = typedInterview?.company_details?.roadmap_analysis_notes;
  const jobTasks = typedInterview?.job_tasks ?? [];
  const improvementGoals = typedInterview?.improvement_goals ?? [];
  const participants = typedInterview?.participants ?? [];

  // 3) PM / 내부전문가 찾기
  const pm = pickByPosition(participants, ['PM', '책임자', 'AI훈련코치']);
  const internalExpert = pickByPosition(participants, ['내부전문가']);

  // 4) AI 적용 대상 과업 (Ⅱ-3) - 첫 항목 — V2 DB 키(kpi·goal_description·roadmap_as_is·
  // roadmap_to_be) 우선, V1 legacy(task_name·selection_reason·as_is·to_be) fallback. (#21·#22)
  const firstTarget = improvementGoals[0];
  const trainingTarget = firstTarget
    ? {
        task_name: firstTarget.kpi ?? firstTarget.task_name ?? '',
        selection_reason: firstTarget.goal_description ?? firstTarget.selection_reason ?? '',
        as_is: firstTarget.roadmap_as_is ?? firstTarget.as_is ?? '',
        to_be: firstTarget.roadmap_to_be ?? firstTarget.to_be ?? '',
      }
    : { task_name: '', selection_reason: '', as_is: '', to_be: '' };

  // 6) HRD이음 보고서 첨부 URL (Storage path 기반 — 실제 퍼블릭 URL은 Step 12에서 보강)
  const hrdAttachmentUrl =
    (result as RoadmapResult & { hrd_report_attachment_url?: string }).hrd_report_attachment_url ??
    overview?.hrd_report_attachment?.file_name ??
    '';
  // Step 6.5 legacy storage 경로도 허용
  const hrdFromLegacy =
    (roadmap.pbl_course as unknown as { hrd_report_attachment_url?: string })
      .hrd_report_attachment_url ?? '';
  const finalHrdUrl = hrdAttachmentUrl || hrdFromLegacy;

  // 7) 수행일지 차수 — V2 우선 (company_details.roadmap_overview.performance_activities[]),
  // 없으면 V1 legacy 단일 컬럼(interview_date · interview_round · interview_method · participants)
  // 으로 1차 단일 항목 자동 집계. (#22)
  const v2PerfActs = typedInterview?.company_details?.roadmap_overview?.performance_activities;

  const performanceActivities = (() => {
    if (v2PerfActs && v2PerfActs.length > 0) {
      // V2 — 차수별 다중 행. PM/내부전문가는 행마다 분리.
      return v2PerfActs.map((a) => {
        const dateLine = a.date ?? '';
        const timeLine = a.time_range ?? '';
        const methodKey = a.method ?? '';
        const methodLabelV2 =
          INTERVIEW_METHOD_LABEL[methodKey as InterviewMethod] ?? methodKey ?? '';
        const rowParticipants: Array<{ role: string; name: string; hrd4u_id: string }> = [];
        if (a.pm_name) {
          rowParticipants.push({ role: 'PM', name: a.pm_name, hrd4u_id: '' });
        }
        if (a.expert_name) {
          rowParticipants.push({
            role: '기업 내부전문가',
            name: a.expert_name,
            hrd4u_id: '',
          });
        }
        return {
          round: a.round ?? 1,
          date: [dateLine, timeLine].filter(Boolean).join('\n'),
          content: a.content ?? '',
          method: methodLabelV2,
          participants: rowParticipants,
        };
      });
    }
    if (!typedInterview) return [];
    // V1 legacy fallback — 단일 컬럼 기반 1차 행
    // ISSUE-10 Step C-2: 시간 표시 우선순위
    //   1) company_details.roadmap_interview_time JSONB { start, end } 정식 경로
    //   2) interview_time 단일 컬럼 (legacy production 3건 호환)
    const savedInterviewTime = typedInterview?.company_details?.roadmap_interview_time;
    const interviewTimeText =
      savedInterviewTime?.start || savedInterviewTime?.end
        ? formatTimeRange(savedInterviewTime.start, savedInterviewTime.end)
        : (typedInterview?.interview_time ?? '');
    const methodLabel = typedInterview.interview_method
      ? (INTERVIEW_METHOD_LABEL[typedInterview.interview_method as InterviewMethod] ??
        typedInterview.interview_method ??
        '')
      : '';
    return [
      {
        round: typedInterview.interview_round ?? 1,
        date: [typedInterview.interview_date ?? '', interviewTimeText].filter(Boolean).join('\n'),
        content: notes?.text ?? '',
        method: methodLabel,
        participants: participantsToPython(participants),
      },
    ];
  })();

  // 8) Ⅲ. 훈련과정 명세서 (6개) — v2 신규 필드 훈련시기·훈련수준 포함.
  // course_specs/subjects 는 storage mapper 가 항상 array 보장.
  const courseSpecs = result.course_specs.map((s) => ({
    training_period: s.training_period,
    training_level: TRAINING_LEVEL_LABEL[s.training_level],
    course_name: s.course_name,
    training_method: s.training_method,
    recommended_program: s.recommended_program,
    training_goal: s.goal,
    main_content: s.main_content,
    training_target: s.target_audience,
    subjects: s.subjects.map((subj) => ({
      subject_name: subj.name,
      details: splitByUnit(subj.details),
      hours: String(subj.hours),
    })),
  }));

  // 11) 과업·워크플로우 분석표 (Ⅱ-3) — v2 4열: 직무·과업·현행방식·개선점.
  // v1 의 problem·dataTiming·aiScore 3필드는 improvement 로 승격한다 (운영 DB 호환).
  const taskWorkflowItems = jobTasks.map((t) => {
    const improvement =
      t.roadmap_improvement ??
      [
        t.roadmap_problems ? `문제점: ${t.roadmap_problems}` : '',
        t.roadmap_data_availability
          ? `데이터 발생 시점/보유현황: ${t.roadmap_data_availability}`
          : '',
        t.roadmap_ai_necessity !== undefined && `${t.roadmap_ai_necessity}` !== ''
          ? `AI 도입·활용 필요도: ${t.roadmap_ai_necessity}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    return {
      job: t.roadmap_job ?? t.job ?? '',
      task: t.task_name ?? '',
      as_is: t.task_description ?? t.as_is ?? '',
      improvement,
    };
  });

  // 12) 보고서 날짜 (최종화 시점 우선, 없으면 updated_at)
  //     로케일·타임존 비의존 결정론 포맷 `YYYY. MM. DD.` (formatReportDate).
  const reportDate = roadmap.finalized_at || roadmap.updated_at;
  const reportDateText = formatReportDate(reportDate);

  return {
    track: 'ROADMAP' as const,
    fileName: buildFileName(project.company_name, roadmap.version_number),
    data: {
      // 표지 — v2 제목: "AI훈련로드맵 보고서 (기업명 – 대상 과업)"
      // (Project.company_name 은 타입상 필수 string — ?? 는 dead branch)
      company_name: project.company_name,
      // v2 신규: 표지 제목의 "대상 과업" (인터뷰 Ⅰ-3 선정 과업 재사용)
      cover_target_task: overview?.selected_tasks_summary ?? result.outcome_summary.selected_tasks,
      report_date: reportDateText,
      pm_affiliation: roadmap.consultant_profile_snapshot?.affiliation ?? '',
      pm_name: pm?.name ?? '',
      internal_expert_affiliation: project.company_name,
      internal_expert_name: internalExpert?.name ?? '',

      // Ⅰ-1 수립 필요성 — **인터뷰 입력 그대로** (LLM fallback 사용 금지)
      establishment_necessity: overview?.establishment_necessity ?? '',

      // Ⅰ-2 주요 활동 — 인터뷰 Step 2 기본정보·참석자로부터 자동 집계
      performance_activities: performanceActivities,

      // Ⅰ-3 수립 주요 결과
      //   - 기업 AI 역량 수준·선정 과업 = **인터뷰 입력 그대로**
      //   - 수립 주요내용 요약 = LLM 자동 생성 (StepOverview UI에 '자동 생성 예정'으로 안내된 영역)
      // result.outcome_summary 는 fromRoadmapVersionColumns 가 항상 normalized
      // 객체로 반환하므로 ?. fallback 불필요 (dead branch).
      ai_competency_level: normalizeLevel(
        overview?.ai_competency_level
          ? (overview.ai_competency_level as RoadmapResult['outcome_summary']['ai_competency_level'])
          : result.outcome_summary.ai_competency_level
      ),
      selected_tasks_text: overview?.selected_tasks_summary ?? '',
      // main_content 빈 문자열 → overview.roadmap_summary fallback (`||`),
      // 그 다음 빈 문자열 fallback 도 dead (둘 다 string).
      roadmap_summary: result.outcome_summary.main_content || overview?.roadmap_summary || '',

      // Ⅱ-1 HRD이음 보고서
      hrd_report_attachment: finalHrdUrl,

      // Ⅱ-2 기업 요구분석
      company_status: cr?.company_status ?? '',
      main_problems: cr?.main_problems ?? '',
      push_willingness: cr?.push_willingness ?? '',
      expected_outcomes: cr?.expected_outcomes ?? '',
      // 비고 4 행 (#6 fix). 양식 템플릿에 placeholder 가 정의된 경우만
      // 출력에 반영되며, 미정의 시 안전하게 무시된다.
      company_status_remarks: cr?.remarks?.status ?? '',
      main_problems_remarks: cr?.remarks?.problem ?? '',
      push_willingness_remarks: cr?.remarks?.will ?? '',
      expected_outcomes_remarks: cr?.remarks?.outcomes ?? '',

      // Ⅱ-3 과업·워크플로우
      task_workflow_items: taskWorkflowItems,
      analysis_notes_text: notes?.text ?? '',

      // Ⅱ-3 AI 적용 대상 과업 (첫 항목)
      training_target: trainingTarget,

      // Ⅲ 훈련실시 계획 제안 — 훈련과정 명세서 6개
      course_specs: courseSpecs,
    },
  };
}
