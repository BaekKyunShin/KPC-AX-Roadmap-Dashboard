import { describe, it, expect } from 'vitest';
import { validateRoadmap } from './roadmap-validator';
import type { RoadmapResult, RoadmapCourseSpec } from './roadmap-types';

// ============================================================================
// validateRoadmap — 신규 양식(v2) 검증 정책
// ----------------------------------------------------------------------------
// Ⅲ장이 "훈련체계 수립"에서 "훈련실시 계획 제안"으로 재설계되어
// 역량 모델링·NCS·훈련체계도·연간 훈련계획이 양식에서 삭제되었다.
// 남은 생성물은 훈련과정 명세서 6개뿐이며, 각 명세서에 훈련시기·훈련수준이 추가됐다.
//
// 정책:
//  1. course_specs.length >= 6              (error)
//  2. course_specs[*].subjects.length >= 1  (error)
//  3. course_specs[*].course_name 공백       (error)
//  4. course_specs[*].training_period 공백   (warning)
//  5. diagnosis_summary 공백                 (warning)
// ============================================================================

function makeCourseSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 상반기',
    training_level: 'BEGINNER',
    course_name: '데이터분석 입문',
    training_method: '집체',
    recommended_program: '일반직무훈련',
    goal: '목표',
    main_content: '내용',
    target_audience: '대상',
    subjects: [{ name: '과목1', details: '세부', hours: 4 }],
    ...overrides,
  };
}

function makeSixSpecs(): RoadmapCourseSpec[] {
  return ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => makeCourseSpec({ course_name: `과정${n}` }));
}

function makeValidRoadmap(overrides: Partial<RoadmapResult> = {}): RoadmapResult {
  return {
    diagnosis_summary: '진단 요약',
    setup_necessity: '수립 필요성',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '선정 과업',
      main_content: '수립 주요내용',
    },
    course_specs: makeSixSpecs(),
    ...overrides,
  };
}

describe('validateRoadmap — 정상 케이스', () => {
  it('명세서 6개를 갖춘 로드맵 → isValid=true, errors=[]', () => {
    const result = validateRoadmap(makeValidRoadmap());
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateRoadmap — 훈련과정 명세서 개수 (신규 양식: 6개)', () => {
  it('course_specs가 6개 미만이면 error', () => {
    const result = validateRoadmap(makeValidRoadmap({ course_specs: makeSixSpecs().slice(0, 5) }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('명세서') && e.includes('6'))).toBe(true);
  });

  it('course_specs가 정확히 6개면 개수 error 없음', () => {
    const result = validateRoadmap(makeValidRoadmap());
    expect(result.errors.filter((e) => e.includes('명세서'))).toEqual([]);
  });
});

describe('validateRoadmap — 명세서 신규 필드 (훈련시기·훈련수준)', () => {
  it('training_period가 비어있으면 warning', () => {
    const specs = makeSixSpecs();
    specs[0] = makeCourseSpec({ course_name: '과정A', training_period: '' });
    const result = validateRoadmap(makeValidRoadmap({ course_specs: specs }));
    expect(result.warnings.some((w) => w.includes('훈련시기'))).toBe(true);
  });

  it('training_level 이 ADVANCED 여도 정상 통과한다 (3단계 유니온)', () => {
    const specs = makeSixSpecs();
    specs[0] = makeCourseSpec({ course_name: '과정A', training_level: 'ADVANCED' });
    const result = validateRoadmap(makeValidRoadmap({ course_specs: specs }));
    expect(result.isValid).toBe(true);
  });
});

describe('validateRoadmap — 명세서 필수 항목', () => {
  it('course_specs[*].subjects가 비어있으면 error', () => {
    const specs = makeSixSpecs();
    specs[0] = makeCourseSpec({ course_name: '과정A', subjects: [] });
    const result = validateRoadmap(makeValidRoadmap({ course_specs: specs }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('교과목'))).toBe(true);
  });

  it('course_specs[*].course_name이 공백이면 error', () => {
    const specs = makeSixSpecs();
    specs[0] = makeCourseSpec({ course_name: '' });
    const result = validateRoadmap(makeValidRoadmap({ course_specs: specs }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('과정명'))).toBe(true);
  });
});

describe('validateRoadmap — 진단 요약', () => {
  it('diagnosis_summary가 비어있으면 warning', () => {
    const result = validateRoadmap(makeValidRoadmap({ diagnosis_summary: '' }));
    expect(result.warnings.some((w) => w.includes('진단'))).toBe(true);
  });
});
