/**
 * 로드맵 데이터 → Python HWPX 함수 payload 변환기 (Step 7 Task 7).
 *
 * 입력: RoadmapVersion (DB 저장본) + Project + Interview
 * 출력: Python 측 `_placeholders_roadmap.py` 가 기대하는 key-value 구조
 *
 * 원칙:
 * - 누락(undefined/null/빈 배열) → 빈 문자열 또는 빈 배열로 안전 변환
 * - 훈련체계도는 buildTrainingStructureTable() 결과를 사용 (매트릭스 → 단순 6열)
 * - Step 6.5 신규 필드 전체 매핑 (setup_necessity, outcome_summary,
 *   training_structure_method, ncs_*)
 */
import { buildTrainingStructureTable } from '@/lib/services/roadmap/roadmap-matrix-builder';
import { fromRoadmapVersionColumns } from '@/lib/services/roadmap/roadmap-storage-mapper';
import type { RoadmapResult } from '@/lib/services/roadmap/roadmap-types';
import type { Interview, Project, RoadmapVersion } from '@/types/database';
import { bulletize, splitByUnit } from '@/lib/utils/list-format';

import type { RoadmapHwpxPayload } from './hwpx-client';

export interface RoadmapHwpxPayloadInputs {
  roadmap: RoadmapVersion;
  project: Project;
  interview: Interview | null;
}

interface InterviewLike {
  company_details?: {
    roadmap_overview?: {
      establishment_necessity?: string;
      ai_competency_level?: string;
      selected_tasks_summary?: string;
      roadmap_summary?: string;
      hrd_report_attachment?: { storage_path?: string; file_name?: string };
    };
    roadmap_company_requirements?: {
      company_status?: string;
      main_problems?: string;
      push_willingness?: string;
      expected_outcomes?: string;
    };
    roadmap_analysis_notes?: {
      text?: string;
      attachment_urls?: string[];
    };
  };
  job_tasks?: Array<{
    id?: string;
    job?: string;
    task_name?: string;
    as_is?: string;
    problems?: string;
    data_availability?: string;
    ai_necessity?: number;
  }>;
  improvement_goals?: Array<{
    id?: string;
    task_name?: string;
    selection_reason?: string;
    as_is?: string;
    to_be?: string;
  }>;
  interview_date?: string;
  interview_round?: number;
  interview_time?: string;
  interview_method?: string;
  participants?: Array<{ id?: string; name?: string; position?: string }>;
}

function buildFileName(companyName: string, versionNumber: number): string {
  const safe = companyName || '로드맵';
  return `${safe}_로드맵_v${versionNumber}.hwpx`;
}

function participantsToPython(
  participants: Array<{ name?: string; position?: string }> | undefined | null,
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
  keywords: string[],
): { name: string; position: string } | null {
  if (!participants) return null;
  const found = participants.find((p) =>
    keywords.some((k) => (p.position || '').includes(k)),
  );
  return found ? { name: found.name || '', position: found.position || '' } : null;
}

function normalizeLevel(level: RoadmapResult['outcome_summary']['ai_competency_level']): string {
  return level; // 이미 BEGINNER/INTERMEDIATE/ADVANCED
}

