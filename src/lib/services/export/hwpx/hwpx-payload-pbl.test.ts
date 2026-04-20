import { describe, it, expect } from 'vitest';

import { buildPBLHwpxPayload } from './hwpx-payload-pbl';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { Interview, Project } from '@/types/database';

function makeProject(): Project {
  return {
    id: 'proj-1',
    company_name: '㈜테스트',
    employee_count: 50,
    industry: '제조업',
    assigned_consultant_id: 'user-1',
    status: 'INTERVIEWED',
    track: 'PBL',
    is_test_mode: false,
    created_at: '2026-04-01',
    updated_at: '2026-04-15',
  } as unknown as Project;
}

function makePBL(overrides?: Partial<PBLReportRow>): PBLReportRow {
  const content: PBLContent = {
    operation_plan: {
      training_goal: 'AI 역량 확보',
      ai_tool_usage_plan: [
        {
          stage: '1단계',
          main_activity: '훈련실시',
          ai_tools: ['ChatGPT'],
          utilized_data: '제품 데이터',
          purpose: '역량 강화',
          specific_method: '실습',
        },
      ],
      training_plan: {
        overview: { course_name: 'AI 과정', training_period: { start: '2026.04.01', end: '2026.05.31' } },
        learning_group: { instructors: [], trainees: [] },
        subject_profile: {
          course_name: 'AI 과정',
          total_hours: 40,
          training_goals: ['기술문제 해결'],
          ai_tools: ['ChatGPT'],
          utilized_data: '제품 데이터',
          analysis_method: 'LLM',
          training_contents: [
            {
              unit_name: '데이터 수집',
              detail: '센서 데이터 정제',
              training_hours: 8,
              instructor_hours: { external: 5, internal: 3 },
            },
          ],
          total_sum_hours: 40,
        },
        facilities: [],
        training_instructors: [],
      },
      evaluation_plan: {
        course_evaluation: {
          course_name: 'AI 과정',
          evaluation_methods: ['포트폴리오'],
          evaluation_target: '훈련생 전원',
          evaluation_date: '2026.05.30',
          evaluation_criteria: '수행수준 3 이상 60% PASS',
          evaluation_result: '예정',
          performance_checklist: [
            { unit_name: '데이터 수집', evaluation_criteria: '10건 이상', performance_level: 4 },
          ],
          overall_comment: '',
          evaluation_scale: '',
        },
        result_evaluation: {
          satisfaction_survey: [null, null, null, null, null],
          achievement_survey: [null, null, null],
          external_expert_survey: [null, null, null, null, null],
          practical_application_survey: [null, null, null, null],
        },
      },
    },
    performance_analysis: {
      training_goal_categories: ['기술문제 해결'],
      quantitative_metrics: ['불량률 30% 감소'],
      qualitative_metrics: ['문제해결 역량 향상'],
      internalization_plan: ['매뉴얼 제작'],
      dissemination_plan: ['성과 발표회 개최'],
    },
  };

  return {
    id: 'pbl-1',
    project_id: 'proj-1',
    version_number: 2,
    status: 'FINAL',
    consultant_profile_snapshot: {},
    diagnosis_summary: '요약',
    pbl_content: content,
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'user-1',
    finalized_by: 'user-1',
    finalized_at: '2026-04-18T00:00:00Z',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
    ...overrides,
  };
}

