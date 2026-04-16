/**
 * roadmap-time-utils.ts 테스트
 * - sumModuleHours: 시간 합산 (음수/NaN/null 처리)
 * - normalizeRoadmapHours: course_specs.subjects.hours, annual_plan.items.hours 보정
 */

import { describe, it, expect } from 'vitest';
import { sumModuleHours, normalizeRoadmapHours } from './roadmap-time-utils';
import type { LLMRoadmapResult } from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<LLMRoadmapResult> = {}): LLMRoadmapResult {
  return {
    diagnosis_summary: '진단',
    competencies: [],
    training_structure: [],
    annual_plan: {
      items: [],
      usage_plan: '활용방안',
    },
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

// ─── normalizeRoadmapHours ───────────────────────────────────────────────

describe('normalizeRoadmapHours', () => {
  it('정상 값은 그대로 보존', () => {
    const input = makeResult({
      annual_plan: {
        items: [
          { competency_name: 'A', course_name: 'C', format: '집체', hours: 16, notes: '' },
        ],
        usage_plan: '활용',
      },
      course_specs: [
        {
          course_name: 'C',
          format: '집체',
          recommended_program: 'K-Digital',
          goal: 'goal',
          main_content: 'content',
          target_audience: '전 직원',
          subjects: [{ name: 'S1', details: 'd', hours: 8 }],
        },
      ],
    });

    const result = normalizeRoadmapHours(input);

    expect(result.annual_plan.items[0].hours).toBe(16);
    expect(result.course_specs[0].subjects[0].hours).toBe(8);
  });

  it('annual_plan.items의 음수 hours → 0', () => {
    const input = makeResult({
      annual_plan: {
        items: [
          { competency_name: 'A', course_name: 'C', format: '집체', hours: -10, notes: '' },
        ],
        usage_plan: '활용',
      },
    });

    const result = normalizeRoadmapHours(input);
    expect(result.annual_plan.items[0].hours).toBe(0);
  });

  it('annual_plan.items의 NaN → 0', () => {
    const input = makeResult({
      annual_plan: {
        items: [
          { competency_name: 'A', course_name: 'C', format: '집체', hours: Number.NaN, notes: '' },
        ],
        usage_plan: '활용',
      },
    });

    const result = normalizeRoadmapHours(input);
    expect(result.annual_plan.items[0].hours).toBe(0);
  });

  it('course_specs.subjects의 음수 hours → 0', () => {
    const input = makeResult({
      course_specs: [
        {
          course_name: 'C',
          format: '집체',
          recommended_program: 'K-Digital',
          goal: 'goal',
          main_content: 'content',
          target_audience: '전 직원',
          subjects: [{ name: 'S1', details: 'd', hours: -5 }],
        },
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('course_specs.subjects의 Infinity → 0', () => {
    const input = makeResult({
      course_specs: [
        {
          course_name: 'C',
          format: '집체',
          recommended_program: 'K-Digital',
          goal: 'goal',
          main_content: 'content',
          target_audience: '전 직원',
          subjects: [{ name: 'S1', details: 'd', hours: Number.POSITIVE_INFINITY }],
        },
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('course_specs.subjects의 hours가 undefined → 0', () => {
    const input = makeResult({
      course_specs: [
        {
          course_name: 'C',
          format: '집체',
          recommended_program: 'K-Digital',
          goal: 'goal',
          main_content: 'content',
          target_audience: '전 직원',
          // hours 없이 들어온 경우 (as-cast로 재현)
          subjects: [{ name: 'S1', details: 'd' } as unknown as { name: string; details: string; hours: number }],
        },
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.course_specs[0].subjects[0].hours).toBe(0);
  });

  it('diagnosis_summary / competencies / training_structure는 변경되지 않음', () => {
    const input = makeResult({
      diagnosis_summary: '진단 요약',
      competencies: [
        {
          name: 'A',
          definition: 'def',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: false,
          ncs_derivation_method: '인터뷰',
        },
      ],
      training_structure: [
        {
          competency_name: 'A',
          level: 'BEGINNER',
          content: 'c',
          target_audience: 't',
          method: '집체',
          goal: 'g',
        },
      ],
    });

    const result = normalizeRoadmapHours(input);
    expect(result.diagnosis_summary).toBe('진단 요약');
    expect(result.competencies).toEqual(input.competencies);
    expect(result.training_structure).toEqual(input.training_structure);
  });

  it('annual_plan.items / course_specs가 빈 배열이어도 안전하게 처리', () => {
    const input = makeResult();
    const result = normalizeRoadmapHours(input);

    expect(result.annual_plan.items).toEqual([]);
    expect(result.course_specs).toEqual([]);
  });

  it('annual_plan.usage_plan은 보존된다', () => {
    const input = makeResult({
      annual_plan: {
        items: [
          { competency_name: 'A', course_name: 'C', format: '집체', hours: 10, notes: '' },
        ],
        usage_plan: '활용 계획 원본',
      },
    });

    const result = normalizeRoadmapHours(input);
    expect(result.annual_plan.usage_plan).toBe('활용 계획 원본');
  });

  it('원본 입력은 변경되지 않는다 (불변성)', () => {
    const input = makeResult({
      course_specs: [
        {
          course_name: 'C',
          format: '집체',
          recommended_program: 'K-Digital',
          goal: 'goal',
          main_content: 'content',
          target_audience: '전 직원',
          subjects: [{ name: 'S1', details: 'd', hours: -5 }],
        },
      ],
    });

    normalizeRoadmapHours(input);
    expect(input.course_specs[0].subjects[0].hours).toBe(-5);
  });
});
