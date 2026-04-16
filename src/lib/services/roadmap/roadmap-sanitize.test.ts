import { describe, it, expect } from 'vitest';
import {
  isEmptyCompetency,
  isEmptyAnnualPlanItem,
  isEmptyCourseSubject,
  isEmptyCourseSpec,
  sanitizeRoadmapResult,
} from './roadmap-sanitize';
import type {
  RoadmapCompetency,
  RoadmapAnnualPlanItem,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  RoadmapResult,
} from './roadmap-types';

// ============================================================================
// 개별 "빈 행" 판정 함수
// ============================================================================

describe('isEmptyCompetency', () => {
  it('name과 definition이 모두 공백이면 true', () => {
    const c: RoadmapCompetency = {
      name: '',
      definition: '',
      knowledge: [],
      skills: [],
      attitudes: [],
    };
    expect(isEmptyCompetency(c)).toBe(true);
  });

  it('공백 문자(스페이스·탭·줄바꿈)만 있으면 true', () => {
    const c: RoadmapCompetency = {
      name: '   ',
      definition: '\n\t',
      knowledge: [],
      skills: [],
      attitudes: [],
    };
    expect(isEmptyCompetency(c)).toBe(true);
  });

  it('name에 내용이 있으면 false', () => {
    const c: RoadmapCompetency = {
      name: '역량명',
      definition: '',
      knowledge: [],
      skills: [],
      attitudes: [],
    };
    expect(isEmptyCompetency(c)).toBe(false);
  });

  it('definition에 내용이 있으면 false', () => {
    const c: RoadmapCompetency = {
      name: '',
      definition: '정의',
      knowledge: [],
      skills: [],
      attitudes: [],
    };
    expect(isEmptyCompetency(c)).toBe(false);
  });

  it('knowledge/skills/attitudes에 항목이 있으면 false (name/definition 공백이어도)', () => {
    const c: RoadmapCompetency = {
      name: '',
      definition: '',
      knowledge: ['지식 항목'],
      skills: [],
      attitudes: [],
    };
    expect(isEmptyCompetency(c)).toBe(false);
  });
});

describe('isEmptyAnnualPlanItem', () => {
  it('competency_name과 course_name이 모두 공백이면 true', () => {
    const item: RoadmapAnnualPlanItem = {
      competency_name: '',
      course_name: '',
      format: '',
      hours: 0,
      notes: '',
    };
    expect(isEmptyAnnualPlanItem(item)).toBe(true);
  });

  it('hours만 있어도 core 필드 비어있으면 true (빈 행 간주)', () => {
    const item: RoadmapAnnualPlanItem = {
      competency_name: '',
      course_name: '',
      format: '',
      hours: 8,
      notes: '',
    };
    expect(isEmptyAnnualPlanItem(item)).toBe(true);
  });

  it('competency_name에 내용이 있으면 false', () => {
    const item: RoadmapAnnualPlanItem = {
      competency_name: '역량',
      course_name: '',
      format: '',
      hours: 0,
      notes: '',
    };
    expect(isEmptyAnnualPlanItem(item)).toBe(false);
  });

  it('course_name에 내용이 있으면 false', () => {
    const item: RoadmapAnnualPlanItem = {
      competency_name: '',
      course_name: '과정명',
      format: '',
      hours: 0,
      notes: '',
    };
    expect(isEmptyAnnualPlanItem(item)).toBe(false);
  });
});

describe('isEmptyCourseSubject', () => {
  it('name과 details가 모두 공백이면 true', () => {
    const s: RoadmapCourseSubject = { name: '', details: '', hours: 0 };
    expect(isEmptyCourseSubject(s)).toBe(true);
  });

  it('hours만 있어도 name·details 비면 true', () => {
    const s: RoadmapCourseSubject = { name: '  ', details: '', hours: 4 };
    expect(isEmptyCourseSubject(s)).toBe(true);
  });

  it('name에 내용이 있으면 false', () => {
    const s: RoadmapCourseSubject = { name: '교과목', details: '', hours: 0 };
    expect(isEmptyCourseSubject(s)).toBe(false);
  });

  it('details에 내용이 있으면 false', () => {
    const s: RoadmapCourseSubject = { name: '', details: '세부', hours: 0 };
    expect(isEmptyCourseSubject(s)).toBe(false);
  });
});

describe('isEmptyCourseSpec', () => {
  it('course_name 공백 + subjects 빈 배열이면 true', () => {
    const spec: RoadmapCourseSpec = {
      course_name: '',
      format: '',
      recommended_program: '',
      goal: '',
      main_content: '',
      target_audience: '',
      subjects: [],
    };
    expect(isEmptyCourseSpec(spec)).toBe(true);
  });

  it('course_name 공백이어도 subjects에 내용 있는 과목 있으면 false', () => {
    const spec: RoadmapCourseSpec = {
      course_name: '',
      format: '',
      recommended_program: '',
      goal: '',
      main_content: '',
      target_audience: '',
      subjects: [{ name: '교과목1', details: '', hours: 0 }],
    };
    expect(isEmptyCourseSpec(spec)).toBe(false);
  });

  it('course_name 공백 + subjects가 빈 행들로만 채워져 있으면 true', () => {
    const spec: RoadmapCourseSpec = {
      course_name: '',
      format: '',
      recommended_program: '',
      goal: '',
      main_content: '',
      target_audience: '',
      subjects: [{ name: '', details: '', hours: 0 }],
    };
    expect(isEmptyCourseSpec(spec)).toBe(true);
  });

  it('course_name에 내용이 있으면 false (subjects 비어있어도)', () => {
    const spec: RoadmapCourseSpec = {
      course_name: '과정명',
      format: '',
      recommended_program: '',
      goal: '',
      main_content: '',
      target_audience: '',
      subjects: [],
    };
    expect(isEmptyCourseSpec(spec)).toBe(false);
  });
});

