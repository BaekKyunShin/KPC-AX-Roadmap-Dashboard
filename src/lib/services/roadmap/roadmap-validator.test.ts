import { describe, it, expect } from 'vitest';
import { validateRoadmap } from './roadmap-validator';
import type {
  RoadmapResult,
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlanItem,
  RoadmapCourseSpec,
} from './roadmap-types';

// ============================================================================
// validateRoadmap — 신규 산인공 양식 기반 검증 정책 테스트
// ============================================================================

function makeCompetency(overrides: Partial<RoadmapCompetency> = {}): RoadmapCompetency {
  return {
    name: '데이터분석',
    definition: '정의',
    knowledge: ['K1'],
    skills: ['S1'],
    attitudes: ['A1'],
    ncs_used: true,
    ncs_methodology: 'NCS 빅데이터분석 세분류 활용',
    ...overrides,
  };
}

function makeStructureItem(
  overrides: Partial<RoadmapTrainingStructureItem> = {}
): RoadmapTrainingStructureItem {
  return {
    competency_name: '데이터분석',
    level: 'BEGINNER',
    content: '내용',
    target_audience: '대상',
    method: '집체',
    goal: '목표',
    ...overrides,
  };
}

function makeAnnualItem(
  overrides: Partial<RoadmapAnnualPlanItem> = {}
): RoadmapAnnualPlanItem {
  return {
    competency_name: '데이터분석',
    course_name: '데이터분석 입문',
    format: '집체',
    hours: 8,
    notes: '',
    ...overrides,
  };
}

function makeCourseSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    course_name: '데이터분석 입문',
    format: '집체',
    recommended_program: '일반직무훈련',
    goal: '목표',
    main_content: '내용',
    target_audience: '대상',
    subjects: [{ name: '과목1', details: '세부', hours: 4 }],
    ...overrides,
  };
}

function makeValidRoadmap(overrides: Partial<RoadmapResult> = {}): RoadmapResult {
  return {
    diagnosis_summary: '진단 요약',
    competencies: [makeCompetency()],
    training_structure: [makeStructureItem()],
    annual_plan: {
      items: [makeAnnualItem({ course_name: '과정A' })],
      usage_plan: '활용방안',
    },
    course_specs: [
      makeCourseSpec({ course_name: '과정A' }),
      makeCourseSpec({ course_name: '과정B' }),
      makeCourseSpec({ course_name: '과정C' }),
    ],
    ...overrides,
  };
}

describe('validateRoadmap — 정상 케이스', () => {
  it('완전한 로드맵 → isValid=true, errors=[]', () => {
    const roadmap = makeValidRoadmap({
      annual_plan: {
        items: [
          makeAnnualItem({ course_name: '과정A' }),
          makeAnnualItem({ course_name: '과정B' }),
          makeAnnualItem({ course_name: '과정C' }),
        ],
        usage_plan: '활용방안',
      },
    });
    const result = validateRoadmap(roadmap);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateRoadmap — 필수 필드 검증', () => {
  it('competencies가 비어있으면 error', () => {
    const result = validateRoadmap(makeValidRoadmap({ competencies: [] }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('역량'))).toBe(true);
  });

  it('training_structure가 비어있으면 error', () => {
    const result = validateRoadmap(makeValidRoadmap({ training_structure: [] }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('훈련체계'))).toBe(true);
  });

  it('annual_plan.items가 비어있으면 error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        annual_plan: { items: [], usage_plan: '' },
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('연간'))).toBe(true);
  });

  it('course_specs가 3개 미만이면 error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        course_specs: [
          makeCourseSpec({ course_name: '과정A' }),
          makeCourseSpec({ course_name: '과정B' }),
        ],
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('명세서') && e.includes('3'))).toBe(true);
  });

  it('diagnosis_summary가 비어있으면 warning', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        diagnosis_summary: '',
        annual_plan: {
          items: [
            makeAnnualItem({ course_name: '과정A' }),
            makeAnnualItem({ course_name: '과정B' }),
            makeAnnualItem({ course_name: '과정C' }),
          ],
          usage_plan: '활용',
        },
      })
    );
    expect(result.warnings.some((w) => w.includes('진단'))).toBe(true);
  });
});

