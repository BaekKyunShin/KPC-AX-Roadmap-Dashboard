/**
 * 로드맵 HWPX payload 변환기 단위 테스트 (TDD RED → GREEN).
 */
import { describe, expect, it } from 'vitest';

import { buildRoadmapHwpxPayload, type RoadmapHwpxPayloadInputs } from './hwpx-payload-roadmap';

// 테스트용 최소 RoadmapResult legacy 컬럼 구조 헬퍼
function makeRoadmapVersion(overrides: Partial<RoadmapHwpxPayloadInputs['roadmap']> = {}) {
  return {
    id: 'roadmap-1',
    project_id: 'project-1',
    version_number: 1,
    status: 'FINAL' as const,
    consultant_profile_snapshot: {
      affiliation: '한국생산성본부',
    } as RoadmapHwpxPayloadInputs['roadmap']['consultant_profile_snapshot'],
    diagnosis_summary: '진단 요약',
    roadmap_matrix: [] as unknown as RoadmapHwpxPayloadInputs['roadmap']['roadmap_matrix'],
    pbl_course: {
      competencies: [
        {
          name: 'AI 기초',
          definition: 'AI 개념 설명',
          knowledge: ['ML'],
          skills: ['도구'],
          attitudes: ['학습 의지'],
        },
      ],
      annual_plan: {
        items: [
          {
            competency_name: 'AI 기초',
            course_name: 'AI 리터러시',
            format: '사내 집체',
            hours: 8,
            notes: '1Q',
          },
        ],
        usage_plan: '분기별 실시',
      },
      setup_necessity: 'AI 도입 필요성',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE' as const,
        selected_tasks: '품질검사',
        main_content: '요약 본문',
      },
      training_structure_method: 'NCS 기반 설계',
      ncs: {
        used: true,
        methodology: 'NCS 능력단위 참조',
        derivation_method: '',
      },
      hrd_report_attachment_url: 'https://hrd.example.com/report.pdf',
    } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    courses: [
      {
        course_name: 'AI 리터러시',
        format: '사내 집체',
        recommended_program: '사업주훈련',
        goal: '이해도 향상',
        main_content: '기본 개념',
        target_audience: '전 임직원',
        subjects: [{ name: 'AI 개론', details: '1단원', hours: 4 }],
      },
    ] as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    created_by: 'user-1',
    created_at: '2026-04-17T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    free_tool_validated: true,
    time_limit_validated: true,
    ...overrides,
  } as RoadmapHwpxPayloadInputs['roadmap'];
}

function makeProject(overrides: Partial<RoadmapHwpxPayloadInputs['project']> = {}) {
  return {
    id: 'project-1',
    company_name: '테스트컴퍼니(주)',
    ...overrides,
  } as RoadmapHwpxPayloadInputs['project'];
}

function makeInterview(overrides: Partial<NonNullable<RoadmapHwpxPayloadInputs['interview']>> = {}) {
  return {
    id: 'interview-1',
    project_id: 'project-1',
    company_details: {
      roadmap_overview: {
        establishment_necessity: '인터뷰 수집 필요성',
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks_summary: '품질검사',
        roadmap_summary: '요약 본문',
      },
      roadmap_company_requirements: {
        company_status: '제조업 현황',
        main_problems: '수동 비효율',
        push_willingness: '경영진 의지',
        expected_outcomes: '불량률 30% 감소',
      },
      roadmap_analysis_notes: {
        text: '분석 노트',
        attachment_urls: [],
      },
    },
    job_tasks: [
      {
        id: '1',
        job: '생산',
        task_name: '품질검사',
        as_is: '수동',
        problems: '오탐',
        data_availability: '센서',
        ai_necessity: 5,
      },
    ],
    improvement_goals: [
      {
        id: '1',
        task_name: '품질검사',
        selection_reason: '불량률 높음',
        as_is: '수동 검사',
        to_be: 'AI 자동 검사',
      },
    ],
    interview_date: '2026-04-01',
    interview_round: 1,
    interview_time: '10:00~12:00',
    interview_method: '대면',
    participants: [
      { id: '1', name: '홍길동', position: '컨설팅책임자(PM)' },
      { id: '2', name: '김영희', position: '기업 내부전문가' },
    ],
    ...overrides,
  } as unknown as NonNullable<RoadmapHwpxPayloadInputs['interview']>;
}

