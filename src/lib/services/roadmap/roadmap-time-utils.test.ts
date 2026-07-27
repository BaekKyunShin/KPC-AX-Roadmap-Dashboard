/**
 * roadmap-time-utils.ts 테스트 — 산인공 공식 양식 v2
 * - sumModuleHours: 시간 합산 (음수/NaN/null 처리)
 * - normalizeRoadmapHours: course_specs[*].subjects[*].hours 만 보정
 *   (v1 의 annual_plan.items[*].hours 는 연간계획 표가 양식에서 삭제되어 함께 제거)
 */

import { describe, it, expect } from 'vitest';
import { sumModuleHours, normalizeRoadmapHours } from './roadmap-time-utils';
import type { LLMRoadmapResult, RoadmapCourseSpec } from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeCourseSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: 'C',
    training_method: '집체',
    recommended_program: 'K-Digital',
    goal: 'goal',
    main_content: 'content',
    target_audience: '전 직원',
    subjects: [{ name: 'S1', details: 'd', hours: 8 }],
    ...overrides,
  };
}

function makeResult(overrides: Partial<LLMRoadmapResult> = {}): LLMRoadmapResult {
  return {
    diagnosis_summary: '진단',
    setup_necessity: '',
    outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
    course_specs: [],
    ...overrides,
  };
}

// ─── sumModuleHours ───────────────────────────────────────────────────────

describe('sumModuleHours', () => {
  it('undefined → 0', () => {
    expect(sumModuleHours(undefined)).toBe(0);
  });

  it('null → 0', () => {
    expect(sumModuleHours(null)).toBe(0);
  });

  it('빈 배열 → 0', () => {
    expect(sumModuleHours([])).toBe(0);
  });

  it('정상 시간 합산', () => {
    expect(sumModuleHours([{ hours: 4 }, { hours: 8 }, { hours: 2 }])).toBe(14);
  });

  it('0 시간은 그대로 0', () => {
    expect(sumModuleHours([{ hours: 0 }, { hours: 5 }])).toBe(5);
  });

  it('음수 시간은 합산에서 제외', () => {
    expect(sumModuleHours([{ hours: -3 }, { hours: 10 }])).toBe(10);
  });

  it('NaN은 합산에서 제외', () => {
    expect(sumModuleHours([{ hours: Number.NaN }, { hours: 7 }])).toBe(7);
  });

  it('Infinity는 합산에서 제외', () => {
    expect(sumModuleHours([{ hours: Number.POSITIVE_INFINITY }, { hours: 4 }])).toBe(4);
  });

  it('hours가 undefined/null인 항목은 무시', () => {
    expect(sumModuleHours([{ hours: undefined }, { hours: null }, { hours: 6 }])).toBe(6);
  });
});

// ─── normalizeRoadmapHours — course_specs.subjects.hours 보정 ────────────

