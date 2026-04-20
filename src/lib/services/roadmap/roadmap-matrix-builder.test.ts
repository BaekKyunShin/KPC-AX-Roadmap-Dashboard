/**
 * roadmap-matrix-builder.ts 테스트
 * - buildTrainingStructureMatrix: 역량 × 수준 매트릭스 생성 (UI용)
 * - buildTrainingStructureTable: 6열 단순 표 변환 (HWPX/PDF 출력용)
 */

import { describe, it, expect } from 'vitest';
import { buildTrainingStructureMatrix, buildTrainingStructureTable } from './roadmap-matrix-builder';
import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  TrainingLevel,
} from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeCompetency(
  name: string,
  overrides: Partial<RoadmapCompetency> = {},
): RoadmapCompetency {
  return {
    name,
    definition: `${name} 정의`,
    knowledge: ['K1'],
    skills: ['S1'],
    attitudes: ['A1'],
    ...overrides,
  };
}

function makeItem(
  competency_name: string,
  level: TrainingLevel,
  overrides: Partial<RoadmapTrainingStructureItem> = {},
): RoadmapTrainingStructureItem {
  return {
    competency_name,
    level,
    content: `${competency_name} ${level} 내용`,
    target_audience: '전 직원',
    method: '집체',
    goal: '훈련 목표',
    ...overrides,
  };
}

// ─── 테스트 ──────────────────────────────────────────────────────────────

describe('buildTrainingStructureMatrix', () => {
  it('빈 competencies + 빈 structure → 빈 배열', () => {
    expect(buildTrainingStructureMatrix([], [])).toEqual([]);
  });

  it('competencies만 있고 structure는 비어있으면 빈 셀만 가진 행들 반환', () => {
    const result = buildTrainingStructureMatrix(
      [makeCompetency('데이터 분석'), makeCompetency('AI 활용')],
      [],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      competency_name: '데이터 분석',
      beginner: [],
      intermediate: [],
      advanced: [],
    });
    expect(result[1].competency_name).toBe('AI 활용');
  });

  it('역량 2개 × 수준 3개 매트릭스 생성 (전부 채워짐)', () => {
    const competencies = [makeCompetency('데이터 분석'), makeCompetency('AI 활용')];
    const structure = [
      makeItem('데이터 분석', 'BEGINNER'),
      makeItem('데이터 분석', 'INTERMEDIATE'),
      makeItem('데이터 분석', 'ADVANCED'),
      makeItem('AI 활용', 'BEGINNER'),
      makeItem('AI 활용', 'INTERMEDIATE'),
      makeItem('AI 활용', 'ADVANCED'),
    ];

    const result = buildTrainingStructureMatrix(competencies, structure);

    expect(result).toHaveLength(2);
    expect(result[0].beginner).toHaveLength(1);
    expect(result[0].intermediate).toHaveLength(1);
    expect(result[0].advanced).toHaveLength(1);
    expect(result[1].beginner).toHaveLength(1);
    expect(result[1].intermediate).toHaveLength(1);
    expect(result[1].advanced).toHaveLength(1);
  });

  it('일부 수준만 채워지면 나머지 셀은 빈 배열로 유지', () => {
    const result = buildTrainingStructureMatrix(
      [makeCompetency('데이터 분석')],
      [makeItem('데이터 분석', 'BEGINNER')],
    );

    expect(result[0].beginner).toHaveLength(1);
    expect(result[0].intermediate).toEqual([]);
    expect(result[0].advanced).toEqual([]);
  });

  it('같은 (역량, 수준) 셀에 여러 항목이 들어가면 배열에 누적', () => {
    const structure = [
      makeItem('데이터 분석', 'BEGINNER', { content: '기초 1' }),
      makeItem('데이터 분석', 'BEGINNER', { content: '기초 2' }),
      makeItem('데이터 분석', 'BEGINNER', { content: '기초 3' }),
    ];

    const result = buildTrainingStructureMatrix(
      [makeCompetency('데이터 분석')],
      structure,
    );

    expect(result[0].beginner).toHaveLength(3);
    expect(result[0].beginner.map((i) => i.content)).toEqual(['기초 1', '기초 2', '기초 3']);
  });

  it('미참조 역량 (structure에는 있으나 competencies에 없음)은 끝에 별도 행으로 추가', () => {
    const competencies = [makeCompetency('데이터 분석')];
    const structure = [
      makeItem('데이터 분석', 'BEGINNER'),
      makeItem('알 수 없는 역량', 'INTERMEDIATE'),
    ];

    const result = buildTrainingStructureMatrix(competencies, structure);

    expect(result).toHaveLength(2);
    expect(result[0].competency_name).toBe('데이터 분석');
    expect(result[1].competency_name).toBe('알 수 없는 역량');
    expect(result[1].intermediate).toHaveLength(1);
  });

  it('competencies의 순서를 보존한다', () => {
    const competencies = [
      makeCompetency('C'),
      makeCompetency('A'),
      makeCompetency('B'),
    ];

    const result = buildTrainingStructureMatrix(competencies, []);

    expect(result.map((r) => r.competency_name)).toEqual(['C', 'A', 'B']);
  });

  it('구조 항목의 level에 따라 올바른 셀에 분배한다', () => {
    const structure = [
      makeItem('역량1', 'BEGINNER', { content: 'B' }),
      makeItem('역량1', 'INTERMEDIATE', { content: 'I' }),
      makeItem('역량1', 'ADVANCED', { content: 'A' }),
    ];

    const result = buildTrainingStructureMatrix(
      [makeCompetency('역량1')],
      structure,
    );

    expect(result[0].beginner[0].content).toBe('B');
    expect(result[0].intermediate[0].content).toBe('I');
    expect(result[0].advanced[0].content).toBe('A');
  });

  it('competencies만으로 생성된 행 + 미참조 역량 행이 섞인 순서 보존', () => {
    const competencies = [makeCompetency('A'), makeCompetency('B')];
    const structure = [
      makeItem('Unknown1', 'BEGINNER'),
      makeItem('A', 'BEGINNER'),
      makeItem('Unknown2', 'ADVANCED'),
    ];

    const result = buildTrainingStructureMatrix(competencies, structure);

    // 순서: competencies 먼저(A, B) → 등장 순서대로 미참조(Unknown1, Unknown2)
    expect(result.map((r) => r.competency_name)).toEqual(['A', 'B', 'Unknown1', 'Unknown2']);
  });

  it('중복된 미참조 역량은 같은 행에 병합된다', () => {
    const structure = [
      makeItem('Unknown', 'BEGINNER', { content: 'x' }),
      makeItem('Unknown', 'INTERMEDIATE', { content: 'y' }),
      makeItem('Unknown', 'BEGINNER', { content: 'z' }),
    ];

    const result = buildTrainingStructureMatrix([], structure);

    expect(result).toHaveLength(1);
    expect(result[0].beginner).toHaveLength(2);
    expect(result[0].intermediate).toHaveLength(1);
  });
});

