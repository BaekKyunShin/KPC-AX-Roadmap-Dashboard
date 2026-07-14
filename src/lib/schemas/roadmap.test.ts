import { describe, it, expect } from 'vitest';
import {
  editRoadmapUpdatesSchema,
  createRoadmapInputSchema,
  roadmapContentSchema,
} from './roadmap';
import { ROADMAP_COURSE_SPEC_COUNT } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 로드맵 스키마 테스트 — 산인공 공식 양식 v2 (2026-07-13 개정)
// ----------------------------------------------------------------------------
// 구조: diagnosis_summary · setup_necessity · outcome_summary · course_specs[6]
//
// v1 대비 삭제 (양식에서 해당 표가 전부 제거됨):
//   competencies · ncs_*(+ 루트 refine) · training_structure(+method) · annual_plan
// v2 신규: course_specs[*].training_period(훈련시기) · training_level(훈련수준)
//          + 명세서 최소 개수 3 → 6 (ROADMAP_COURSE_SPEC_COUNT)
// ============================================================================

const validOutcomeSummary = {
  ai_competency_level: 'INTERMEDIATE' as const,
  selected_tasks: '품질검사 자동화',
  main_content: '3단계 AI 인력 양성',
};

function makeSubject(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Python 기초',
    details: '1단원: 변수와 자료형\n2단원: 제어문',
    hours: 4,
    ...overrides,
  };
}

/** v2 훈련과정 명세서 1개 (훈련시기·훈련수준 신규 필드 포함) */
function makeCourseSpec(overrides: Record<string, unknown> = {}) {
  return {
    training_period: '2026년 상반기',
    training_level: 'INTERMEDIATE' as const,
    course_name: '데이터분석 입문',
    training_method: '집체', // v1 `format` 의 후신
    recommended_program: '일반직무훈련',
    goal: '데이터 분석 기초 역량 확보',
    main_content: 'Python 기초, 데이터 전처리, 시각화',
    target_audience: '전 직원',
    subjects: [makeSubject()],
    ...overrides,
  };
}

/** 명세서 N개 (기본 = 양식이 요구하는 6개) */
function makeCourseSpecs(count: number = ROADMAP_COURSE_SPEC_COUNT) {
  return Array.from({ length: count }, (_, i) => makeCourseSpec({ course_name: `과정${i + 1}` }));
}

function buildValidRoadmap(overrides: Record<string, unknown> = {}) {
  return {
    diagnosis_summary: '진단 요약',
    setup_necessity: '수립 배경',
    outcome_summary: validOutcomeSummary,
    course_specs: makeCourseSpecs(),
    ...overrides,
  };
}

describe('roadmapContentSchema — v2 루트 구조', () => {
  it('완전한 v2 로드맵 → 통과', () => {
    const result = roadmapContentSchema.safeParse(buildValidRoadmap());
    expect(result.success).toBe(true);
  });

  it('v1 잔여 키(competencies·ncs_*·annual_plan)가 섞여 있어도 통과하고 parse 결과에서 제거된다 (NCS 루트 refine 삭제 확인)', () => {
    // v1 이라면 ncs_used=true + ncs_methodology='' 조합에서 루트 refine 이 실패시켰다.
    // v2 에는 해당 refine 이 없고, 미지원 키는 zod 기본 동작으로 strip 된다.
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({
        competencies: [{ name: '데이터분석' }],
        ncs_used: true,
        ncs_methodology: '',
        training_structure: [{ competency_name: '데이터분석' }],
        training_structure_method: '',
        annual_plan: { items: [], usage_plan: '' },
      })
    );
    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data as unknown as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('competencies');
    expect(parsed).not.toHaveProperty('ncs_used');
    expect(parsed).not.toHaveProperty('ncs_methodology');
    expect(parsed).not.toHaveProperty('training_structure');
    expect(parsed).not.toHaveProperty('training_structure_method');
    expect(parsed).not.toHaveProperty('annual_plan');
    expect(Object.keys(parsed).sort()).toEqual([
      'course_specs',
      'diagnosis_summary',
      'outcome_summary',
      'setup_necessity',
    ]);
  });

  it('outcome_summary 누락 → 실패', () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({ outcome_summary: undefined })
    );
    expect(result.success).toBe(false);
  });

  it('outcome_summary.ai_competency_level 잘못된 enum → 실패', () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({
        outcome_summary: { ...validOutcomeSummary, ai_competency_level: 'EXPERT' },
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('roadmapContentSchema — course_specs 개수 (v2: 6개)', () => {
  it(`명세서 ${ROADMAP_COURSE_SPEC_COUNT}개 → 통과`, () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({ course_specs: makeCourseSpecs(ROADMAP_COURSE_SPEC_COUNT) })
    );
    expect(result.success).toBe(true);
  });

  it(`명세서 ${ROADMAP_COURSE_SPEC_COUNT - 1}개 → 실패 (v1 기준 3개는 더 이상 통과하지 않음)`, () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({ course_specs: makeCourseSpecs(ROADMAP_COURSE_SPEC_COUNT - 1) })
    );
    expect(result.success).toBe(false);
  });

  it('명세서 3개(v1 최소 개수) → 실패', () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({ course_specs: makeCourseSpecs(3) })
    );
    expect(result.success).toBe(false);
  });

  it(`명세서 ${ROADMAP_COURSE_SPEC_COUNT + 1}개 → 통과 (최소 개수 규칙이므로 초과 허용)`, () => {
    const result = roadmapContentSchema.safeParse(
      buildValidRoadmap({ course_specs: makeCourseSpecs(ROADMAP_COURSE_SPEC_COUNT + 1) })
    );
    expect(result.success).toBe(true);
  });

  it('course_specs 빈 배열 → 실패', () => {
    const result = roadmapContentSchema.safeParse(buildValidRoadmap({ course_specs: [] }));
    expect(result.success).toBe(false);
  });
});

