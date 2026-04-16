/**
 * roadmap-prompts.ts 테스트 — 산인공 4섹션 구조 검증
 *
 * - buildSystemPrompt(): 신규 4섹션 키워드·제약·JSON 키 포함, 구형 키 미포함
 * - buildUserPrompt(): 신규 인터뷰 필드 포함, 구형 필드 미포함, 분기 동작
 */

import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';
import type { ConsultantProfile } from '@/types/database';

// STT formatter 모킹 — 프롬프트 빌더 자체 로직만 테스트
vi.mock('./roadmap-stt-formatter', () => ({
  buildSttInsightsSection: vi.fn(() => ''),
}));

// ============================================================================
// 팩토리 함수
// ============================================================================

function makeProjectData(overrides: Record<string, unknown> = {}) {
  return {
    company_name: '테스트 주식회사',
    industry: '제조업',
    sub_industries: ['자동차', '전자'],
    company_size: '50-299',
    customer_comment: '맞춤형 AI 교육 희망',
    ...overrides,
  };
}

function makeInterview(overrides: Record<string, unknown> = {}) {
  return {
    interview_date: '2026-04-16',
    interview_round: 1,
    interview_time: '14:00',
    interview_method: 'ONSITE',
    participants: [{ id: 'p1', name: '홍길동', position: '팀장' }],
    company_requirements: {
      company_status: 'ERP 운영 중, AI 도입 초기 단계',
      main_problems: '수동 데이터 입력으로 오류 빈번',
      push_willingness: '경영진 전폭 지원',
      expected_outcomes: '업무 자동화로 생산성 30% 향상',
    },
    task_workflow_items: [
      {
        id: 't1',
        job: '생산관리',
        task_name: '생산 실적 집계',
        as_is: 'Excel 수동 입력',
        problems: '입력 오류, 시간 소요',
        data_availability: 'ERP 데이터 보유',
        ai_necessity: 4,
      },
    ],
    analysis_notes: { text: '현장 관찰 완료', attachment_urls: [] },
    training_targets: [
      {
        id: 'tt1',
        task_name: '생산 실적 집계',
        selection_reason: 'AI 자동화 효과 최대',
        as_is: 'Excel 수동 집계',
        to_be: 'AI 자동 집계 및 보고서 생성',
      },
    ],
    notes: '2차 인터뷰 예정',
    ...overrides,
  };
}

function makeSelfAssessmentData(overrides: Record<string, unknown> = {}) {
  return {
    scores: { data: 3, process: 4, culture: 2, technology: 3, overall: 3 },
    ...overrides,
  };
}

function makeConsultantProfileData(
  overrides: Partial<ConsultantProfile> = {}
): ConsultantProfile {
  return {
    id: 'profile-1',
    user_id: 'consultant-1',
    expertise_domains: ['AI/ML', '데이터 분석'],
    available_industries: ['제조업', 'IT'],
    sub_industries: ['자동차'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
    coaching_methods: ['PBL', 'WORKSHOP'],
    skill_tags: ['Python', 'TensorFlow'],
    years_of_experience: 10,
    affiliation: '한국AI교육원',
    representative_experience: 'AI 교육 10년',
    portfolio: 'https://portfolio.example.com',
    strengths_constraints: '제조업 특화',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ConsultantProfile;
}

// ============================================================================
// buildSystemPrompt — 신규 4섹션 구조 검증
// ============================================================================

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('산인공 AI 훈련 로드맵 전문가 역할이 명시되어 있다', () => {
    expect(prompt).toContain('AI 훈련 로드맵 설계 전문가');
  });

  it('4섹션 키워드가 모두 포함되어 있다', () => {
    expect(prompt).toContain('역량 모델링');
    expect(prompt).toContain('훈련체계도');
    expect(prompt).toContain('연간 훈련계획');
    expect(prompt).toContain('훈련과정 명세서');
  });

  it('신규 최상위 JSON 키가 모두 포함되어 있다', () => {
    expect(prompt).toContain('competencies');
    expect(prompt).toContain('training_structure');
    expect(prompt).toContain('annual_plan');
    expect(prompt).toContain('course_specs');
    expect(prompt).toContain('diagnosis_summary');
  });

  it('NCS 분기 필드가 명시되어 있다', () => {
    expect(prompt).toContain('ncs_used');
    expect(prompt).toContain('ncs_methodology');
    expect(prompt).toContain('ncs_derivation_method');
  });

  it('course_specs 최소 3개 제약이 명시되어 있다', () => {
    expect(prompt).toContain('최소 3개');
  });

  it('subjects 필드가 명시되어 있다', () => {
    expect(prompt).toContain('subjects');
  });

  it('recommended_program 필드가 명시되어 있다', () => {
    expect(prompt).toContain('recommended_program');
  });

  it('역량명 일관성 제약(competency_name 참조)이 명시되어 있다', () => {
    expect(prompt).toContain('competency_name');
    expect(prompt).toContain('competencies[*].name');
  });

  it('과정명 일관성 제약(annual_plan.items와 일치)이 명시되어 있다', () => {
    expect(prompt).toContain('annual_plan.items[*].course_name');
  });

  it('무료 도구 정책이 포함되어 있다', () => {
    expect(prompt).toContain('무료 범위');
  });

  it('노코드/로코드 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('노코드');
  });

  it('40시간 제한 정책이 포함되어 있다', () => {
    expect(prompt).toContain('40시간 이하');
  });

  it('JSON 전용 출력 지시가 포함되어 있다', () => {
    expect(prompt).toContain('JSON 외 다른 텍스트를 출력하지 마라');
  });

  it('구형 키(pbl_course)가 포함되지 않는다', () => {
    expect(prompt).not.toContain('pbl_course');
  });

  it('구형 키(roadmap_matrix)가 포함되지 않는다', () => {
    expect(prompt).not.toContain('roadmap_matrix');
  });

  it('구형 키(RoadmapCell)가 포함되지 않는다', () => {
    expect(prompt).not.toContain('RoadmapCell');
  });

  it('구형 키(PBLCourse)가 포함되지 않는다', () => {
    expect(prompt).not.toContain('PBLCourse');
  });
});