describe('buildTrainingStructureTable', () => {
  it('빈 structure → 빈 배열', () => {
    expect(buildTrainingStructureTable([makeCompetency('역량1')], [])).toEqual([]);
  });

  it('역량×수준 항목을 6열 행으로 전개 (역량명·훈련수준·내용·대상·방법·목표)', () => {
    const rows = buildTrainingStructureTable(
      [makeCompetency('데이터 분석'), makeCompetency('AI 활용')],
      [
        makeItem('데이터 분석', 'BEGINNER'),
        makeItem('데이터 분석', 'ADVANCED'),
        makeItem('AI 활용', 'INTERMEDIATE'),
      ],
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      competency_name: '데이터 분석',
      level_label: '초급',
      content: '데이터 분석 BEGINNER 내용',
      target_audience: '전 직원',
      method: '집체',
      goal: '훈련 목표',
    });
    expect(rows[1].level_label).toBe('고급');
    expect(rows[2]).toMatchObject({ competency_name: 'AI 활용', level_label: '중급' });
  });

  it('competencies 순서 + 수준 오름차순(초/중/고) 정렬', () => {
    const rows = buildTrainingStructureTable(
      [makeCompetency('A'), makeCompetency('B')],
      [
        makeItem('B', 'ADVANCED'),
        makeItem('A', 'INTERMEDIATE'),
        makeItem('A', 'BEGINNER'),
        makeItem('B', 'BEGINNER'),
      ],
    );

    expect(rows.map((r) => `${r.competency_name}/${r.level_label}`)).toEqual([
      'A/초급',
      'A/중급',
      'B/초급',
      'B/고급',
    ]);
  });

  it('미참조 역량은 competencies 뒤에 추가, 수준 순서 유지', () => {
    const rows = buildTrainingStructureTable(
      [makeCompetency('A')],
      [
        makeItem('Unknown', 'BEGINNER'),
        makeItem('A', 'BEGINNER'),
      ],
    );

    expect(rows.map((r) => r.competency_name)).toEqual(['A', 'Unknown']);
  });
});