describe('roadmapContentSchema — course_specs 신규 필드 (훈련시기·훈련수준)', () => {
  /** 첫 명세서만 교체하고 나머지는 유효한 값으로 채운 6개 배열 */
  function withFirstSpec(overrides: Record<string, unknown>) {
    const specs = makeCourseSpecs();
    specs[0] = makeCourseSpec(overrides);
    return buildValidRoadmap({ course_specs: specs });
  }

  it('training_period 가 빈 문자열 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ training_period: '' }));
    expect(result.success).toBe(false);
  });

  it('training_period 누락 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ training_period: undefined }));
    expect(result.success).toBe(false);
  });

  it('training_level 이 enum 외 값 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ training_level: 'EXPERT' }));
    expect(result.success).toBe(false);
  });

  it('training_level 누락 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ training_level: undefined }));
    expect(result.success).toBe(false);
  });

  it.each(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])('training_level=%s → 통과', (level) => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ training_level: level }));
    expect(result.success).toBe(true);
  });

  it('v1 `format` 키만 있고 training_method 가 없으면 → 실패 (필드 rename 강제)', () => {
    const result = roadmapContentSchema.safeParse(
      withFirstSpec({ training_method: undefined, format: '집체' })
    );
    expect(result.success).toBe(false);
  });

  it('course_name 이 빈 문자열 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSpec({ course_name: '' }));
    expect(result.success).toBe(false);
  });
});