describe('validateRoadmap — 명세서 subjects 검증', () => {
  it('course_specs[*].subjects가 비어있으면 error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        course_specs: [
          makeCourseSpec({ course_name: '과정A', subjects: [] }),
          makeCourseSpec({ course_name: '과정B' }),
          makeCourseSpec({ course_name: '과정C' }),
        ],
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('교과목'))).toBe(true);
  });
});

describe('validateRoadmap — NCS 일관성', () => {
  it('ncs_used=true 이지만 ncs_methodology 누락 → error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        competencies: [
          makeCompetency({ ncs_used: true, ncs_methodology: undefined }),
        ],
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('NCS 활용'))).toBe(true);
  });

  it('ncs_used=false 이지만 ncs_derivation_method 누락 → error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        competencies: [
          makeCompetency({
            ncs_used: false,
            ncs_methodology: undefined,
            ncs_derivation_method: undefined,
          }),
        ],
      })
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('NCS 도출'))).toBe(true);
  });

  it('ncs_used=false + ncs_derivation_method 제공 → error 없음', () => {
    const roadmap = makeValidRoadmap({
      competencies: [
        makeCompetency({
          ncs_used: false,
          ncs_methodology: undefined,
          ncs_derivation_method: '현업 인터뷰 기반',
        }),
      ],
      annual_plan: {
        items: [
          makeAnnualItem({ course_name: '과정A' }),
          makeAnnualItem({ course_name: '과정B' }),
          makeAnnualItem({ course_name: '과정C' }),
        ],
        usage_plan: '활용',
      },
    });
    const result = validateRoadmap(roadmap);
    expect(result.errors.filter((e) => e.includes('NCS'))).toEqual([]);
  });
});

describe('validateRoadmap — 역량 참조 정합성', () => {
  it('training_structure의 competency_name이 competencies에 없으면 error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        training_structure: [makeStructureItem({ competency_name: '미존재역량' })],
      })
    );
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('미존재역량') && e.includes('훈련체계'))
    ).toBe(true);
  });

  it('annual_plan.items의 competency_name이 competencies에 없으면 error', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        annual_plan: {
          items: [
            makeAnnualItem({ competency_name: '미존재역량', course_name: '과정A' }),
            makeAnnualItem({ course_name: '과정B' }),
            makeAnnualItem({ course_name: '과정C' }),
          ],
          usage_plan: '활용',
        },
      })
    );
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('미존재역량') && e.includes('연간'))
    ).toBe(true);
  });
});

describe('validateRoadmap — 명세서/연간계획 과정명 정합성', () => {
  it('course_specs의 course_name이 annual_plan.items에 없으면 warning', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        annual_plan: {
          items: [makeAnnualItem({ course_name: '과정X' })],
          usage_plan: '활용',
        },
        course_specs: [
          makeCourseSpec({ course_name: '과정A' }),
          makeCourseSpec({ course_name: '과정B' }),
          makeCourseSpec({ course_name: '과정C' }),
        ],
      })
    );
    expect(result.warnings.some((w) => w.includes('과정A'))).toBe(true);
  });

  it('annual_plan.items와 course_specs의 course_name이 일치하면 warning 없음', () => {
    const result = validateRoadmap(
      makeValidRoadmap({
        annual_plan: {
          items: [
            makeAnnualItem({ course_name: '과정A' }),
            makeAnnualItem({ course_name: '과정B' }),
            makeAnnualItem({ course_name: '과정C' }),
          ],
          usage_plan: '활용',
        },
      })
    );
    expect(result.warnings.filter((w) => w.includes('명세서'))).toEqual([]);
  });
});
