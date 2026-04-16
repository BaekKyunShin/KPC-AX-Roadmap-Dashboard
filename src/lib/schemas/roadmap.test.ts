import { describe, it, expect } from 'vitest';
import { editRoadmapUpdatesSchema, createRoadmapInputSchema } from './roadmap';

// ============================================================================
// 신규 산인공 양식 기반 스키마 테스트
// 구조: competencies, training_structure, annual_plan, course_specs
// ============================================================================

const validCompetency = {
  name: '데이터분석',
  definition: '데이터를 수집·가공·분석하여 의사결정에 활용하는 역량',
  knowledge: ['통계학', 'SQL'],
  skills: ['Python', 'Excel'],
  attitudes: ['객관성', '호기심'],
  ncs_used: true,
  ncs_methodology: '20.02.01 경영·회계·사무 - 빅데이터분석 세분류 활용',
};

const validTrainingStructureItem = {
  competency_name: '데이터분석',
  level: 'BEGINNER' as const,
  content: 'Python 기초 및 데이터 전처리',
  target_audience: '신입 사원',
  method: '집체 훈련',
  goal: '기본 데이터 전처리 수행 가능',
};

const validAnnualPlanItem = {
  competency_name: '데이터분석',
  course_name: '데이터분석 입문',
  format: '집체',
  hours: 16,
  notes: '1분기 실시',
};

const validCourseSpec = {
  course_name: '데이터분석 입문',
  format: '집체',
  recommended_program: '일반직무훈련',
  goal: '데이터 분석 기초 역량 확보',
  main_content: 'Python 기초, 데이터 전처리, 시각화',
  target_audience: '전 직원',
  subjects: [
    { name: 'Python 기초', details: '변수, 자료형, 제어문', hours: 4 },
    { name: '데이터 전처리', details: 'Pandas 활용', hours: 8 },
  ],
};

function buildValidRoadmap(overrides: Record<string, unknown> = {}) {
  return {
    competencies: [validCompetency],
    training_structure: [validTrainingStructureItem],
    annual_plan: {
      items: [validAnnualPlanItem],
      usage_plan: '현업 프로젝트에 바로 적용',
    },
    course_specs: [
      { ...validCourseSpec, course_name: '과정1' },
      { ...validCourseSpec, course_name: '과정2' },
      { ...validCourseSpec, course_name: '과정3' },
    ],
    ...overrides,
  };
}

describe('editRoadmapUpdatesSchema — 공통', () => {
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
});

describe('editRoadmapUpdatesSchema — competencies', () => {
  it('유효한 competencies 배열 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      competencies: [validCompetency],
    });
    expect(result.success).toBe(true);
  });

  it('ncs_used=true인데 ncs_methodology 누락 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      competencies: [
        {
          ...validCompetency,
          ncs_used: true,
          ncs_methodology: undefined,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('ncs_used=false인데 ncs_derivation_method 누락 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      competencies: [
        {
          ...validCompetency,
          ncs_used: false,
          ncs_methodology: undefined,
          ncs_derivation_method: undefined,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('ncs_used=false이고 ncs_derivation_method 제공 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      competencies: [
        {
          ...validCompetency,
          ncs_used: false,
          ncs_methodology: undefined,
          ncs_derivation_method: '현업 인터뷰 기반 도출',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('editRoadmapUpdatesSchema — training_structure', () => {
  it('유효한 training_structure → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      training_structure: [validTrainingStructureItem],
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 level 값 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      training_structure: [
        { ...validTrainingStructureItem, level: 'INVALID' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — annual_plan', () => {
  it('유효한 annual_plan → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      annual_plan: {
        items: [validAnnualPlanItem],
        usage_plan: '활용방안',
      },
    });
    expect(result.success).toBe(true);
  });

  it('items의 hours가 음수 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      annual_plan: {
        items: [{ ...validAnnualPlanItem, hours: -1 }],
        usage_plan: '활용방안',
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — course_specs', () => {
  it('course_specs 3개 이상 → 통과', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [
        { ...validCourseSpec, course_name: '과정1' },
        { ...validCourseSpec, course_name: '과정2' },
        { ...validCourseSpec, course_name: '과정3' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('course_specs가 2개 → 실패 (최소 3개)', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [
        { ...validCourseSpec, course_name: '과정1' },
        { ...validCourseSpec, course_name: '과정2' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('subjects 배열이 비어있음 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [
        { ...validCourseSpec, course_name: '과정1', subjects: [] },
        { ...validCourseSpec, course_name: '과정2' },
        { ...validCourseSpec, course_name: '과정3' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('subject.hours가 0 이하 → 실패', () => {
    const result = editRoadmapUpdatesSchema.safeParse({
      course_specs: [
        {
          ...validCourseSpec,
          course_name: '과정1',
          subjects: [{ name: '과목', details: '세부', hours: 0 }],
        },
        { ...validCourseSpec, course_name: '과정2' },
        { ...validCourseSpec, course_name: '과정3' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('editRoadmapUpdatesSchema — 전체 로드맵 구조', () => {
  it('4개 섹션 모두 유효 → 통과', () => {
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
