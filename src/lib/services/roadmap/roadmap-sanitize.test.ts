import { describe, it, expect } from 'vitest';
import { isEmptyCourseSubject, isEmptyCourseSpec, sanitizeRoadmapResult } from './roadmap-sanitize';
import type { RoadmapCourseSubject, RoadmapCourseSpec, RoadmapResult } from './roadmap-types';

// ============================================================================
// 빈 행 자동 정리 — 산인공 양식 v2
// ----------------------------------------------------------------------------
// v1 의 역량(competencies)·연간계획(annual_plan) 정리 함수는 해당 표가 양식에서
// 삭제되면서 함께 제거됐다. v2 의 정리 대상은 훈련과정 명세서와 그 교과목뿐이다.
// ============================================================================

function makeSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 상반기',
    training_level: 'BEGINNER',
    course_name: '과정A',
    training_method: '집체',
    recommended_program: '일반직무훈련',
    goal: '목표',
    main_content: '주요내용',
    target_audience: '대상',
    subjects: [{ name: '교과목1', details: '세부', hours: 4 }],
    ...overrides,
  };
}

function makeResult(overrides: Partial<RoadmapResult> = {}): RoadmapResult {
  return {
    diagnosis_summary: '진단',
    setup_necessity: '수립 배경',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '선정 과업',
      main_content: '요약',
    },
    course_specs: [makeSpec()],
    ...overrides,
  };
}

describe('isEmptyCourseSubject', () => {
  it('name과 details가 모두 공백이면 true', () => {
    const s: RoadmapCourseSubject = { name: '', details: '   ', hours: 0 };
    expect(isEmptyCourseSubject(s)).toBe(true);
  });

  it('name이 있으면 false', () => {
    expect(isEmptyCourseSubject({ name: '교과목1', details: '', hours: 0 })).toBe(false);
  });

  it('details만 있어도 false', () => {
    expect(isEmptyCourseSubject({ name: '', details: '세부내용', hours: 0 })).toBe(false);
  });
});

describe('isEmptyCourseSpec', () => {
  it('course_name이 공백이고 유효 교과목도 없으면 true', () => {
    const spec = makeSpec({
      course_name: '  ',
      subjects: [{ name: '', details: '', hours: 0 }],
    });
    expect(isEmptyCourseSpec(spec)).toBe(true);
  });

  it('course_name이 있으면 false', () => {
    expect(isEmptyCourseSpec(makeSpec({ course_name: '과정A', subjects: [] }))).toBe(false);
  });

  it('course_name이 공백이어도 유효한 교과목이 있으면 false', () => {
    const spec = makeSpec({
      course_name: '',
      subjects: [{ name: '교과목1', details: '', hours: 0 }],
    });
    expect(isEmptyCourseSpec(spec)).toBe(false);
  });
});

describe('sanitizeRoadmapResult', () => {
  it('빈 교과목 행을 제거한다', () => {
    const result = sanitizeRoadmapResult(
      makeResult({
        course_specs: [
          makeSpec({
            subjects: [
              { name: '교과목1', details: '세부', hours: 4 },
              { name: '', details: '', hours: 0 },
            ],
          }),
        ],
      })
    );
    expect(result.course_specs[0].subjects).toHaveLength(1);
    expect(result.course_specs[0].subjects[0].name).toBe('교과목1');
  });

  it('빈 명세서 카드를 제거한다', () => {
    const result = sanitizeRoadmapResult(
      makeResult({
        course_specs: [
          makeSpec({ course_name: '과정A' }),
          makeSpec({ course_name: '', subjects: [{ name: '', details: '', hours: 0 }] }),
        ],
      })
    );
    expect(result.course_specs).toHaveLength(1);
    expect(result.course_specs[0].course_name).toBe('과정A');
  });

  it('v2 신규 필드(훈련시기·훈련수준)를 보존한다', () => {
    const result = sanitizeRoadmapResult(
      makeResult({
        course_specs: [makeSpec({ training_period: '2026년 하반기', training_level: 'ADVANCED' })],
      })
    );
    expect(result.course_specs[0].training_period).toBe('2026년 하반기');
    expect(result.course_specs[0].training_level).toBe('ADVANCED');
  });

  it('원본 객체를 변형하지 않는다 (불변)', () => {
    const original = makeResult({
      course_specs: [makeSpec({ subjects: [{ name: '', details: '', hours: 0 }] })],
    });
    const before = original.course_specs[0].subjects.length;
    sanitizeRoadmapResult(original);
    expect(original.course_specs[0].subjects).toHaveLength(before);
  });

  it('Ⅰ장 필드(setup_necessity·outcome_summary)는 그대로 통과시킨다', () => {
    const result = sanitizeRoadmapResult(makeResult());
    expect(result.setup_necessity).toBe('수립 배경');
    expect(result.outcome_summary.selected_tasks).toBe('선정 과업');
  });

  it('삭제된 v1 키(competencies·annual_plan)를 결과에 붙이지 않는다', () => {
    const result = sanitizeRoadmapResult(makeResult());
    expect(Object.keys(result).sort()).toEqual(
      ['course_specs', 'diagnosis_summary', 'outcome_summary', 'setup_necessity'].sort()
    );
  });
});