describe('roadmapContentSchema — course_specs.subjects', () => {
  function withFirstSubjects(subjects: unknown) {
    const specs = makeCourseSpecs();
    specs[0] = makeCourseSpec({ subjects });
    return buildValidRoadmap({ course_specs: specs });
  }

  it('subjects 빈 배열 → 실패 (최소 1개)', () => {
    const result = roadmapContentSchema.safeParse(withFirstSubjects([]));
    expect(result.success).toBe(false);
  });

  it('subject.hours 가 0 → 실패 (positive)', () => {
    const result = roadmapContentSchema.safeParse(withFirstSubjects([makeSubject({ hours: 0 })]));
    expect(result.success).toBe(false);
  });

  it('subject.hours 가 음수 → 실패', () => {
    const result = roadmapContentSchema.safeParse(withFirstSubjects([makeSubject({ hours: -1 })]));
    expect(result.success).toBe(false);
  });

  it('subject.details 가 빈 문자열 → 실패 (줄바꿈 구분 1~5개 항목)', () => {
    const result = roadmapContentSchema.safeParse(
      withFirstSubjects([makeSubject({ details: '' })])
    );
    expect(result.success).toBe(false);
  });

  it('subject.details 항목이 5개 → 통과 (상한)', () => {
    const details = ['1단원', '2단원', '3단원', '4단원', '5단원'].join('\n');
    const result = roadmapContentSchema.safeParse(withFirstSubjects([makeSubject({ details })]));
    expect(result.success).toBe(true);
  });

  it('subject.details 항목이 6개 → 실패 (상한 초과)', () => {
    const details = ['1단원', '2단원', '3단원', '4단원', '5단원', '6단원'].join('\n');
    const result = roadmapContentSchema.safeParse(withFirstSubjects([makeSubject({ details })]));
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — 공통 (DRAFT loose)', () => {
  it('diagnosis_summary만 포함된 유효한 데이터 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: '진단 요약입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('빈 객체 → 실패 (수정할 항목 없음)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('diagnosis_summary가 5000자 초과 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('diagnosis_summary가 숫자 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      diagnosis_summary: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('setup_necessity만 포함 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      setup_necessity: '수립 배경 수정',
    });
    expect(result.success).toBe(true);
  });

  it('outcome_summary만 포함 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      outcome_summary: validOutcomeSummary,
    });
    expect(result.success).toBe(true);
  });

  it('outcome_summary.ai_competency_level 이 enum 외 값 → 실패 (loose 여도 enum 은 유지)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      outcome_summary: { ...validOutcomeSummary, ai_competency_level: 'EXPERT' },
    });
    expect(result.success).toBe(false);
  });

  it('삭제된 v1 필드(competencies·training_structure_method·annual_plan)만 보내면 → 실패 (strip 후 수정 항목 없음)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      competencies: [{ name: '데이터분석' }],
      training_structure_method: '체계 수립 방법',
      annual_plan: { items: [], usage_plan: '활용방안' },
    });
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — course_specs (DRAFT 중간 상태 허용)', () => {
  it(`명세서가 ${ROADMAP_COURSE_SPEC_COUNT}개 미만이어도 편집 저장은 통과 (최소 개수는 FINAL 확정 시 validateRoadmap이 검증)`, () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: makeCourseSpecs(2),
    });
    expect(result.success).toBe(true);
  });

  it('training_period 가 빈 문자열이어도 편집 저장은 통과 (사용자가 채우는 중)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ training_period: '' })],
    });
    expect(result.success).toBe(true);
  });

  it('training_level 이 enum 외 값이면 여전히 실패 (loose 여도 enum 은 유지)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ training_level: 'EXPERT' })],
    });
    expect(result.success).toBe(false);
  });

  it('course_name 이 빈 문자열이어도 편집 저장은 통과 (DRAFT 중간 상태)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ course_name: '' })],
    });
    expect(result.success).toBe(true);
  });

  it('subjects 배열이 비어있어도 편집 저장은 통과 (DRAFT 중간 상태)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ subjects: [] })],
    });
    expect(result.success).toBe(true);
  });

  it('subject.hours가 0이어도 편집 저장은 통과 (nonnegative — 사용자가 채우는 중)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ subjects: [{ name: '과목', details: '세부', hours: 0 }] })],
    });
    expect(result.success).toBe(true);
  });

  it('subject.hours가 음수면 여전히 실패 (nonnegative)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [makeCourseSpec({ subjects: [{ name: '과목', details: '세부', hours: -1 }] })],
    });
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — 전체 v2 구조', () => {
  it('v2 전체 구조 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse(buildValidRoadmap());
    expect(result.success).toBe(true);
  });
});

describe('createRoadmapInputSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('유효한 projectId만 → 통과', () => {
    const result = createRoadmapInputSchema.safeParse({
      projectId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('유효한 projectId + revisionPrompt → 통과', () => {
    const result = createRoadmapInputSchema.safeParse({
      projectId: validUuid,
      revisionPrompt: '고급 과정 위주로 재구성해주세요.',
    });
    expect(result.success).toBe(true);
  });

  it('revisionPrompt가 2000자 초과 → 실패', () => {
    const result = createRoadmapInputSchema.safeParse({
      projectId: validUuid,
      revisionPrompt: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('revisionPrompt가 공백만 → 실패 (trim 후 min(1))', () => {
    const result = createRoadmapInputSchema.safeParse({
      projectId: validUuid,
      revisionPrompt: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('projectId가 UUID 형식이 아님 → 실패', () => {
    const result = createRoadmapInputSchema.safeParse({
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('projectId가 누락 → 실패', () => {
    const result = createRoadmapInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