// ============================================================================
// sanitizeRoadmapResult — 통합 정리
// ============================================================================

function baseResult(): RoadmapResult {
  return {
    diagnosis_summary: '요약',
    setup_necessity: '필요',
    outcome_summary: {
      ai_competency_level: 'BEGINNER',
      selected_tasks: '',
      main_content: '',
    },
    competencies: [],
    ncs_used: false,
    ncs_methodology: '',
    ncs_derivation_method: '도출',
    training_structure: [],
    training_structure_method: '',
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
  };
}

describe('sanitizeRoadmapResult', () => {
  it('competencies의 빈 행을 제거한다', () => {
    const result = baseResult();
    result.competencies = [
      { name: '역량A', definition: '정의A', knowledge: [], skills: [], attitudes: [] },
      { name: '', definition: '', knowledge: [], skills: [], attitudes: [] },
      { name: '역량B', definition: '정의B', knowledge: [], skills: [], attitudes: [] },
    ];

    const out = sanitizeRoadmapResult(result);

    expect(out.competencies).toHaveLength(2);
    expect(out.competencies[0].name).toBe('역량A');
    expect(out.competencies[1].name).toBe('역량B');
  });

  it('annual_plan.items의 빈 행을 제거한다 (usage_plan 유지)', () => {
    const result = baseResult();
    result.annual_plan = {
      items: [
        { competency_name: '역량A', course_name: '과정1', format: '집체', hours: 8, notes: '' },
        { competency_name: '', course_name: '', format: '', hours: 0, notes: '' },
      ],
      usage_plan: '활용방안 텍스트',
    };

    const out = sanitizeRoadmapResult(result);

    expect(out.annual_plan.items).toHaveLength(1);
    expect(out.annual_plan.items[0].course_name).toBe('과정1');
    expect(out.annual_plan.usage_plan).toBe('활용방안 텍스트');
  });

  it('course_specs[*].subjects의 빈 교과목을 제거한다', () => {
    const result = baseResult();
    result.course_specs = [
      {
        course_name: '과정1',
        format: '집체',
        recommended_program: '',
        goal: '',
        main_content: '',
        target_audience: '',
        subjects: [
          { name: '교과목A', details: '', hours: 4 },
          { name: '', details: '', hours: 0 },
          { name: '교과목B', details: '세부', hours: 2 },
        ],
      },
    ];

    const out = sanitizeRoadmapResult(result);

    expect(out.course_specs).toHaveLength(1);
    expect(out.course_specs[0].subjects).toHaveLength(2);
    expect(out.course_specs[0].subjects[0].name).toBe('교과목A');
    expect(out.course_specs[0].subjects[1].name).toBe('교과목B');
  });

  it('완전히 빈 course_spec은 제거한다', () => {
    const result = baseResult();
    result.course_specs = [
      {
        course_name: '과정1',
        format: '',
        recommended_program: '',
        goal: '',
        main_content: '',
        target_audience: '',
        subjects: [{ name: '교과목A', details: '', hours: 4 }],
      },
      {
        course_name: '',
        format: '',
        recommended_program: '',
        goal: '',
        main_content: '',
        target_audience: '',
        subjects: [{ name: '', details: '', hours: 0 }],
      },
    ];

    const out = sanitizeRoadmapResult(result);

    expect(out.course_specs).toHaveLength(1);
    expect(out.course_specs[0].course_name).toBe('과정1');
  });

  it('원본을 변경하지 않는다 (불변성)', () => {
    const result = baseResult();
    result.competencies = [
      { name: '역량A', definition: '정의', knowledge: [], skills: [], attitudes: [] },
      { name: '', definition: '', knowledge: [], skills: [], attitudes: [] },
    ];

    const originalLength = result.competencies.length;
    sanitizeRoadmapResult(result);

    expect(result.competencies).toHaveLength(originalLength);
  });

  it('빈 행이 없으면 구조만 동일하게 반환한다', () => {
    const result = baseResult();
    result.competencies = [
      { name: '역량A', definition: '정의A', knowledge: [], skills: [], attitudes: [] },
    ];

    const out = sanitizeRoadmapResult(result);

    expect(out.competencies).toHaveLength(1);
    expect(out.diagnosis_summary).toBe('요약');
    expect(out.setup_necessity).toBe('필요');
  });

  it('훈련체계도(training_structure)와 기타 필드는 수정하지 않는다', () => {
    const result = baseResult();
    result.training_structure = [
      {
        competency_name: '역량A',
        level: 'BEGINNER',
        content: '내용',
        target_audience: '',
        method: '',
        goal: '',
      },
    ];
    result.training_structure_method = '체계 수립 방법';

    const out = sanitizeRoadmapResult(result);

    expect(out.training_structure).toEqual(result.training_structure);
    expect(out.training_structure_method).toBe('체계 수립 방법');
  });
});
