import { describe, it, expect } from 'vitest';

import { buildPBLHwpxPayload } from './hwpx-payload-pbl';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';
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
        facilities: [
          { seq: 1, category: '시설', name: '교육장 A', spec: '30석', location: '본사 3층' },
        ],
        training_instructors: [
          {
            name: '홍전문',
            internal_external: '외부',
            career_years: 10,
            work_name: 'AI 컨설팅',
            detailed_training_content: ['ML 기초'],
          },
        ],
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
    outcome_analysis: createEmptyOutcomeAnalysis(),
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

  it('pbl_content 없으면 운영계획 필드 기본값', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL({ pbl_content: null as unknown as PBLContent }),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.training_goal).toBe('');
    expect(payload.data.ai_tool_usage_plan).toEqual([]);
  });

  // ---------------------------------------------------------------
  // V2 PBL 인터뷰 (PR #28 정본) — camelCase
  // ---------------------------------------------------------------

  function makeV2Interview(): Interview {
    return {
      id: 'iv-2',
      project_id: 'proj-1',
      pbl_data: {
        // PBLOverview
        companyName: '㈜테스트',
        courseName: 'AI 자동화 과정',
        ncsCode: '200107',
        trainingHours: 40,
        trainingTarget: '데이터 분석 직무 5명',
        trainingForm: '사내 집체',
        trainingPeriod: '2026.04.01 ~ 2026.05.31',
        businessIssues: '수작업 비효율',
        // PBLAnalysis
        companyIssues: '경영 이슈 본문 (V2)',
        organization: {
          orgTree: [],
          mainWork: [
            { dept: '생산팀', role: '팀원', description: '품질 검사' },
            { dept: '영업팀', role: '팀장', description: '고객 응대' },
          ],
        },
        trainingEnv: '사내 강의실 + 외부 클라우드',
        hrdReportPdf: {
          fileName: 'hrd.pdf',
          url: 'https://x/hrd.pdf',
          size: 1024,
        },
        courseNecessity: 'AI 도입 필요성 본문',
        // PBLTasks
        activities: [
          {
            round: 1,
            date: '26/04/10',
            content: '킥오프',
            method: '대면',
            participants: 'PM 홍길동, 외부전문가 김전문',
          },
        ],
        problems: [
          { title: '문제1', description: '설명1', impact: '영향1' },
          { title: '문제2', description: '설명2', impact: '영향2' },
        ],
        priority: {
          items: [
            { problem: '문제1', score: 5, rank: 1 },
            { problem: '문제2', score: 3, rank: 2 },
          ],
          method: 'AHP',
        },
        target: {
          name: '센서 데이터 수집',
          code: '0204020107',
          scope: '생산팀 5명',
          necessity: '수동 측정 비효율 개선',
          details: [{ title: '데이터 수집', description: 'PLC 자동 수집' }],
        },
        currentAiLevel: { level: 'BASIC', note: '기초 도입 단계' },
        expectedAiLevel: { level: 'USER', note: '6개월 내 활용형 진입' },
      },
    } as unknown as Interview;
  }

  it('V2 인터뷰 — 표지/Ⅰ overview 매핑 (camelCase → snake_case)', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.company_name).toBe('㈜테스트');
    expect(payload.data.course_name).toBe('AI 자동화 과정');
    expect(payload.data.ncs_code).toBe('200107');
    expect(payload.data.training_hours).toBe('40');
    expect(payload.data.training_target_label).toBe('데이터 분석 직무 5명');
    expect(payload.data.training_form).toBe('사내 집체');
    expect(payload.data.business_issues).toBe('수작업 비효율');
  });

  it('V2 인터뷰 — Ⅱ analysis (companyIssues, organization, courseNecessity)', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.company_issues).toBe('경영 이슈 본문 (V2)');
    expect(payload.data.course_necessity).toBe('AI 도입 필요성 본문');
    // organization 은 V2 raw 구조 통째 전달
    const org = payload.data.organization as { orgTree: unknown[]; mainWork: unknown[] };
    expect(org.mainWork).toHaveLength(2);
    expect(payload.data.hrd_report_attachment).toBe('https://x/hrd.pdf');
  });

  it('V2 인터뷰 — Ⅲ tasks (activities/problems/priorities/target)', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    const activities = payload.data.activities as Array<{
      round: number;
      participants: string;
    }>;
    expect(activities).toHaveLength(1);
    expect(activities[0].participants).toBe('PM 홍길동, 외부전문가 김전문');
    const problems = payload.data.problems as Array<{ title: string }>;
    expect(problems).toHaveLength(2);
    const priorities = payload.data.priorities as Array<{ rank: number; score: number }>;
    expect(priorities[0].rank).toBe(1);
    expect(priorities[0].score).toBe(5);
    const target = payload.data.target as { name: string; necessity: string };
    expect(target.name).toBe('센서 데이터 수집');
    expect(payload.data.target_necessity).toBe('수동 측정 비효율 개선');
  });

  it('V2 인터뷰 — currentAiLevel/expectedAiLevel 영문 enum + note', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.current_ai_level).toBe('BASIC');
    expect(payload.data.current_ai_level_note).toBe('기초 도입 단계');
    expect(payload.data.expected_ai_level).toBe('USER');
    expect(payload.data.expected_ai_level_note).toBe('6개월 내 활용형 진입');
    // V1 호환 라벨도 함께 출력
    expect(payload.data.current_ai_level_label).toBe('AI기초형');
    expect(payload.data.expected_ai_level_label).toBe('AI활용형');
  });

  it('V2 인터뷰 — 운영계획 (PBLContent) 도 정상 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.training_goal).toBe('AI 역량 확보');
    expect(payload.data.training_period).toBe('2026.04.01 ~ 2026.05.31');
  });

  // ---------------------------------------------------------------
  // 분기 커버리지 보강 — V1 history/recommendations + facilities/instructors
  // ---------------------------------------------------------------

  it('V1 인터뷰 + history/recommendations 데이터 가 채워지면 .map 콜백 cover', () => {
    const iv = makeInterview();
    // V1 fixture 의 hrdNecessity 에 데이터 채움 (line 401-418 cover)
    ((iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data).hrdNecessity = {
      training_history: [
        { seq: 1, program: '직무개발', course_name: 'Python 기초', method: '집체', duration_days: 3 },
      ],
      support_history: [
        { year: '2025', annual_limit: 1000, supported: 500, ratio: '50%' },
      ],
      recommendations: [
        { id: 'r1', rank: 1, program: 'S-OJT', proposal: '체계적 현장훈련' },
      ],
      course_development_necessity: '필요성',
    };
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    const th = payload.data.training_history as Array<{ seq: number; program: string }>;
    expect(th).toHaveLength(1);
    expect(th[0].seq).toBe(1);
    expect(th[0].program).toBe('직무개발');
    const sh = payload.data.support_history as Array<{ year: string }>;
    expect(sh[0].year).toBe('2025');
    const recs = payload.data.recommendations as Array<{ rank: number; program: string }>;
    expect(recs[0].program).toBe('S-OJT');
  });

  it('PBLContent 의 facilities/training_instructors 데이터 가 채워지면 .map 콜백 cover', () => {
    // line 508-521 (facilities + training_instructors) cover
    const pblContent: PBLContent = {
      operation_plan: {
        training_goal: 'AI 역량 확보',
        ai_tool_usage_plan: [],
        training_plan: {
          overview: { course_name: 'AI 과정', training_period: { start: '2026.04.01', end: '2026.05.31' } },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: 'AI 과정',
            total_hours: 40,
            training_goals: [],
            ai_tools: [],
            utilized_data: '',
            analysis_method: '',
            training_contents: [],
            total_sum_hours: 40,
          },
          facilities: [
            { seq: 1, category: '시설', name: '교육장 A', spec: '30석', location: '본사 3층' },
            { seq: 2, category: '장비', name: 'GPU 서버', spec: 'A100', location: '서버실' },
          ],
          training_instructors: [
            {
              name: '홍전문',
              internal_external: '외부',
              career_years: 10,
              work_name: 'AI 컨설팅',
              detailed_training_content: ['ML 기초', 'MLOps 개요'],
            },
          ],
        },
        evaluation_plan: {
          course_evaluation: {
            course_name: 'AI 과정',
            evaluation_methods: [],
            evaluation_target: '',
            evaluation_date: '',
            evaluation_criteria: '',
            evaluation_result: '예정',
            performance_checklist: [],
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
      outcome_analysis: createEmptyOutcomeAnalysis(),
    };
    const payload = buildPBLHwpxPayload({
      pbl: makePBL({ pbl_content: pblContent }),
      project: makeProject(),
      interview: makeInterview(),
    });
    const facilities = payload.data.facilities as Array<{ seq: number; name: string }>;
    expect(facilities).toHaveLength(2);
    expect(facilities[0].name).toBe('교육장 A');
    expect(facilities[1].seq).toBe(2);
    const instructors = payload.data.training_instructors as Array<{
      name: string;
      detailed_training_content: string[];
    }>;
    expect(instructors).toHaveLength(1);
    expect(instructors[0].name).toBe('홍전문');
    expect(instructors[0].detailed_training_content).toEqual(['ML 기초', 'MLOps 개요']);
  });

  it('V2 인터뷰 + null hrdReportPdf → 빈 문자열 fallback', () => {
    // hrdReportPdf null branch cover (V2)
    const iv = makeV2Interview();
    ((iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data).hrdReportPdf = null;
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    expect(payload.data.hrd_report_attachment).toBe('');
  });

  it('finalized_at + updated_at 둘 다 falsy → report_date 빈 문자열', () => {
    const pbl = makePBL({
      finalized_at: null,
      updated_at: null as unknown as string,
    });
    const payload = buildPBLHwpxPayload({
      pbl,
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(payload.data.report_date).toBe('');
  });

  it('V2 인터뷰 companyName 이 빈 문자열 → project.company_name 사용', () => {
    const iv = makeV2Interview();
    ((iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data).companyName = '';
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    expect(payload.data.company_name).toBe('㈜테스트');
  });

  it('aiLevelEnumToLabel — EXPLORER/LEADER 케이스 cover', () => {
    const iv = makeV2Interview();
    ((iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data).currentAiLevel = {
      level: 'EXPLORER',
      note: '탐구 단계',
    };
    ((iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data).expectedAiLevel = {
      level: 'LEADER',
      note: 'AX 전환 도달',
    };
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    expect(payload.data.current_ai_level_label).toBe('AI탐구형');
    expect(payload.data.expected_ai_level_label).toBe('AI선도형');
  });

  it('classifyInterview — pbl_data 가 알 수 없는 형태 → empty branch', () => {
    // V1/V2 어느 쪽 키도 없는 raw 객체 → empty 분기 (classifyInterview 의 마지막 return)
    const iv = {
      id: 'iv-x',
      project_id: 'proj-1',
      pbl_data: { unknownKey: 'foo' },
    } as unknown as Interview;
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    // empty branch → buildDataEmpty 호출. company_name 은 project 값 사용.
    expect(payload.data.company_name).toBe('㈜테스트');
    expect(payload.data.activities).toEqual([]);
  });

  // ---------------------------------------------------------------
  // SSOT v2 동기화 assertion (DoD #6 재정의)
  // ---------------------------------------------------------------
  it('SSOT v2 의 모든 단일 py_key 가 출력 dict 에 존재 (V2 인터뷰)', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    const ssotV2PblPyKeys = [
      // P-01 cover (V1 호환 필드)
      'company_name',
      'course_name',
      'report_date',
      // P-02 Ⅰ overview
      'business_registration_no',
      'industry_main',
      'industry_code',
      'address',
      'training_address',
      'jurisdiction_office',
      'contact_position',
      'contact_name',
      'contact_phone',
      'contact_email',
      'ncs_code',
      'training_hours',
      'training_target_label',
      'training_form',
      'training_period',
      'business_issues',
      // P-03/P-07 Ⅱ-1-가/Ⅱ-3-나
      'company_issues',
      'course_necessity',
      // P-06 hrd_report_attachment
      'hrd_report_attachment',
      // P-12 target_necessity
      'target_necessity',
      // P-16 ops training_goal
      'training_goal',
      // P-18/P-20/P-23 ops keys
      'training_plan_course_name',
      'subject_profile_course_name',
      'total_training_hours',
      'subject_training_goals',
      'subject_ai_tools',
      'subject_utilized_data',
      'subject_analysis_method',
      'subject_total_sum_hours',
      'course_eval_course_name',
      'course_eval_target',
      'course_eval_date',
      'course_eval_criteria',
      'course_eval_result',
      'course_eval_overall_comment',
    ];
    const dataKeys = new Set(Object.keys(payload.data));
    const missing = ssotV2PblPyKeys.filter((k) => !dataKeys.has(k));
    expect(missing).toEqual([]);
  });
});