function makeInterview(): Interview {
  return {
    id: 'iv-1',
    project_id: 'proj-1',
    pbl_data: {
      courseOverview: {
        company_name: '㈜테스트',
        business_registration_no: '123-45-67890',
        industry_code: 'C26',
        industry_main: '전자부품 제조',
        address: '서울',
        training_address: '본사 3층',
        jurisdiction_office: '서울지부',
        contact: { position: '부장', name: '김담당', phone: '010', email: 'a@b.com' },
        course_name: 'AI 과정',
        ncs_code: '200107',
        training_hours: 40,
        trainee_count: 10,
        training_job: '데이터 분석',
        ai_level: 'AI탐구형',
        training_goals: ['기술문제 해결', '공정 최적화'],
      },
      companyStatus: {
        business_issues: '수작업 비효율',
        organization: [{ id: 'o1', department_name: '생산팀', tasks: ['생산', '품질'] }],
      },
      trainingEnvironment: {
        proper_training_hours: 40,
        training_place: { types: ['사내'], location: '본사', special_notes: '' },
        internal_instructor: { used: true, name: '이팀장', position: '팀장' },
        target_count: 10,
        target_characteristics: { career: '대리급', level: '기초' },
        ai_infrastructure: { ai_tools: '가능', network: '양호', pc_count: 10, etc_equipment: '' },
        training_needs_analysis: '니즈',
        expectation: { as_is: '현재', to_be: '향후' },
      },
      hrdNecessity: {
        training_history: [],
        support_history: [],
        recommendations: [{ id: 'r1', rank: 1, program: 'S-OJT', proposal: '체계적 현장훈련' }],
        course_development_necessity: '필요성',
      },
      performanceActivities: {
        performance_activities: [
          {
            id: 'pa1',
            round: 1,
            date: '26/04/10',
            content: '킥오프',
            method: '회의',
            operation_mode: '대면',
            participants: { pm: '이PM', external_expert: '', internal_expert: '', jurisdiction_manager: '' },
          },
        ],
      },
      problemDefinition: {
        problem_definition: {
          background: '배경',
          core_problem: '핵심',
          scope: '범위',
          constraints: '제약',
        },
        problem_priorities: [{ id: 'pp1', problem_name: '문제1', priority: 5, selected: true }],
      },
      targetTasks: {
        target_tasks: [{ id: 'tt1', task_name: '센서 수집', necessity: 5, selected: true }],
        selection_reason: '사유',
        target_task_details: [
          {
            id: 'td1',
            task_name: '센서 수집',
            as_is: '수동',
            to_be: '자동',
            required_knowledge: 'IoT',
            required_skill: 'Python',
          },
        ],
      },
      aiLevelDiagnosis: {
        current_ai_level: 'AI탐구형',
        expected_ai_level: 'AI활용형',
        improvement_reason: '실습 강화',
      },
    },
  } as unknown as Interview;
}

describe('buildPBLHwpxPayload', () => {
  it('track=PBL 및 파일명 형식', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.track).toBe('PBL');
    expect(payload.fileName).toBe('㈜테스트_PBL_v2.hwpx');
  });

  it('표지: company_name/course_name/report_date 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.company_name).toBe('㈜테스트');
    expect(payload.data.course_name).toBe('AI 과정');
    // locale 'ko-KR'은 "2026. 04. 18." 형식
    expect(String(payload.data.report_date)).toMatch(/2026/);
  });

  it('Ⅰ. 훈련과정 개요 필드 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.ncs_code).toBe('200107');
    expect(payload.data.training_hours).toBe('40');
    expect(payload.data.trainee_count).toBe('10');
    expect(payload.data.training_goals).toEqual(['기술문제 해결', '공정 최적화']);
  });

  it('Ⅱ. 훈련환경 — 사내/사외 배열과 사내강사', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.training_place_types).toEqual(['사내']);
    expect(payload.data.internal_instructor_used).toBe(true);
    expect(payload.data.internal_instructor_name).toBe('이팀장');
  });

  it('Ⅲ. 수행활동 4역할 참석자 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    const activities = payload.data.performance_activities as Array<{
      participants: { pm: string; external_expert: string };
    }>;
    expect(activities[0].participants.pm).toBe('이PM');
    expect(activities[0].participants.external_expert).toBe('');
  });

  it('AI역량 진단 — current/expected/reason', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.ai_current_level).toBe('AI탐구형');
    expect(payload.data.ai_expected_level).toBe('AI활용형');
    expect(payload.data.ai_improvement_reason).toBe('실습 강화');
  });

  it('Ⅳ. 운영계획 — training_period "start ~ end"', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.training_period).toBe('2026.04.01 ~ 2026.05.31');
  });

  it('Ⅳ. 과정평가 결과 — "예정" 전달', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.course_eval_result).toBe('예정');
    expect(payload.data.course_evaluation_methods).toEqual(['포트폴리오']);
  });

  it('Ⅴ. 성과분석 bullets 유지', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.quantitative_metrics).toEqual(['불량률 30% 감소']);
    expect(payload.data.internalization_plan).toEqual(['매뉴얼 제작']);
  });

  it('interview null이면 빈 인터뷰 필드로 안전 처리', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: null,
    });
    expect(payload.data.business_issues).toBe('');
    expect(payload.data.training_place_types).toEqual([]);
    expect(payload.data.performance_activities).toEqual([]);
  });

  it('pbl_content 없으면 운영계획·성과분석 필드 기본값', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL({ pbl_content: null as unknown as PBLContent }),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.training_goal).toBe('');
    expect(payload.data.ai_tool_usage_plan).toEqual([]);
    expect(payload.data.quantitative_metrics).toEqual([]);
  });
});