export function buildRoadmapHwpxPayload(
  inputs: RoadmapHwpxPayloadInputs,
): RoadmapHwpxPayload {
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

  // 4) 훈련체계도 매트릭스 → 단순 6열 표
  const structureRows = buildTrainingStructureTable(
    result.competencies ?? [],
    result.training_structure ?? [],
  ).map((r) => ({
    competency_name: r.competency_name,
    training_level: r.level_label,
    training_content: r.content,
    training_target: r.target_audience,
    training_method: r.method,
    training_goal: r.goal,
  }));

  // 5) 훈련대상 과업 (Ⅱ-4) - 첫 항목
  const firstTarget = improvementGoals[0];
  const trainingTarget = firstTarget
    ? {
        task_name: firstTarget.task_name ?? '',
        selection_reason: firstTarget.selection_reason ?? '',
        as_is: firstTarget.as_is ?? '',
        to_be: firstTarget.to_be ?? '',
      }
    : { task_name: '', selection_reason: '', as_is: '', to_be: '' };

  // 6) HRD이음 보고서 첨부 URL (Storage path 기반 — 실제 퍼블릭 URL은 Step 12에서 보강)
  const hrdAttachmentUrl =
    (result as RoadmapResult & { hrd_report_attachment_url?: string }).hrd_report_attachment_url
    ?? overview?.hrd_report_attachment?.file_name
    ?? '';
  // Step 6.5 legacy storage 경로도 허용
  const hrdFromLegacy =
    (roadmap.pbl_course as unknown as { hrd_report_attachment_url?: string })
      .hrd_report_attachment_url ?? '';
  const finalHrdUrl = hrdAttachmentUrl || hrdFromLegacy;

  // 7) 수행일지 차수 — interview 1차 자동 집계 (Step 12에서 차수별 확장)
  const performanceActivities =
    typedInterview
      ? [
          {
            round: typedInterview.interview_round ?? 1,
            date: [
              typedInterview.interview_date ?? '',
              typedInterview.interview_time ?? '',
            ]
              .filter(Boolean)
              .join(' '),
            content: notes?.text ?? '',
            method:
              typedInterview.interview_method === '대면'
                ? '대면(인터뷰)'
                : typedInterview.interview_method === '비대면'
                ? '비대면(화상회의)'
                : typedInterview.interview_method ?? '',
            participants: participantsToPython(participants),
          },
        ]
      : [];

  // 8) 단순 역량 필드 포맷 (배열 → 줄바꿈 텍스트)
  const competencies = (result.competencies ?? []).map((c) => ({
    name: c.name,
    definition_performance_criteria: c.definition ?? '',
    knowledge: bulletize(c.knowledge),
    skill: bulletize(c.skills),
    attitude: bulletize(c.attitudes),
  }));

  // 9) 연간 훈련계획 items
  const annualPlanItems = (result.annual_plan?.items ?? []).map((i) => ({
    competency_name: i.competency_name,
    course_name: i.course_name,
    training_type: i.format,
    training_hours: String(i.hours),
    remarks: i.notes,
  }));

  // 10) 훈련과정 명세서
  const courseSpecs = (result.course_specs ?? []).map((s) => ({
    course_name: s.course_name,
    training_type: s.format,
    recommended_program: s.recommended_program,
    training_goal: s.goal,
    main_content: s.main_content,
    training_target: s.target_audience,
    subjects: (s.subjects ?? []).map((subj) => ({
      subject_name: subj.name,
      details: splitByUnit(subj.details),
      hours: String(subj.hours),
    })),
  }));

  // 11) task_workflow items
  const taskWorkflowItems = jobTasks.map((t) => ({
    job: t.job ?? '',
    task: t.task_name ?? '',
    as_is: t.as_is ?? '',
    problem: t.problems ?? '',
    data_availability: t.data_availability ?? '',
    ai_necessity_score: t.ai_necessity ?? '',
  }));

  // 12) 보고서 날짜 (최종화 시점 우선, 없으면 updated_at)
  const reportDate = roadmap.finalized_at || roadmap.updated_at;
  const reportDateText = reportDate
    ? new Date(reportDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '';

  return {
    track: 'ROADMAP',
    fileName: buildFileName(project.company_name, roadmap.version_number),
    data: {
      // 표지
      company_name: project.company_name ?? '',
      report_date: reportDateText,
      pm_affiliation: roadmap.consultant_profile_snapshot?.affiliation ?? '',
      pm_name: pm?.name ?? '',
      internal_expert_affiliation: project.company_name ?? '',
      internal_expert_name: internalExpert?.name ?? '',

      // Ⅰ-1 수립 필요성
      establishment_necessity: result.setup_necessity || overview?.establishment_necessity || '',

      // Ⅰ-2 주요 활동
      performance_activities: performanceActivities,

      // Ⅰ-3 수립 주요 결과
      ai_competency_level: normalizeLevel(result.outcome_summary?.ai_competency_level ?? 'BEGINNER'),
      selected_tasks_text: result.outcome_summary?.selected_tasks ?? overview?.selected_tasks_summary ?? '',
      roadmap_summary: result.outcome_summary?.main_content ?? overview?.roadmap_summary ?? '',

      // Ⅱ-1 HRD이음 보고서
      hrd_report_attachment: finalHrdUrl,

      // Ⅱ-2 기업 요구분석
      company_status: cr?.company_status ?? '',
      main_problems: cr?.main_problems ?? '',
      push_willingness: cr?.push_willingness ?? '',
      expected_outcomes: cr?.expected_outcomes ?? '',

      // Ⅱ-3 과업·워크플로우
      task_workflow_items: taskWorkflowItems,
      analysis_notes_text: notes?.text ?? '',

      // Ⅱ-4 훈련대상 과업 (첫 항목)
      training_target: trainingTarget,

      // Ⅲ-1 역량 모델링
      competencies,
      ncs_used: result.ncs_used ?? false,
      ncs_methodology: result.ncs_methodology ?? '',
      ncs_derivation_method: result.ncs_derivation_method ?? '',

      // Ⅲ-2 훈련체계도 (6열 단순 표)
      training_structure_rows: structureRows,
      training_structure_method: result.training_structure_method ?? '',

      // Ⅲ-3 연간 훈련계획
      annual_plan_items: annualPlanItems,
      annual_plan_usage: result.annual_plan?.usage_plan ?? '',

      // Ⅲ-4 훈련과정 명세서
      course_specs: courseSpecs,

      // 별첨 수행일지
      employment_insurance_no: '',
      journal_attachments: '',
    },
  };
}
