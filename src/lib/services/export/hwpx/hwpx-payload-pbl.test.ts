import { describe, it, expect } from 'vitest';

import { buildPBLHwpxPayload, buildPBLHwpxPayloadFromInputs } from './hwpx-payload-pbl';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { Interview, Project } from '@/types/database';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
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
      // Ⅳ-2 성과분석 측정 지표 (v1 Ⅴ장에서 operation_plan 으로 이동)
      outcome_metrics: {
        selected_goals: ['기술문제 해결'],
        quantitative: '불량률 10% 감소',
        qualitative: '협업 만족도 향상',
      },
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
        overview: {
          course_name: 'AI 과정',
          training_period: { start: '2026.04.01', end: '2026.05.31' },
        },
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

/** V2 PBL 인터뷰 (양식 v2 정본, camelCase). AI역량·우선순위·수행활동 자체입력은 제거됨. */
function makeV2Interview(): Interview {
  return {
    id: 'iv-2',
    project_id: 'proj-1',
    pbl_data: {
      companyName: '㈜테스트',
      courseName: 'AI 자동화 과정',
      ncsCode: '200107',
      trainingHours: 40,
      trainingTarget: '데이터 분석 직무 5명',
      trainingForm: '사내 집체',
      trainingPeriod: '2026.04.01 ~ 2026.05.31',
      businessIssues: '수작업 비효율',
      companyIssues: '경영 이슈 본문 (V2)',
      organization: {
        orgTree: [],
        mainWork: [{ dept: '생산팀', role: '팀원', description: '품질 검사' }],
      },
      trainingEnv: {
        properTrainingHours: '40h',
        internalPlace: '사내 강의실',
        externalPlace: '외부 클라우드',
        internalInstructors: [],
        externalInstructors: [],
        aiInfrastructure: '',
      },
      hrdReportPdf: { fileName: 'hrd.pdf', url: 'https://x/hrd.pdf', size: 1024 },
      courseNecessity: 'AI 도입 필요성 본문',
      // Ⅲ-1 수행활동 — PBL 자체 입력 (로드맵 인터뷰와 다른 일정·4역할)
      performanceActivities: [
        {
          round: 1,
          date: '25/04/10',
          content: '핵심문제 파악 워크숍',
          method: 'WORKSHOP',
          participants: {
            pm: '박PBL',
            external_expert: '이직무',
            internal_expert: '박내부전문가',
            jurisdiction_manager: '최주치의',
          },
        },
      ],
      problemDefinitionSheet: {
        background: '문제 발생 배경',
        core: '핵심 문제',
        scope: '문제 범위',
        constraints: '제약 조건',
      },
      // Ⅲ-3: 로드맵 과업 목록에 대한 PBL 선정 입력(2컬럼) + 선정 사유 + 세부내용
      target: {
        taskSelections: [
          { ai_necessity: '높음', training_selected: true },
          { ai_necessity: '보통', training_selected: false },
        ],
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
    },
  } as unknown as Interview;
}

/** 선행 로드맵 인터뷰(camelCase 복원본, hydrateRoadmapInterview 출력 형태). */
function makeLinkedRoadmap(): Partial<RoadmapInterviewStrict> {
  return {
    establishmentNecessity: '로드맵 수립 배경',
    performanceActivities: [
      {
        round: 1,
        date: '26/03/01',
        timeRange: '10:00~12:00',
        content: '현장 인터뷰',
        method: 'ONSITE',
        pmName: '김PM',
        expertName: '이내부',
      },
    ],
    aiLevel: 'INTERMEDIATE',
    selectedTask: '품질 검사 자동화',
    companyRequirements: {
      status: '수작업 중심',
      problem: '비효율',
      will: '높음',
      outcomes: '생산성 향상',
    },
    taskAnalysis: [
      { domain: '생산', task: '품질 검사', asIs: '수동 육안', improvement: 'AI 자동 판정' },
      { domain: '생산', task: '데이터 수집', asIs: '수기 기록', improvement: '센서 자동화' },
    ],
    targetTask: {
      name: '품질 검사',
      reason: '핵심 병목',
      expectedAsIs: '수동',
      expectedToBe: '자동',
    },
  };
}

describe('buildPBLHwpxPayload', () => {
  it('track=PBL 및 파일명 형식', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.track).toBe('PBL');
    expect(payload.fileName).toBe('㈜테스트_PBL_v2.hwpx');
  });

  it('표지: company_name/course_name/report_date 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.company_name).toBe('㈜테스트');
    expect(payload.data.course_name).toBe('AI 자동화 과정');
    // 로케일·타임존 비의존 결정론 포맷 `YYYY. MM. DD.` (UTC 기준, finalized_at 2026-04-18Z)
    expect(String(payload.data.report_date)).toBe('2026. 04. 18.');
  });

  it('Ⅰ. 훈련과정 개요 필드 매핑', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.ncs_code).toBe('200107');
    expect(payload.data.training_hours).toBe('40');
    expect(payload.data.training_target_label).toBe('데이터 분석 직무 5명');
    expect(payload.data.training_form).toBe('사내 집체');
  });

  // Project 신청서 자동표출 → Ⅰ. 개요 override
  describe('신청서 자동표출: Project → Ⅰ. 개요 override', () => {
    it('project 필드가 Ⅰ. 개요에 매핑된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.business_registration_no).toBe('999-99-99999');
      expect(payload.data.industry_code).toBe('C26');
      expect(payload.data.industry_main).toBe('제조업');
      expect(payload.data.training_address).toBe('서울시 강남구 테헤란로 100');
      expect(payload.data.jurisdiction_office).toBe('한국산업인력공단 서울지역본부');
      expect(payload.data.contact_position).toBe('인사팀 과장');
      expect(payload.data.contact_name).toBe('담당자');
      expect(payload.data.contact_email).toBe('contact@test.com');
      expect(payload.data.contact_phone).toBe('02-1234-5678');
      expect(payload.data.address).toBe('서울시 강남구');
    });

    it('project 필드가 NULL 이어도 빈 문자열로 안전 처리된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject({
          business_reg_no: undefined,
          industry_code: undefined,
          training_address: undefined,
          jurisdiction_branch: undefined,
          contact_position: undefined,
        }),
        interview: makeV2Interview(),
      });
      expect(payload.data.business_registration_no).toBe('');
      expect(payload.data.industry_code).toBe('');
      expect(payload.data.training_address).toBe('');
      expect(payload.data.jurisdiction_office).toBe('');
      expect(payload.data.contact_position).toBe('');
    });
  });

  // buildTrainingEnvP05 — Ⅱ-3 훈련환경 매핑 분기 cover
  describe('Ⅱ-3 훈련환경(P-05) 매핑', () => {
    function makeV2WithTrainingEnv(env: unknown): Interview {
      const v2 = (makeV2Interview() as unknown as { pbl_data: Record<string, unknown> }).pbl_data;
      return {
        ...makeV2Interview(),
        pbl_data: { ...v2, trainingEnv: env },
      } as unknown as Interview;
    }

    it('trainingEnv 누락 시 키 모두 빈 문자열', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv(undefined),
      });
      expect(payload.data.proper_training_hours).toBe('');
      expect(payload.data.training_place_location).toBe('');
      expect(payload.data.internal_instructor_name).toBe('');
      expect(payload.data.target_career).toBe('');
      expect(payload.data.training_needs_analysis).toBe('');
      expect(payload.data.expectation_as_is).toBe('');
      expect(payload.data.expectation_to_be).toBe('');
      expect(payload.data.target_count).toBe('');
      expect(payload.data.internal_instructor_usage).toBe('');
      expect(payload.data.etc_equipment).toBe('');
    });

    it('trainingEnv 채움 시 양식 매핑', () => {
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
          externalInstructors: [],
          aiInfrastructure: 'PC 30대',
          targetCharacteristics: { career: '평균 5년', level: '대리~과장' },
          aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 30 },
          trainingNeedsAnalysis: '품질 데이터 통합 시급',
          expectationAsIs: '검사 92% 정확도',
          expectationToBe: 'AI 자동검사 96%',
        }),
      });
      expect(payload.data.proper_training_hours).toBe('회차당 4시간');
      expect(payload.data.training_place_location).toBe('본사 교육장');
      expect(payload.data.training_place_special_notes).toBe('외부 AI센터');
      expect(payload.data.ai_tools_status).toBe('가능');
      expect(payload.data.network_status).toBe('양호');
      expect(payload.data.pc_count).toBe('30');
      expect(payload.data.etc_equipment).toBe('PC 30대');
      expect(payload.data.target_career).toBe('평균 5년');
      expect(payload.data.target_level).toBe('대리~과장');
      expect(payload.data.training_needs_analysis).toBe('품질 데이터 통합 시급');
      expect(payload.data.expectation_as_is).toBe('검사 92% 정확도');
      expect(payload.data.expectation_to_be).toBe('AI 자동검사 96%');
    });

    it('targetTraineeCount → target_count 문자열, usage=YES + primary 매핑', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv({
          properTrainingHours: '24시간',
          internalPlace: '본사',
          externalPlace: '',
          internalInstructors: [],
          externalInstructors: [],
          aiInfrastructure: '',
          targetCharacteristics: { career: '', level: '' },
          aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
          trainingNeedsAnalysis: '',
          expectationAsIs: '',
          expectationToBe: '',
          targetTraineeCount: 15,
          internalInstructorUsage: 'YES',
          internalInstructorPrimary: { name: '홍길동', position: '생산팀장' },
          otherEquipment: '프로젝터 2대',
        }),
      });
      expect(payload.data.target_count).toBe('15');
      expect(payload.data.internal_instructor_usage).toBe('YES');
      expect(payload.data.internal_instructor_name).toBe('홍길동');
      expect(payload.data.internal_instructor_position).toBe('생산팀장');
      expect(payload.data.etc_equipment).toBe('프로젝터 2대');
    });

    it('usage=NO → 강사 배열이 있어도 name/position 빈 문자열', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2WithTrainingEnv({
          properTrainingHours: '',
          internalPlace: '',
          externalPlace: '',
          internalInstructors: [
            { position: '팀장', name: '김품질', career: '12년', personalTraits: '' },
          ],
          externalInstructors: [],
          aiInfrastructure: '',
          targetCharacteristics: { career: '', level: '' },
          aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
          trainingNeedsAnalysis: '',
          expectationAsIs: '',
          expectationToBe: '',
          targetTraineeCount: 0,
          internalInstructorUsage: 'NO',
          internalInstructorPrimary: { name: '', position: '' },
          otherEquipment: '',
        }),
      });
      expect(payload.data.internal_instructor_usage).toBe('NO');
      expect(payload.data.internal_instructor_name).toBe('');
      expect(payload.data.internal_instructor_position).toBe('');
    });
  });

  // 표지 4 서명자 (PM/외부전문가/내부전문가/주치의) 자동 인입
  describe('표지 서명자 자동 인입 (signerMeta 옵션)', () => {
    it('signerMeta 미전달 시 표지 빈 문자열 (internal_expert_affiliation 은 companyName fallback)', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.pm_affiliation).toBe('');
      expect(payload.data.pm_name).toBe('');
      expect(payload.data.external_expert_affiliation).toBe('');
      expect(payload.data.internal_expert_affiliation).toBe('㈜테스트');
      expect(payload.data.doctor_affiliation).toBe('');
      expect(payload.data.doctor_name).toBe('');
    });

    it('signerMeta 전달 시 표지 8 필드 모두 자동 채움', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        signerMeta: {
          pm: { affiliation: '컨설팅랩', name: '김컨설' },
          external_expert: { affiliation: '서울대 AI', name: '박전문' },
          internal_expert: { affiliation: 'AI테크㈜', name: '이내부' },
          doctor: { affiliation: '주치의센터', name: '최주치' },
        },
      });
      expect(payload.data.pm_affiliation).toBe('컨설팅랩');
      expect(payload.data.pm_name).toBe('김컨설');
      expect(payload.data.external_expert_name).toBe('박전문');
      expect(payload.data.internal_expert_affiliation).toBe('AI테크㈜');
      expect(payload.data.doctor_name).toBe('최주치');
    });

    it('signerMeta 부분 전달 (PM 만) 시 명시된 것만 채워지고 나머지는 fallback', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        signerMeta: { pm: { affiliation: '컨설팅랩', name: '김컨설' } },
      });
      expect(payload.data.pm_affiliation).toBe('컨설팅랩');
      expect(payload.data.external_expert_affiliation).toBe('');
      expect(payload.data.internal_expert_affiliation).toBe('㈜테스트');
    });
  });

  // Ⅳ-2 성과분석 측정 지표 (operation_plan.outcome_metrics 로 이동)
  describe('Ⅳ-2 성과분석 측정 지표 (outcome_metrics)', () => {
    it('operation_plan.outcome_metrics → training_goals/quantitative/qualitative', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.training_goals).toEqual(['기술문제 해결']);
      expect(payload.data.quantitative_metrics).toBe('불량률 10% 감소');
      expect(payload.data.qualitative_metrics).toBe('협업 만족도 향상');
    });

    it('outcome_metrics 부재 시 빈 값', () => {
      const base = makePBL();
      const content = base.pbl_content as PBLContent;
      const pblNoMetrics = makePBL({
        pbl_content: {
          operation_plan: {
            ...content.operation_plan,
            outcome_metrics: undefined as never,
          },
        } as unknown as PBLContent,
      });
      const payload = buildPBLHwpxPayload({
        pbl: pblNoMetrics,
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.training_goals).toEqual([]);
      expect(payload.data.quantitative_metrics).toBe('');
      expect(payload.data.qualitative_metrics).toBe('');
    });
  });

  // Ⅲ-2 문제 정의서 · Ⅲ-3 훈련대상 업무 (인터뷰 자체 입력)
  describe('Ⅲ 훈련과제 도출 (인터뷰 입력)', () => {
    it('Ⅲ-2-가 문제 정의서 4 항목', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      const sheet = payload.data.problem_definition_sheet as {
        background: string;
        core: string;
        scope: string;
        constraints: string;
      };
      expect(sheet.background).toBe('문제 발생 배경');
      expect(sheet.core).toBe('핵심 문제');
      expect(sheet.scope).toBe('문제 범위');
      expect(sheet.constraints).toBe('제약 조건');
    });

    it('Ⅲ-3-나 선정 사유 + Ⅲ-3-다 세부내용(5필드)', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.target_necessity).toBe('수동 측정 비효율 개선');
      const details = payload.data.target_details as Array<{
        title: string;
        as_is: string;
        to_be: string;
        required_knowledge: string;
        required_skill: string;
      }>;
      expect(details).toHaveLength(1);
      expect(details[0].title).toBe('데이터 수집');
      expect(details[0].as_is).toBe('수동 측정');
      expect(details[0].to_be).toBe('PLC 자동 수집');
      expect(details[0].required_knowledge).toBe('센서 데이터 구조');
      expect(details[0].required_skill).toBe('Python pandas');
    });
  });

  // ★ 로드맵 자동 연계 (Ⅱ-1-나 / Ⅱ-2 / Ⅲ-1 / Ⅲ-3-가)
  describe('로드맵 자동 연계 (linkedRoadmap)', () => {
    it('Ⅱ-1-나 로드맵 수립 — 배경·주요활동·AI역량·선정 과업', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      expect(payload.data.roadmap_setup_background).toBe('로드맵 수립 배경');
      const acts = payload.data.roadmap_setup_activities as Array<{
        round: number;
        date: string;
        content: string;
        method: string;
        pm_name: string;
        expert_name: string;
      }>;
      expect(acts).toHaveLength(1);
      expect(acts[0].pm_name).toBe('김PM');
      expect(acts[0].expert_name).toBe('이내부');
      expect(acts[0].date).toContain('26/03/01');
      // ONSITE → 한글 라벨 변환
      expect(acts[0].method).not.toBe('ONSITE');
      expect(payload.data.roadmap_ai_level).toBe('INTERMEDIATE');
      expect(payload.data.roadmap_selected_task).toBe('품질 검사 자동화');
    });

    it('Ⅱ-1-나 r2 요약 — linkedRoadmapSummary → roadmap_summary 매핑', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
        linkedRoadmapSummary: '로드맵 수립 결과를 한 장으로 요약함',
      });
      expect(payload.data.roadmap_summary).toBe('로드맵 수립 결과를 한 장으로 요약함');
    });

    it('요약 미공급(linkedRoadmapSummary 없음) → roadmap_summary 빈 값 폴백', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.roadmap_summary).toBe('');
    });

    it('Ⅱ-2 요구분석 — company_status/problems/will/outcomes + 과업분석표 + 대상 과업', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      expect(payload.data.roadmap_req_company_status).toBe('수작업 중심');
      expect(payload.data.roadmap_req_main_problems).toBe('비효율');
      expect(payload.data.roadmap_req_push_willingness).toBe('높음');
      expect(payload.data.roadmap_req_expected_outcomes).toBe('생산성 향상');
      const tasks = payload.data.roadmap_task_analysis as Array<{
        job: string;
        task: string;
        improvement: string;
      }>;
      expect(tasks).toHaveLength(2);
      expect(tasks[0].job).toBe('생산');
      expect(tasks[0].task).toBe('품질 검사');
      expect(tasks[0].improvement).toBe('AI 자동 판정');
      const target = payload.data.roadmap_target_task as {
        name: string;
        reason: string;
        as_is: string;
        to_be: string;
      };
      expect(target.name).toBe('품질 검사');
      expect(target.to_be).toBe('자동');
    });

    it('Ⅲ-3-가 훈련대상 업무 선정 — 로드맵 과업 4열 + PBL 2열(AI필요도·훈련선정) zip', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      const selections = payload.data.roadmap_task_selections as Array<{
        job: string;
        task: string;
        ai_necessity: string;
        training_selected: boolean;
      }>;
      expect(selections).toHaveLength(2);
      // 로드맵 과업(4열) + PBL taskSelections(2열) 인덱스 1:1 결합
      expect(selections[0].task).toBe('품질 검사');
      expect(selections[0].ai_necessity).toBe('높음');
      expect(selections[0].training_selected).toBe(true);
      expect(selections[1].task).toBe('데이터 수집');
      expect(selections[1].ai_necessity).toBe('보통');
      expect(selections[1].training_selected).toBe(false);
    });

    it('Ⅲ-1 수행활동 — PBL 자체 입력을 쓴다 (로드맵 활동 재사용 금지)', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      const perf = payload.data.pbl_perf_activities as Array<{
        round: number;
        date: string;
        content: string;
        method: string;
        pm_name: string;
        external_expert_name: string;
        internal_expert_name: string;
        jurisdiction_manager_name: string;
      }>;
      expect(perf).toHaveLength(1);
      // PBL 인터뷰 값 — 로드맵 인터뷰 날짜('26.01.02')가 아니어야 한다.
      expect(perf[0].date).toBe('25/04/10');
      expect(perf[0].content).toBe('핵심문제 파악 워크숍');
      // 정본 4역할 모두 채워진다 (기존 결함: 외부전문가·주치의 행이 항상 공란)
      expect(perf[0].pm_name).toBe('박PBL');
      expect(perf[0].external_expert_name).toBe('이직무');
      expect(perf[0].internal_expert_name).toBe('박내부전문가');
      expect(perf[0].jurisdiction_manager_name).toBe('최주치의');
    });

    it('Ⅲ-1 수행활동 — 옛 로드맵 연계 키(roadmap_perf_activities) 는 더 이상 존재하지 않는다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      expect(payload.data).not.toHaveProperty('roadmap_perf_activities');
    });

    it('Ⅲ-1 수행활동 — PBL 미입력 시 로드맵 활동으로 폴백하지 않고 빈 배열', () => {
      const interview = makeV2Interview() as unknown as {
        pbl_data: Record<string, unknown>;
      };
      delete interview.pbl_data.performanceActivities;
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: interview as unknown as Interview,
        // 로드맵에는 활동이 있으나 Ⅲ-1 에는 흘러들어가면 안 된다.
        linkedRoadmap: makeLinkedRoadmap(),
      });
      expect(payload.data.pbl_perf_activities).toEqual([]);
      // Ⅱ-1-나(P-05) 는 로드맵 소스라 그대로 채워진다.
      expect(payload.data.roadmap_setup_activities).toHaveLength(1);
    });

    it('Ⅲ-1 수행활동 — 수행 방법 코드는 양식 한글 라벨로 변환된다', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      const perf = payload.data.pbl_perf_activities as Array<{ method: string }>;
      expect(perf[0].method).toBe('워크숍');
    });

    it('미연계(linkedRoadmap 없음) → Ⅱ장 연계 키 빈 값 폴백', () => {
      const payload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(payload.data.roadmap_setup_background).toBe('');
      expect(payload.data.roadmap_setup_activities).toEqual([]);
      expect(payload.data.roadmap_ai_level).toBe('');
      expect(payload.data.roadmap_selected_task).toBe('');
      expect(payload.data.roadmap_req_company_status).toBe('');
      expect(payload.data.roadmap_task_analysis).toEqual([]);
      expect(payload.data.roadmap_task_selections).toEqual([]);
      const target = payload.data.roadmap_target_task as { name: string };
      expect(target.name).toBe('');
      // Ⅲ-1 은 로드맵 연계가 아니므로 미연계와 무관하게 PBL 인터뷰 값이 유지된다.
      expect(payload.data.pbl_perf_activities).toHaveLength(1);
    });

    it('training_job — 로드맵 선정 과업 우선', () => {
      const linkedPayload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
        linkedRoadmap: makeLinkedRoadmap(),
      });
      expect(linkedPayload.data.training_job).toBe('품질 검사 자동화');
      // 미연계 시 courseName fallback
      const noLinkPayload = buildPBLHwpxPayload({
        pbl: makePBL(),
        project: makeProject(),
        interview: makeV2Interview(),
      });
      expect(noLinkPayload.data.training_job).toBe('AI 자동화 과정');
    });
  });

  it('Ⅱ-1-가 companyIssues / Ⅱ-1-다 courseNecessity 매핑 + organization 빈 객체', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.company_issues).toBe('경영 이슈 본문 (V2)');
    expect(payload.data.course_necessity).toBe('AI 도입 필요성 본문');
    const org = payload.data.organization as { orgTree: unknown[]; mainWork: unknown[] };
    expect(org.orgTree).toEqual([]);
    expect(org.mainWork).toEqual([]);
    expect(payload.data.hrd_report_attachment).toBe('https://x/hrd.pdf');
  });

  it('Ⅳ. 운영계획 — training_goal / training_period', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.training_goal).toBe('AI 역량 확보');
    expect(payload.data.training_period).toBe('2026.04.01 ~ 2026.05.31');
  });

  it('Ⅳ. 과정평가 결과 — "예정" 전달', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.course_eval_result).toBe('예정');
    expect(payload.data.course_evaluation_methods).toEqual(['포트폴리오']);
  });

  it('PBLContent 의 facilities/training_instructors .map 콜백 cover', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    const facilities = payload.data.facilities as Array<{ seq: number; name: string }>;
    expect(facilities[0].name).toBe('교육장 A');
    const instructors = payload.data.training_instructors as Array<{ name: string }>;
    expect(instructors[0].name).toBe('홍전문');
  });

  it('interview null이면 빈 인터뷰 필드로 안전 처리', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: null,
    });
    expect(payload.data.business_issues).toBe('');
    expect(payload.data.company_issues).toBe('');
    expect(payload.data.roadmap_task_selections).toEqual([]);
  });

  it('pbl_data 가 알 수 없는 형태여도 빈 필드로 안전 처리', () => {
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
    expect(payload.data.company_name).toBe('㈜테스트');
    expect(payload.data.company_issues).toBe('');
    expect(payload.data.target_details).toEqual([]);
  });

  it('pbl_content 없으면 운영계획 필드 기본값', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL({ pbl_content: null as unknown as PBLContent }),
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.training_goal).toBe('');
    expect(payload.data.ai_tool_usage_plan).toEqual([]);
    expect(payload.data.training_goals).toEqual([]);
  });

  it('finalized_at + updated_at 둘 다 falsy → report_date 빈 문자열', () => {
    const pbl = makePBL({ finalized_at: null, updated_at: null as unknown as string });
    const payload = buildPBLHwpxPayload({
      pbl,
      project: makeProject(),
      interview: makeV2Interview(),
    });
    expect(payload.data.report_date).toBe('');
  });

  it('V2 인터뷰 companyName 이 빈 문자열 → project.company_name 사용', () => {
    const iv = makeV2Interview();
    (iv as unknown as { pbl_data: Record<string, unknown> }).pbl_data.companyName = '';
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: iv,
    });
    expect(payload.data.company_name).toBe('㈜테스트');
  });

  // SSOT v2 py_key 동기화 assertion
  it('SSOT v2 의 핵심 py_key 가 출력 dict 에 존재', () => {
    const payload = buildPBLHwpxPayload({
      pbl: makePBL(),
      project: makeProject(),
      interview: makeV2Interview(),
      linkedRoadmap: makeLinkedRoadmap(),
    });
    const requiredKeys = [
      'company_name',
      'course_name',
      'report_date',
      'business_registration_no',
      'ncs_code',
      'training_hours',
      'training_target_label',
      'training_form',
      'training_period',
      'business_issues',
      'company_issues',
      'course_necessity',
      'hrd_report_attachment',
      'target_necessity',
      'target_details',
      // 로드맵 연계
      'roadmap_setup_background',
      'roadmap_setup_activities',
      'roadmap_ai_level',
      'roadmap_selected_task',
      'roadmap_req_company_status',
      'roadmap_req_main_problems',
      'roadmap_req_push_willingness',
      'roadmap_req_expected_outcomes',
      'roadmap_task_analysis',
      'roadmap_target_task',
      'roadmap_task_selections',
      // Ⅲ-1 수행활동 (PBL 자체 입력 — 로드맵 연계 아님)
      'pbl_perf_activities',
      // Ⅳ 운영계획
      'training_goal',
      'training_goals',
      'quantitative_metrics',
      'qualitative_metrics',
      'training_plan_course_name',
      'subject_profile_course_name',
      'course_eval_result',
    ];
    const dataKeys = new Set(Object.keys(payload.data));
    const missing = requiredKeys.filter((k) => !dataKeys.has(k));
    expect(missing).toEqual([]);
  });
});

