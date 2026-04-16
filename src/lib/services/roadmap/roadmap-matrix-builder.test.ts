/**
 * roadmap-matrix-builder.ts 테스트
 * - buildTrainingStructureMatrix: 역량 × 수준 매트릭스 생성
 */

import { describe, it, expect } from 'vitest';
import { buildTrainingStructureMatrix } from './roadmap-matrix-builder';
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
    ncs_used: false,
    ncs_derivation_method: '인터뷰',
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