describe('normalizeRoadmapHours', () => {
  it('정상 값은 그대로 보존', () => {
    const input = makeResult({
      course_specs: [makeCourseSpec({ subjects: [{ name: 'S1', details: 'd', hours: 8 }] })],
    });

    const result = normalizeRoadmapHours(input);

    expect(result.course_specs[0].subjects[0].hours).toBe(8);
  });

  it('course_specs.subjects의 음수 hours → 0', () => {
    const input = makeResult({
      course_specs: [makeCourseSpec({ subjects: [{ name: 'S1', details: 'd', hours: -5 }] })],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('course_specs.subjects의 NaN → 0', () => {
    const input = makeResult({
      course_specs: [
        makeCourseSpec({ subjects: [{ name: 'S1', details: 'd', hours: Number.NaN }] }),
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('course_specs.subjects의 Infinity → 0', () => {
    const input = makeResult({
      course_specs: [
        makeCourseSpec({
          subjects: [{ name: 'S1', details: 'd', hours: Number.POSITIVE_INFINITY }],
        }),
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('course_specs.subjects의 hours가 undefined → 0', () => {
    const input = makeResult({
      course_specs: [
        makeCourseSpec({
          // hours 없이 들어온 경우 (as-cast로 재현)
          subjects: [
            { name: 'S1', details: 'd' } as unknown as {
              name: string;
              details: string;
              hours: number;
            },
          ],
        }),
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('0 시간은 0으로 보존된다 (음수만 보정 대상)', () => {
    const input = makeResult({
      course_specs: [makeCourseSpec({ subjects: [{ name: 'S1', details: 'd', hours: 0 }] })],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('명세서 6개 · 교과목 다건이어도 모든 hours가 보정된다', () => {
    const input = makeResult({
      course_specs: Array.from({ length: 6 }, (_, i) =>
        makeCourseSpec({
          course_name: `과정${i + 1}`,
          subjects: [
            { name: 'S1', details: 'd', hours: -1 },
            { name: 'S2', details: 'd', hours: Number.NaN },
            { name: 'S3', details: 'd', hours: 4 },
          ],
        })
      ),
    });

    const result = normalizeRoadmapHours(input);

    expect(result.course_specs).toHaveLength(6);
    for (const spec of result.course_specs) {
      expect(spec.subjects.map((s) => s.hours)).toEqual([0, 0, 4]);
    }
  });

  it('course_specs가 빈 배열이어도 안전하게 처리', () => {
    const result = normalizeRoadmapHours(makeResult());
    expect(result.course_specs).toEqual([]);
  });

  it('subjects가 빈 배열이어도 안전하게 처리', () => {
    const input = makeResult({ course_specs: [makeCourseSpec({ subjects: [] })] });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects).toEqual([]);
  });

  // ─── v2 신규 필드 보존 ─────────────────────────────────────────────────

  it('v2 신규 필드(training_period·training_level·training_method)는 보존된다', () => {
    const input = makeResult({
      course_specs: [
        makeCourseSpec({
          training_period: '2026년 상반기',
          training_level: 'ADVANCED',
          training_method: '혼합',
          subjects: [{ name: 'S1', details: 'd', hours: -3 }],
        }),
      ],
    });

    const result = normalizeRoadmapHours(input);
    const spec = result.course_specs[0];

    expect(spec.training_period).toBe('2026년 상반기');
    expect(spec.training_level).toBe('ADVANCED');
    expect(spec.training_method).toBe('혼합');
    // hours 만 보정
    expect(spec.subjects[0].hours).toBe(0);
  });

  it('명세서의 나머지 필드(과정명·교과목명·세부내용)도 보존된다', () => {
    const input = makeResult({
      course_specs: [
        makeCourseSpec({
          course_name: '노코드 AI 비전검사 실무',
          recommended_program: 'K-Digital Training',
          goal: '훈련 목표',
          main_content: '주요 내용',
          target_audience: '품질검사 실무자',
          subjects: [{ name: '교과목명', details: '세부 내용', hours: 6 }],
        }),
      ],
    });

    const result = normalizeRoadmapHours(input);
    const spec = result.course_specs[0];

    expect(spec.course_name).toBe('노코드 AI 비전검사 실무');
    expect(spec.recommended_program).toBe('K-Digital Training');
    expect(spec.goal).toBe('훈련 목표');
    expect(spec.main_content).toBe('주요 내용');
    expect(spec.target_audience).toBe('품질검사 실무자');
    expect(spec.subjects[0]).toEqual({ name: '교과목명', details: '세부 내용', hours: 6 });
  });

  it('Ⅰ장 필드(diagnosis_summary·setup_necessity·outcome_summary)는 변경되지 않음', () => {
    const input = makeResult({
      diagnosis_summary: '진단 요약',
      setup_necessity: '수립 배경',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks: '선정 과업',
        main_content: '수립 주요내용',
      },
      course_specs: [makeCourseSpec()],
    });

    const result = normalizeRoadmapHours(input);

    expect(result.diagnosis_summary).toBe('진단 요약');
    expect(result.setup_necessity).toBe('수립 배경');
    expect(result.outcome_summary).toEqual(input.outcome_summary);
  });

  it('원본 입력은 변경되지 않는다 (불변성)', () => {
    const input = makeResult({
      course_specs: [makeCourseSpec({ subjects: [{ name: 'S1', details: 'd', hours: -5 }] })],
    });

    normalizeRoadmapHours(input);
    expect(input.course_specs[0].subjects[0].hours).toBe(-5);
  });
});
