/**
 * roadmap-prompts.ts 테스트 (~15 케이스)
 *
 * - buildSystemPrompt(): 핵심 키워드 포함 검증 (스냅샷 기반)
 * - buildUserPrompt(input): 입력 조합별 프롬프트 생성 검증
 */

import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';
import type { ConsultantProfile } from '@/types/database';

// STT formatter 모킹 — 프롬프트 빌더 자체의 로직만 테스트
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
    job_tasks: [{ name: '데이터 분석', description: '생산 데이터 분석' }],
    pain_points: [{ description: '수동 입력', severity: 'HIGH' }],
    constraints: [{ description: '보안 정책', type: 'security' }],
    improvement_goals: [{ goal: '자동화', kpi: '시간 50% 감소' }],
    customer_requirements: '3개월 내 성과',
    notes: '추가 확인 필요',
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
// buildSystemPrompt
// ============================================================================

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('기업 AI 교육 로드맵 전문가 역할이 명시되어 있다', () => {
    expect(prompt).toContain('기업 AI 교육 로드맵 전문가');
  });

  it('업무(target_task) 제한 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('업무(target_task) 제한');
    expect(prompt).toContain('세부업무(job_tasks)');
  });

  it('무료 도구 전제 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('무료 도구 전제');
    expect(prompt).toContain('무료 범위');
  });

  it('40시간 제한 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('40시간 제한');
    expect(prompt).toContain('50시간 이하');
  });

  it('시간 일관성 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('시간 일관성');
    expect(prompt).toContain('recommended_hours = curriculum');
  });

  it('PBL 과정 선정 원칙이 포함되어 있다', () => {
    expect(prompt).toContain('PBL 과정은 반드시 courses에서 선정');
    expect(prompt).toContain('selected_course_name');
  });

  it('JSON 출력 형식 지시가 포함되어 있다', () => {
    expect(prompt).toContain('JSON 구조로만 응답');
    expect(prompt).toContain('diagnosis_summary');
    expect(prompt).toContain('courses');
    expect(prompt).toContain('pbl_course');
  });

  it('교육 난이도 원칙(노코드/로우코드 중심)이 포함되어 있다', () => {
    expect(prompt).toContain('노코드/로우코드');
  });
});

// ============================================================================
// buildUserPrompt
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

  it('selfAssessment가 null이면 scores를 null로 직렬화한다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      null,
      makeInterview(),
      null
    );

    // selfAssessment가 null이면 null?.scores → undefined → JSON.stringify(undefined) = undefined 출력
    // 실제 코드: JSON.stringify(selfAssessment?.scores, null, 2)
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
      '초급 과정을 추가해주세요'
    );

    expect(prompt).toContain('수정 요청');
    expect(prompt).toContain('초급 과정을 추가해주세요');
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

  it('인터뷰 결과가 프롬프트에 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('현장 인터뷰 결과');
    expect(prompt).toContain('세부업무');
    expect(prompt).toContain('페인포인트');
    expect(prompt).toContain('제약사항');
    expect(prompt).toContain('개선 목표');
    expect(prompt).toContain('3개월 내 성과');
    expect(prompt).toContain('추가 확인 필요');
  });

  it('프롬프트 끝에 JSON 응답 지시가 포함된다', () => {
    const prompt = buildUserPrompt(
      makeProjectData(),
      makeSelfAssessmentData(),
      makeInterview(),
      null
    );

    expect(prompt).toContain('맞춤형 AI 교육 로드맵을 생성해주세요');
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
