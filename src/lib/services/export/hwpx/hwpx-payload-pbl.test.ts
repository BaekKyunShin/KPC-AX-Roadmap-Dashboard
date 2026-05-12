import { describe, it, expect } from 'vitest';

import {
  buildPBLHwpxPayload,
  buildPBLHwpxPayloadFromInputs,
} from './hwpx-payload-pbl';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';
import type { Interview, Project } from '@/types/database';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'proj-1',
    company_name: '㈜테스트',
    employee_count: 50,
    industry: '제조업',
    assigned_consultant_id: 'user-1',
    status: 'INTERVIEWED',
    track: 'PBL',
    is_test_mode: false,
    contact_name: '담당자',
    contact_email: 'contact@test.com',
    contact_phone: '02-1234-5678',
    company_address: '서울시 강남구',
    // PBL 양식 Ⅰ. 신청서 자동표출 5필드 (마이그 071)
    business_reg_no: '999-99-99999',
    industry_code: 'C26',
    training_address: '서울시 강남구 테헤란로 100',
    jurisdiction_branch: '한국산업인력공단 서울지역본부',
    contact_position: '인사팀 과장',
    created_at: '2026-04-01',
    updated_at: '2026-04-15',
    ...overrides,
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

  // PBL-자체-01 (R8) — Project 5컬럼 (마이그 071) + 기존 4필드 → P-02 18키 매핑
  describe('PBL-자체-01: 신청서 자동표출 7필드 → P-02 18키 (R8)', () => {
    it('project 5필드 (마이그 071) 가 P-02 매핑된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeInterview(),
      });
      expect(payload.data.business_registration_no).toBe('999-99-99999');
      expect(payload.data.industry_code).toBe('C26');
      expect(payload.data.industry_main).toBe('제조업');
      expect(payload.data.training_address).toBe('서울시 강남구 테헤란로 100');
      expect(payload.data.jurisdiction_office).toBe('한국산업인력공단 서울지역본부');
      expect(payload.data.contact_position).toBe('인사팀 과장');
    });

    it('project 의 기존 4필드 (이름·이메일·연락처·주소) 도 P-02 매핑된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeInterview(),
      });
      expect(payload.data.contact_name).toBe('담당자');
      expect(payload.data.contact_email).toBe('contact@test.com');
      expect(payload.data.contact_phone).toBe('02-1234-5678');
      expect(payload.data.address).toBe('서울시 강남구');
    });

    it('project 5필드가 NULL 이어도 빈 문자열로 안전 처리된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject({
          business_reg_no: undefined,
          industry_code: undefined,
          training_address: undefined,
          jurisdiction_branch: undefined,
          contact_position: undefined,
        }),
        interview: makeInterview(),
      });
      expect(payload.data.business_registration_no).toBe('');
      expect(payload.data.industry_code).toBe('');
      expect(payload.data.training_address).toBe('');
      expect(payload.data.jurisdiction_office).toBe('');
      expect(payload.data.contact_position).toBe('');
    });

    it('인터뷰 V1 의 courseOverview 와 충돌 시 project 가 우선 (양식 의도: 신청서 자동표출 = 수정 불가)', () => {
      // V1 인터뷰는 courseOverview 안에 business_registration_no='123-45-67890' 보유.
      // project 의 신규 컬럼은 '999-99-99999' — project override 가 인터뷰값을 덮어써야 함.
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeInterview(),
      });
      // project 의 999-99-99999 가 최종 출력 (인터뷰 123-45-67890 무시)
      expect(payload.data.business_registration_no).toBe('999-99-99999');
    });
  });

  // R8 PBL-자체-02 — buildTrainingEnvP05 6 셀 매핑 분기 cover
  describe('PBL-자체-02 Phase E: P-05 11 행 매핑', () => {
    function makeV2WithTrainingEnv(env: unknown): Interview {
      const v2 = (makeV2Interview() as unknown as { pbl_data: Record<string, unknown> })
        .pbl_data;
      return {
        ...makeV2Interview(),
        pbl_data: { ...v2, trainingEnv: env },
      } as unknown as Interview;
    }

    it('trainingEnv 누락 시 11 키 모두 빈 문자열', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv(undefined),
      });
      expect(payload.data.proper_training_hours).toBe('');
      expect(payload.data.training_place_location).toBe('');
      expect(payload.data.training_place_special_notes).toBe('');
      expect(payload.data.internal_instructor_name).toBe('');
      expect(payload.data.internal_instructor_position).toBe('');
      expect(payload.data.target_career).toBe('');
      expect(payload.data.target_level).toBe('');
      expect(payload.data.training_needs_analysis).toBe('');
      expect(payload.data.expectation_as_is).toBe('');
      expect(payload.data.expectation_to_be).toBe('');
    });

    it('trainingEnv 11 영역 모두 채움 시 양식 P-05 11 행 매핑', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv({
          properTrainingHours: '회차당 4시간',
          internalPlace: '본사 교육장',
          externalPlace: '외부 AI센터',
          internalInstructors: [
            { position: '팀장', name: '김품질', career: '12년', personalTraits: '데이터 친화' },
          ],
          externalInstructors: [
            { position: '교수', name: '박AI', career: '20년', personalTraits: 'NLP 전문' },
          ],
          aiInfrastructure: 'PC 30대',
          targetCharacteristics: { career: '평균 5년', level: '대리~과장' },
          aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 30 },
          trainingNeedsAnalysis: '품질 데이터 통합 시급',
          expectationAsIs: '검사 92% 정확도',
          expectationToBe: 'AI 자동검사 96%',
        }),
      });
      // V1 호환 키 (양식 row 1~5, 8)
      expect(payload.data.proper_training_hours).toBe('회차당 4시간');
      expect(payload.data.training_place_location).toBe('본사 교육장');
      expect(payload.data.training_place_special_notes).toBe('외부 AI센터');
      expect(payload.data.internal_instructor_name).toBe('김품질');
      expect(payload.data.internal_instructor_position).toBe('팀장');
      expect(payload.data.ai_tools_status).toBe('가능');
      expect(payload.data.network_status).toBe('양호');
      expect(payload.data.pc_count).toBe('30');
      expect(payload.data.etc_equipment).toBe('PC 30대');
      // Phase E 신규 5 키 (양식 row 6/7/9/11)
      expect(payload.data.target_career).toBe('평균 5년');
      expect(payload.data.target_level).toBe('대리~과장');
      expect(payload.data.training_needs_analysis).toBe('품질 데이터 통합 시급');
      expect(payload.data.expectation_as_is).toBe('검사 92% 정확도');
      expect(payload.data.expectation_to_be).toBe('AI 자동검사 96%');
    });

    it('trainingEnv 빈 객체 (모든 필드 default) 시 11 키 모두 빈 문자열', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv({
          properTrainingHours: '',
          internalPlace: '',
          externalPlace: '',
          internalInstructors: [],
          externalInstructors: [],
          aiInfrastructure: '',
          targetCharacteristics: { career: '', level: '' },
          aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
          trainingNeedsAnalysis: '',
          expectationAsIs: '',
          expectationToBe: '',
        }),
      });
      expect(payload.data.proper_training_hours).toBe('');
      expect(payload.data.training_place_location).toBe('');
      expect(payload.data.target_career).toBe('');
      expect(payload.data.training_needs_analysis).toBe('');
      expect(payload.data.expectation_to_be).toBe('');
    });
  });

  // R8 PBL-자체-05 — outcome_analysis 4 키 매핑 분기 cover
  describe('PBL-자체-05: Ⅴ. outcome_analysis 4 키 매핑 (R8)', () => {
    it('outcome_analysis 부재 시 4 키 모두 빈 문자열', () => {
      const pblNoOutcome = makePBL({
        pbl_content: {
          ...((makePBL().pbl_content as unknown) as Record<string, unknown>),
          outcome_analysis: undefined,
        } as unknown as PBLContent,
      });
      const payload = buildPBLHwpxPayload({
        pbl: pblNoOutcome,
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.quantitative_metrics).toBe('');
      expect(payload.data.qualitative_metrics).toBe('');
      expect(payload.data.internalization_plan).toBe('');
      expect(payload.data.dissemination_plan).toBe('');
    });

    it('outcome_analysis 채움 시 4 키 매핑', () => {
      const baseContent = (makePBL().pbl_content as unknown) as Record<string, unknown>;
      const pblWithOutcome = makePBL({
        pbl_content: {
          ...baseContent,
          outcome_analysis: {
            outcome_metrics: {
              selected_goals: ['기술문제 해결'],
              quantitative: '불량률 10% 감소',
              qualitative: '협업 만족도 향상',
            },
            diffusion_strategy: {
              internalization: '매뉴얼 정비 + 멘토링',
              company_wide_diffusion: '경영진 보고 + 타 부서 적용',
            },
          },
        } as unknown as PBLContent,
      });
      const payload = buildPBLHwpxPayload({
        pbl: pblWithOutcome,
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.quantitative_metrics).toBe('불량률 10% 감소');
      expect(payload.data.qualitative_metrics).toBe('협업 만족도 향상');
      expect(payload.data.internalization_plan).toBe('매뉴얼 정비 + 멘토링');
      expect(payload.data.dissemination_plan).toBe('경영진 보고 + 타 부서 적용');
    });
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
        // R8 PBL-자체-02 — 정형 객체
        trainingEnv: {
          properTrainingHours: '40h',
          internalPlace: '사내 강의실',
          externalPlace: '외부 클라우드',
          internalInstructors: [],
          externalInstructors: [],
          aiInfrastructure: '',
        },
        hrdReportPdf: {
          fileName: 'hrd.pdf',
          url: 'https://x/hrd.pdf',
          size: 1024,
        },
        courseNecessity: 'AI 도입 필요성 본문',
        // PBLTasks (R8 PBL-자체-03 — 평면 4행 배열)
        activities: [
          { round: 1, role: 'PM', personName: '홍길동', date: '26/04/10', content: '킥오프', method: '대면' },
          { round: 1, role: 'EXTERNAL_EXPERT', personName: '김전문', date: '26/04/10', content: '전문가 자문', method: '대면' },
          { round: 1, role: 'INTERNAL_EXPERT', personName: '박관리', date: '26/04/10', content: '내부 공유', method: '대면' },
          { round: 1, role: 'JURISDICTION_MANAGER', personName: '이주치', date: '26/04/10', content: 'HRD 점검', method: '서면' },
        ],
        // R8 PBL-자체-04 — 4 정형 항목 단일 세트
        problemDefinitionSheet: {
          background: '문제 발생 배경',
          core: '핵심 문제',
          scope: '문제 범위',
          constraints: '제약 조건',
        },
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
          details: [
            {
              title: '데이터 수집',
              as_is: '수동 측정',
              to_be: 'PLC 자동 수집',
              required_knowledge: '센서 데이터 구조',
              required_skill: 'Python pandas',
            },
          ],
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

  it('V2 인터뷰 — Ⅱ analysis (companyIssues, courseNecessity) — Phase E: organization 빈 객체', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.company_issues).toBe('경영 이슈 본문 (V2)');
    expect(payload.data.course_necessity).toBe('AI 도입 필요성 본문');
    // Phase E: 조직 및 주요 업무는 인터뷰/결과/HWPX 3 계층에서 제거 (로드맵과 동일).
    // 빈 객체로 송신해 Python 측 _fill_pbl_organization (disabled) 와 호환.
    const org = payload.data.organization as { orgTree: unknown[]; mainWork: unknown[] };
    expect(org.orgTree).toEqual([]);
    expect(org.mainWork).toEqual([]);
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
      role: string;
      person_name: string;
    }>;
    // R8 PBL-자체-03 — 평면 4행 배열 (1차 × 4 역할)
    expect(activities).toHaveLength(4);
    expect(activities[0].role).toBe('PM');
    expect(activities[0].person_name).toBe('홍길동');
    expect(activities[1].role).toBe('EXTERNAL_EXPERT');
    expect(activities[1].person_name).toBe('김전문');
    // R8 PBL-자체-04 — problems 배열 폐기, problem_definition_sheet 단일 객체
    const problemSheet = payload.data.problem_definition_sheet as {
      background: string;
      core: string;
      scope: string;
      constraints: string;
    };
    expect(problemSheet.core).toBe('핵심 문제');
    expect(problemSheet.background).toBe('문제 발생 배경');
    expect(problemSheet.scope).toBe('문제 범위');
    expect(problemSheet.constraints).toBe('제약 조건');
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

// ─── buildPBLHwpxPayloadFromInputs (테스트 모드 in-memory 경로) ──────────────
describe('buildPBLHwpxPayloadFromInputs', () => {
  const sampleContent: PBLContent = {
    operation_plan: {
      training_goal: '',
      ai_tool_usage_plan: [],
      training_plan: {} as never,
      evaluation_plan: {} as never,
    },
    outcome_analysis: createEmptyOutcomeAnalysis(),
  } as unknown as PBLContent;

  it('V2 인터뷰 + content → V2 path 의 data 와 동일 키 set 반환', () => {
    const payload = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '㈜테스트',
    });
    expect(payload.track).toBe('PBL');
    expect(payload.fileName).toMatch(/\.hwpx$/);
    expect(payload.data.company_name).toBe(PBL_INTERVIEW_SAMPLE.companyName);
    expect(payload.data.course_name).toBe(PBL_INTERVIEW_SAMPLE.courseName);
  });

  it('인터뷰 companyName 우선, 비면 인자 companyName, 둘 다 비면 "테스트기업" fallback', () => {
    const blankInterview = {
      ...PBL_INTERVIEW_SAMPLE,
      companyName: '',
    };
    const a = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: blankInterview,
      companyName: '인자기업',
    });
    expect(a.data.company_name).toBe('인자기업');

    const b = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: blankInterview,
      companyName: '   ',
    });
    expect(b.data.company_name).toBe('테스트기업');
  });

  it('versionNumber 기본 1, 명시 시 fileName 에 반영', () => {
    const v1 = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '㈜테스트',
    });
    expect(v1.fileName).toContain('_v1.hwpx');
    const v3 = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '㈜테스트',
      versionNumber: 3,
    });
    expect(v3.fileName).toContain('_v3.hwpx');
  });
});