// ─── buildPBLHwpxPayloadFromInputs (테스트 모드 in-memory 경로) ──────────────
describe('buildPBLHwpxPayloadFromInputs', () => {
  const sampleContent: PBLContent = {
    operation_plan: {
      training_goal: '',
      outcome_metrics: { selected_goals: [], quantitative: '', qualitative: '' },
      ai_tool_usage_plan: [],
      training_plan: {} as never,
      evaluation_plan: {} as never,
    },
  } as unknown as PBLContent;

  it('V2 인터뷰 + content → PBL payload 반환', () => {
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

  it('linkedRoadmap 전달 시 Ⅱ장 연계 키 채움', () => {
    const payload = buildPBLHwpxPayloadFromInputs({
      content: sampleContent,
      interview: PBL_INTERVIEW_SAMPLE,
      companyName: '㈜테스트',
      linkedRoadmap: makeLinkedRoadmap(),
    });
    expect(payload.data.roadmap_setup_background).toBe('로드맵 수립 배경');
    expect(payload.data.roadmap_ai_level).toBe('INTERMEDIATE');
  });

  it('인터뷰 companyName 우선, 비면 인자 companyName, 둘 다 비면 "테스트기업" fallback', () => {
    const blankInterview = { ...PBL_INTERVIEW_SAMPLE, companyName: '' };
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