describe('buildRoadmapHwpxPayload', () => {
  it('track=ROADMAP 설정 + 파일명에 기업명·버전 포함', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject({ company_name: '테스트(주)' }),
      interview: makeInterview(),
    });
    expect(p.track).toBe('ROADMAP');
    expect(p.fileName).toContain('테스트(주)');
    expect(p.fileName).toContain('v1');
    expect(p.fileName.endsWith('.hwpx')).toBe(true);
  });

  it('표지 필드: company_name, pm_name/affiliation, internal_expert_*', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.company_name).toBe('테스트컴퍼니(주)');
    expect(p.data.pm_name).toBe('홍길동');
    expect(p.data.pm_affiliation).toBe('한국생산성본부');
    expect(p.data.internal_expert_name).toBe('김영희');
  });

  it('Ⅰ-1 수립 필요성은 Step 6.5 setup_necessity 값 사용', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    // LLM 결과 setup_necessity 우선 (인터뷰에서 복사된 값)
    expect(p.data.establishment_necessity).toBe('AI 도입 필요성');
  });

  it('Ⅰ-3 outcome_summary: ai_competency_level·selected_tasks·main_content 매핑', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.ai_competency_level).toBe('INTERMEDIATE');
    expect(p.data.selected_tasks_text).toBe('품질검사');
    expect(p.data.roadmap_summary).toBe('요약 본문');
  });

  it('Ⅱ-2 기업 요구분석 4필드 매핑', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.company_status).toBe('제조업 현황');
    expect(p.data.main_problems).toBe('수동 비효율');
    expect(p.data.push_willingness).toBe('경영진 의지');
    expect(p.data.expected_outcomes).toBe('불량률 30% 감소');
  });

  it('Ⅱ-3 task_workflow_items 변환 (snake_case 통일)', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.task_workflow_items).toHaveLength(1);
    const item = (p.data.task_workflow_items as unknown[])[0] as Record<string, unknown>;
    expect(item.job).toBe('생산');
    expect(item.task).toBe('품질검사');
    expect(item.problem).toBe('오탐');
    expect(item.ai_necessity_score).toBe(5);
  });

  it('Ⅱ-3 analysis_notes_text', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.analysis_notes_text).toBe('분석 노트');
  });

  it('Ⅱ-4 training_target은 첫 항목만', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect((p.data.training_target as Record<string, string>).task_name).toBe('품질검사');
    expect((p.data.training_target as Record<string, string>).selection_reason).toBe('불량률 높음');
  });

  it('Ⅲ-1 역량 모델링: name/definition/knowledge/skill/attitude 문자열로 변환', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.competencies).toHaveLength(1);
    const c = (p.data.competencies as unknown[])[0] as Record<string, string>;
    expect(c.name).toBe('AI 기초');
    expect(c.definition_performance_criteria).toBe('AI 개념 설명');
    // 배열은 bullet 텍스트로 합침
    expect(c.knowledge).toContain('ML');
    expect(c.skill).toContain('도구');
    expect(c.attitude).toContain('학습 의지');
  });

  it('Ⅲ-1 NCS 필드: ncs_used/methodology/derivation_method', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.ncs_used).toBe(true);
    expect(p.data.ncs_methodology).toBe('NCS 능력단위 참조');
    expect(p.data.ncs_derivation_method).toBe('');
  });

  it('Ⅲ-2 훈련체계도: buildTrainingStructureTable 결과 사용', () => {
    // training_structure 포함한 케이스
    const rv = makeRoadmapVersion({
      roadmap_matrix: [
        {
          competency_name: 'AI 기초',
          level: 'BEGINNER',
          content: '개념 강의',
          target_audience: '전 임직원',
          method: '사내 집체',
          goal: 'AI 이해',
        },
      ] as unknown as RoadmapHwpxPayloadInputs['roadmap']['roadmap_matrix'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap: rv,
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.training_structure_rows).toHaveLength(1);
    const row = (p.data.training_structure_rows as unknown[])[0] as Record<string, string>;
    expect(row.competency_name).toBe('AI 기초');
    expect(row.training_level).toBe('초급');
    expect(row.training_content).toBe('개념 강의');
  });

  it('Ⅲ-2 training_structure_method', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.training_structure_method).toBe('NCS 기반 설계');
  });

  it('Ⅲ-3 연간 훈련계획 items + usage_plan', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.annual_plan_items).toHaveLength(1);
    const item = (p.data.annual_plan_items as unknown[])[0] as Record<string, unknown>;
    expect(item.course_name).toBe('AI 리터러시');
    expect(item.training_type).toBe('사내 집체');
    expect(p.data.annual_plan_usage).toBe('분기별 실시');
  });

  it('Ⅲ-4 course_specs: courses 컬럼에서 변환', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.course_specs).toHaveLength(1);
    const spec = (p.data.course_specs as unknown[])[0] as Record<string, unknown>;
    expect(spec.course_name).toBe('AI 리터러시');
    expect(spec.subjects).toHaveLength(1);
  });

  it('performance_activities: interview 1차 이상 자동집계', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    const acts = p.data.performance_activities as unknown[];
    expect(acts.length).toBeGreaterThanOrEqual(1);
    const first = acts[0] as Record<string, unknown>;
    expect(first.round).toBe(1);
    expect((first.participants as unknown[]).length).toBe(2);
  });

  it('interview가 null이면 모든 인터뷰 기반 필드는 빈 문자열/빈 배열', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: null,
    });
    expect(p.data.company_status).toBe('');
    expect(p.data.main_problems).toBe('');
    expect(p.data.task_workflow_items).toEqual([]);
    expect(p.data.performance_activities).toEqual([]);
  });

  it('training_target 미존재 시 빈 객체', () => {
    const iv = makeInterview({ improvement_goals: [] } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const tt = p.data.training_target as Record<string, string>;
    expect(tt.task_name || '').toBe('');
  });

  it('HRD이음 보고서 URL → hrd_report_attachment', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.hrd_report_attachment).toBe('https://hrd.example.com/report.pdf');
  });
});
