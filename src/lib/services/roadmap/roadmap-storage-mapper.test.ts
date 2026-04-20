/**
 * roadmap-storage-mapper.ts 테스트
 * - toRoadmapVersionColumns: 신규 RoadmapResult → DB legacy 컬럼
 * - fromRoadmapVersionColumns: DB legacy 컬럼 → 신규 RoadmapResult
 *   (신규 필드 + legacy 역량별 NCS 승격 + 방어 코딩)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  toRoadmapVersionColumns,
  fromRoadmapVersionColumns,
} from './roadmap-storage-mapper';
import type { RoadmapResult } from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeFullResult(): RoadmapResult {
  return {
    diagnosis_summary: '진단 요약',
    setup_necessity: '수립 필요성',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '품질검사 자동화',
      main_content: '3단계 AI 인력 양성',
    },
    competencies: [
      {
        name: '역량1',
        definition: '정의',
        knowledge: ['K'],
        skills: ['S'],
        attitudes: ['A'],
      },
    ],
    ncs_used: false,
    ncs_methodology: '',
    ncs_derivation_method: '현업 인터뷰 기반 도출',
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
    training_structure_method: '역량 기준 3수준 체계 수립',
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
  it('신규 RoadmapResult를 legacy 컬럼에 올바르게 매핑한다 (신규 필드 포함)', () => {
    const result = makeFullResult();
    const cols = toRoadmapVersionColumns(result);

    expect(cols.diagnosis_summary).toBe('진단 요약');
    expect(cols.roadmap_matrix).toEqual(result.training_structure);
    expect(cols.pbl_course.competencies).toEqual(result.competencies);
    expect(cols.pbl_course.annual_plan).toEqual(result.annual_plan);
    expect(cols.pbl_course.setup_necessity).toBe('수립 필요성');
    expect(cols.pbl_course.outcome_summary).toEqual(result.outcome_summary);
    expect(cols.pbl_course.training_structure_method).toBe('역량 기준 3수준 체계 수립');
    expect(cols.pbl_course.ncs).toEqual({
      used: false,
      methodology: '',
      derivation_method: '현업 인터뷰 기반 도출',
    });
    expect(cols.courses).toEqual(result.course_specs);
  });

  it('빈 배열 필드도 안전하게 매핑한다', () => {
    const cols = toRoadmapVersionColumns({
      diagnosis_summary: '',
      setup_necessity: '',
      outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
      competencies: [],
      ncs_used: false,
      ncs_methodology: '',
      ncs_derivation_method: '',
      training_structure: [],
      training_structure_method: '',
      annual_plan: { items: [], usage_plan: '' },
      course_specs: [],
    });

    expect(cols.roadmap_matrix).toEqual([]);
    expect(cols.pbl_course.competencies).toEqual([]);
    expect(cols.pbl_course.annual_plan).toEqual({ items: [], usage_plan: '' });
    expect(cols.pbl_course.setup_necessity).toBe('');
    expect(cols.pbl_course.ncs).toEqual({ used: false, methodology: '', derivation_method: '' });
    expect(cols.courses).toEqual([]);
  });
});

// ─── fromRoadmapVersionColumns ───────────────────────────────────────────

describe('fromRoadmapVersionColumns', () => {
  it('정상 legacy 컬럼 → RoadmapResult 복원 (round-trip, 신규 필드 포함)', () => {
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
      setup_necessity: '',
      outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
      competencies: [],
      ncs_used: false,
      ncs_methodology: '',
      ncs_derivation_method: '',
      training_structure: [],
      training_structure_method: '',
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
    expect(restored.ncs_used).toBe(false);
    expect(restored.setup_necessity).toBe('');
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

  it('outcome_summary.ai_competency_level 잘못된 enum → BEGINNER fallback', () => {
    const restored = fromRoadmapVersionColumns({
      pbl_course: {
        outcome_summary: { ai_competency_level: 'EXPERT', selected_tasks: 'X', main_content: 'Y' },
      },
    });
    expect(restored.outcome_summary.ai_competency_level).toBe('BEGINNER');
    expect(restored.outcome_summary.selected_tasks).toBe('X');
  });
});

describe('fromRoadmapVersionColumns — legacy 역량별 NCS 승격', () => {
  it('legacy 역량이 ncs_used=true + ncs_methodology 보유 → 루트로 승격 + 역량 필드 제거', () => {
    const legacyPbl = {
      competencies: [
        {
          name: '역량A',
          definition: '정의A',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: true,
          ncs_methodology: 'NCS 빅데이터 분석 세분류 활용',
        },
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: legacyPbl });
    expect(restored.ncs_used).toBe(true);
    expect(restored.ncs_methodology).toBe('NCS 빅데이터 분석 세분류 활용');
    // 역량에는 ncs_* 필드가 없어야 함
    expect(restored.competencies[0]).not.toHaveProperty('ncs_used');
    expect(restored.competencies[0]).not.toHaveProperty('ncs_methodology');
  });

  it('legacy 역량이 ncs_used=false + ncs_derivation_method 보유 → 루트로 승격', () => {
    const legacyPbl = {
      competencies: [
        {
          name: '역량B',
          definition: '정의B',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: false,
          ncs_derivation_method: '전문가 인터뷰 기반',
        },
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: legacyPbl });
    expect(restored.ncs_used).toBe(false);
    expect(restored.ncs_derivation_method).toBe('전문가 인터뷰 기반');
  });

  it('legacy 여러 역량에 서로 다른 NCS 값 → 첫 값만 승격 + warn 로그', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacyPbl = {
      competencies: [
        {
          name: 'A',
          definition: 'a',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: true,
          ncs_methodology: '방법1',
        },
        {
          name: 'B',
          definition: 'b',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: true,
          ncs_methodology: '방법2',
        },
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: legacyPbl });
    expect(restored.ncs_methodology).toBe('방법1');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('루트 ncs가 존재하면 legacy 역량 승격보다 우선', () => {
    const pbl = {
      competencies: [
        {
          name: 'A',
          definition: 'a',
          knowledge: [],
          skills: [],
          attitudes: [],
          ncs_used: false,
          ncs_derivation_method: '레거시',
        },
      ],
      annual_plan: { items: [], usage_plan: '' },
      ncs: { used: true, methodology: '루트 방법', derivation_method: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    expect(restored.ncs_used).toBe(true);
    expect(restored.ncs_methodology).toBe('루트 방법');
  });

  it('competencies 배열에 유효하지 않은 항목(null, string)이 포함되면 필터링된다', () => {
    // isCompetency: !v || typeof v !== 'object' → false 반환 분기 커버
    const pbl = {
      competencies: [
        null, // !v → false 반환
        'invalid', // typeof !== 'object' → false 반환
        { name: '역량1', definition: '정의', knowledge: [], skills: [], attitudes: [] }, // 유효
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    expect(restored.competencies).toHaveLength(1);
    expect(restored.competencies[0].name).toBe('역량1');
  });

  it('knowledge/skills/attitudes가 배열이 아니면 빈 배열로 초기화된다', () => {
    // sanitizeCompetency: Array.isArray 조건 false → [] 분기 커버 (id 18-20)
    const pbl = {
      competencies: [
        {
          name: '역량1',
          definition: '정의',
          knowledge: 'not-array', // 배열이 아님
          skills: null,           // 배열이 아님
          attitudes: 42,          // 배열이 아님
        },
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    expect(restored.competencies[0].knowledge).toEqual([]);
    expect(restored.competencies[0].skills).toEqual([]);
    expect(restored.competencies[0].attitudes).toEqual([]);
  });

  it('training_structure 배열에 유효하지 않은 항목이 포함되면 필터링된다', () => {
    // isStructureItem: !v || typeof v !== 'object' → false 반환 분기 커버 (id 21)
    const pbl = {
      competencies: [],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({
      pbl_course: pbl,
      roadmap_matrix: [
        null, // 필터됨
        { competency_name: '역량1', level: 'BEGINNER', content: '', target_audience: '', method: '', goal: '' },
      ],
    });
    expect(restored.training_structure).toHaveLength(1);
  });

  it('annual_plan items에 유효하지 않은 항목이 포함되면 필터링된다', () => {
    // isAnnualPlanItem: !v || typeof v !== 'object' → false 반환 분기 커버 (id 24)
    const pbl = {
      competencies: [],
      annual_plan: {
        items: [
          null, // 필터됨
          { competency_name: '역량1', course_name: '과정1', format: '집체', hours: 8, notes: '' },
        ],
        usage_plan: '',
      },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    expect(restored.annual_plan.items).toHaveLength(1);
  });

  it('course_specs에 유효하지 않은 항목이 포함되면 필터링된다', () => {
    // isCourseSpec: !v || typeof v !== 'object' → false 반환 분기 커버 (id 27)
    const pbl = {
      competencies: [],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({
      pbl_course: pbl,
      courses: [
        null, // 필터됨
        { course_name: '과정1', subjects: [], format: '집체', recommended_program: '', goal: '', main_content: '', target_audience: '' },
      ],
    });
    expect(restored.course_specs).toHaveLength(1);
  });

  it('NCS legacy 역량들이 divergent(불일치)이면 경고를 출력하고 첫 값을 사용한다', () => {
    // Lines 196-206: divergent true → firstUsed !== c.ncs_used 분기 커버 (id 41, 45)
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pbl = {
      competencies: [
        { name: 'A', definition: 'a', knowledge: [], skills: [], attitudes: [], ncs_used: true, ncs_methodology: '방법1' },
        { name: 'B', definition: 'b', knowledge: [], skills: [], attitudes: [], ncs_used: false, ncs_methodology: '방법2' }, // divergent
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    // 첫 번째 값(true) 사용
    expect(restored.ncs_used).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('NCS methodology divergent 시 첫 번째 비어있지 않은 값만 루트로 승격한다', () => {
    // Lines 200-206: firstMethodology !== c.ncs_methodology divergent 분기 커버 (id 48)
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pbl = {
      competencies: [
        { name: 'A', definition: 'a', knowledge: [], skills: [], attitudes: [], ncs_methodology: '방법A' },
        { name: 'B', definition: 'b', knowledge: [], skills: [], attitudes: [], ncs_methodology: '방법B' }, // 다름
      ],
      annual_plan: { items: [], usage_plan: '' },
    };
    const restored = fromRoadmapVersionColumns({ pbl_course: pbl });
    expect(restored.ncs_methodology).toBe('방법A');
    consoleSpy.mockRestore();
  });
});

describe('toRoadmapVersionColumns — undefined 필드 기본값', () => {
  it('RoadmapResult 필드가 undefined이면 기본값으로 폴백된다', () => {
    // Lines 61-79: ?? 연산자 오른쪽 피연산자 분기 커버 (id 0-10)
    const result = {
      diagnosis_summary: undefined as unknown as string,
      setup_necessity: undefined as unknown as string,
      outcome_summary: undefined as unknown as RoadmapResult['outcome_summary'],
      competencies: undefined as unknown as RoadmapResult['competencies'],
      ncs_used: undefined as unknown as boolean,
      ncs_methodology: undefined as unknown as string,
      ncs_derivation_method: undefined as unknown as string,
      training_structure: undefined as unknown as RoadmapResult['training_structure'],
      training_structure_method: undefined as unknown as string,
      annual_plan: undefined as unknown as RoadmapResult['annual_plan'],
      course_specs: undefined as unknown as RoadmapResult['course_specs'],
    };
    const cols = toRoadmapVersionColumns(result as unknown as Parameters<typeof toRoadmapVersionColumns>[0]);
    expect(cols.diagnosis_summary).toBe('');
    expect(cols.roadmap_matrix).toEqual([]);
    expect(cols.pbl_course.competencies).toEqual([]);
    expect(cols.pbl_course.setup_necessity).toBe('');
    expect(cols.pbl_course.training_structure_method).toBe('');
    expect(cols.pbl_course.ncs.used).toBe(false);
    expect(cols.pbl_course.ncs.methodology).toBe('');
    expect(cols.pbl_course.ncs.derivation_method).toBe('');
    expect(cols.courses).toEqual([]);
  });
});