// ============================================================================
// buildUserPrompt — 신규 인터뷰 필드 및 분기 동작 검증
// ============================================================================

describe('buildUserPrompt', () => {
  it('기업 정보가 프롬프트에 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('테스트 주식회사');
    expect(prompt).toContain('제조업');
    expect(prompt).toContain('50-299');
    expect(prompt).toContain('자동차, 전자');
  });

  it('신규 인터뷰 필드(company_requirements)가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('company_status');
    expect(prompt).toContain('기업 요구분석');
  });

  it('신규 인터뷰 필드(task_workflow_items)가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('생산 실적 집계');
    expect(prompt).toContain('과업·워크플로우 분석');
  });

  it('신규 인터뷰 필드(training_targets)가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('selection_reason');
    expect(prompt).toContain('훈련대상 과업 선정');
  });

  it('구형 인터뷰 필드(job_tasks)가 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).not.toContain('세부업무(job_tasks)');
    expect(prompt).not.toContain('"job_tasks"');
  });

  it('구형 인터뷰 필드(pain_points)가 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).not.toContain('"pain_points"');
    expect(prompt).not.toContain('페인포인트\n');
  });

  it('구형 인터뷰 필드(improvement_goals)가 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).not.toContain('"improvement_goals"');
    expect(prompt).not.toContain('개선 목표\n');
  });

  it('구형 인터뷰 필드(customer_requirements)가 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    // interview.customer_requirements는 더 이상 별도 섹션으로 출력하지 않음
    expect(prompt).not.toContain('기업 요구사항\n');
  });

  it('selfAssessment가 null이면 자가진단 결과 섹션이 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      null,
      makeInterview(),
      null
    );

    expect(prompt).toContain('자가진단 결과');
  });

  it('consultantProfile이 null이면 컨설턴트 섹션이 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).not.toContain('담당 컨설턴트 프로필');
  });

  it('consultantProfile이 제공되면 컨설턴트 정보가 포함된다', () => {
    const profile = makeConsultantProfileData();
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      profile
    );

    expect(prompt).toContain('담당 컨설턴트 프로필');
    expect(prompt).toContain('AI/ML, 데이터 분석');
    expect(prompt).toContain('제조업, IT');
    expect(prompt).toContain('Python, TensorFlow');
    expect(prompt).toContain('10년');
  });

  it('테스트 모드이면 테스트 모드 표시가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null,
      undefined,
      true
    );

    expect(prompt).toContain('**테스트 모드**');
    expect(prompt).toContain('컨설턴트 연습용 로드맵');
  });

  it('테스트 모드 + selfAssessment null이면 테스트 모드 안내 문구가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      null,
      makeInterview(),
      null,
      undefined,
      true
    );

    expect(prompt).toContain('테스트 모드 - 자가진단 결과 없음');
  });

  it('테스트 모드 + consultantProfile이면 중요 참조 자료 표시가 포함된다', () => {
    const profile = makeConsultantProfileData();
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      profile,
      undefined,
      true
    );

    expect(prompt).toContain('테스트 모드에서 중요 참조 자료');
    expect(prompt).toContain('컨설턴트의 전문성을 기반으로');
  });

  it('revisionPrompt가 제공되면 수정 요청 섹션이 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null,
      '역량 모델링 항목을 추가해주세요'
    );

    expect(prompt).toContain('수정 요청');
    expect(prompt).toContain('역량 모델링 항목을 추가해주세요');
    expect(prompt).toContain('수정 요청을 반영하여 로드맵을 재생성');
  });

  it('revisionPrompt가 없으면 수정 요청 섹션이 포함되지 않는다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).not.toContain('수정 요청');
  });

  it('sub_industries가 빈 배열이면 "미지정"으로 표시된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData({ sub_industries: [] }),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('세부 업종: 미지정');
  });

  it('customer_comment가 없으면 "없음"으로 표시된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData({ customer_comment: null }),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('요청사항: 없음');
  });

  it('프롬프트 끝에 산인공 4섹션 양식 JSON 응답 지시가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('산인공 4섹션 양식');
    expect(prompt).toContain('JSON 형식으로만 응답');
  });

  it('컨설턴트 sub_industries가 빈 배열이면 "미지정"으로 표시된다', () => {
    const profile = makeConsultantProfileData({ sub_industries: [] });
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      profile
    );

    expect(prompt).toContain('선호 세부 업종: 미지정');
  });
});
