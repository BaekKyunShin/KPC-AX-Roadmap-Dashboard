/**
 * roadmap-storage-mapper.ts 테스트
 * - toRoadmapVersionColumns: 신규 RoadmapResult → DB legacy 컬럼
 * - fromRoadmapVersionColumns: DB legacy 컬럼 → 신규 RoadmapResult (방어 코딩)
 */

import { describe, it, expect } from 'vitest';
import {
  toRoadmapVersionColumns,
  fromRoadmapVersionColumns,
} from './roadmap-storage-mapper';
import type { RoadmapResult } from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeFullResult(): RoadmapResult {
  return {
    diagnosis_summary: '진단 요약',
    competencies: [
      {
        name: '역량1',
        definition: '정의',
        knowledge: ['K'],
        skills: ['S'],
        attitudes: ['A'],
        ncs_used: false,
        ncs_derivation_method: '인터뷰',
      },
    ],
    training_structure: [
      {
        competency_name: '역량1',
        level: 'BEGINNER',
        content: 'c',
        target_audience: 't',
        method: '집체',
        goal: 'g',
      },
    ],
    annual_plan: {
      items: [
        {
          competency_name: '역량1',
          course_name: '과정1',
          format: '집체',
          hours: 16,
          notes: '비고',
        },
      ],
      usage_plan: '활용방안',
    },
    course_specs: [
      {
        course_name: '과정1',
        format: '집체',
        recommended_program: 'K-Digital Training',
        goal: '목표',
        main_content: '내용',
        target_audience: '전 직원',
        subjects: [{ name: '과목1', details: '상세', hours: 8 }],
      },
    ],
  };
}

// ─── toRoadmapVersionColumns ─────────────────────────────────────────────

describe('toRoadmapVersionColumns', () => {
  it('신규 RoadmapResult를 legacy 컬럼에 올바르게 매핑한다', () => {
    const result = makeFullResult();
    const cols = toRoadmapVersionColumns(result);

    expect(cols.diagnosis_summary).toBe('진단 요약');
    expect(cols.roadmap_matrix).toEqual(result.training_structure);
    expect(cols.pbl_course.competencies).toEqual(result.competencies);
    expect(cols.pbl_course.annual_plan).toEqual(result.annual_plan);
    expect(cols.courses).toEqual(result.course_specs);
  });

  it('빈 배열 필드도 안전하게 매핑한다', () => {
    const cols = toRoadmapVersionColumns({
      diagnosis_summary: '',
      competencies: [],
      training_structure: [],
      annual_plan: { items: [], usage_plan: '' },
      course_specs: [],
    });

    expect(cols.roadmap_matrix).toEqual([]);
    expect(cols.pbl_course.competencies).toEqual([]);
    expect(cols.pbl_course.annual_plan).toEqual({ items: [], usage_plan: '' });
    expect(cols.courses).toEqual([]);
  });
});

// ─── fromRoadmapVersionColumns ───────────────────────────────────────────

describe('fromRoadmapVersionColumns', () => {
  it('정상 legacy 컬럼 → RoadmapResult 복원 (round-trip)', () => {
    const original = makeFullResult();
    const cols = toRoadmapVersionColumns(original);
    const restored = fromRoadmapVersionColumns(cols);

    expect(restored).toEqual(original);
  });

  it('빈 row (모두 null) → 빈 RoadmapResult', () => {
    const restored = fromRoadmapVersionColumns({
      diagnosis_summary: null,
      roadmap_matrix: null,
      pbl_course: null,
      courses: null,
    });

    expect(restored).toEqual({
      diagnosis_summary: '',
      competencies: [],
      training_structure: [],
      annual_plan: { items: [], usage_plan: '' },
      course_specs: [],
    });
  });

  it('필드 누락 → 빈 배열/빈 문자열로 대체', () => {
    const restored = fromRoadmapVersionColumns({});

    expect(restored.diagnosis_summary).toBe('');
    expect(restored.competencies).toEqual([]);
    expect(restored.training_structure).toEqual([]);
    expect(restored.annual_plan).toEqual({ items: [], usage_plan: '' });
    expect(restored.course_specs).toEqual([]);
  });

  it('pbl_course가 객체지만 competencies 필드 없으면 빈 배열', () => {
    const restored = fromRoadmapVersionColumns({
      diagnosis_summary: '요약',
      roadmap_matrix: [],
      pbl_course: { annual_plan: { items: [], usage_plan: '활용' } },
      courses: [],
    });

    expect(restored.competencies).toEqual([]);
    expect(restored.annual_plan.usage_plan).toBe('활용');
  });

  it('pbl_course가 legacy 구조 (예전 PBLCourse 객체) → competencies/annual_plan 빈값', () => {
    const legacyPbl = {
      selected_course_name: '기존 과정',
      course_name: 'PBL',
      total_hours: 16,
    };
    const restored = fromRoadmapVersionColumns({
      diagnosis_summary: '요약',
      roadmap_matrix: [],
      pbl_course: legacyPbl,
      courses: [],
    });

    expect(restored.competencies).toEqual([]);
    expect(restored.annual_plan.items).toEqual([]);
    expect(restored.annual_plan.usage_plan).toBe('');
  });

  it('roadmap_matrix가 legacy RoadmapRow[]이면 type guard로 필터링되어 빈 배열', () => {
    const legacyMatrix = [
      { task_id: 't1', task_name: '업무', beginner: [], intermediate: [], advanced: [] },
      { task_id: 't2', task_name: '업무2', beginner: [], intermediate: [], advanced: [] },
    ];
    const restored = fromRoadmapVersionColumns({
      roadmap_matrix: legacyMatrix as unknown,
    });

    // 신규 RoadmapTrainingStructureItem 형식(competency_name + level)이 아니므로 모두 제외
    expect(restored.training_structure).toHaveLength(0);
  });

  it('roadmap_matrix가 null이면 빈 배열', () => {
    const restored = fromRoadmapVersionColumns({ roadmap_matrix: null });
    expect(restored.training_structure).toEqual([]);
  });

  it('roadmap_matrix가 객체(비배열)이면 빈 배열', () => {
    const restored = fromRoadmapVersionColumns({ roadmap_matrix: {} });
    expect(restored.training_structure).toEqual([]);
  });

  it('courses가 null이면 빈 배열', () => {
    const restored = fromRoadmapVersionColumns({ courses: null });
    expect(restored.course_specs).toEqual([]);
  });

  it('annual_plan.items가 배열 아님 → 빈 배열', () => {
    const restored = fromRoadmapVersionColumns({
      pbl_course: { annual_plan: { items: 'wrong', usage_plan: 'x' } },
    });
    expect(restored.annual_plan.items).toEqual([]);
    expect(restored.annual_plan.usage_plan).toBe('x');
  });

  it('annual_plan.usage_plan이 string 아님 → 빈 문자열', () => {
    const restored = fromRoadmapVersionColumns({
      pbl_course: { annual_plan: { items: [], usage_plan: 123 } },
    });
    expect(restored.annual_plan.usage_plan).toBe('');
  });

  it('diagnosis_summary가 숫자 등 비문자열 → 빈 문자열', () => {
    const restored = fromRoadmapVersionColumns({
      diagnosis_summary: 42 as unknown as string,
    });
    expect(restored.diagnosis_summary).toBe('');
  });
});
