/**
 * roadmap-storage-mapper.ts 테스트 — 산인공 양식 v2 (2026-07-13 개정)
 *
 * 운영 DB 에 v1 구조로 저장된 FINAL 확정본이 실재하므로(2026-07 기준 9건),
 * 읽기 경로는 반드시 하위호환되어야 한다:
 *   - v1 orphan 키(competencies·annual_plan·ncs·training_structure)는 조용히 무시
 *   - v1 course_specs 의 `format` → v2 `training_method` 로 승격
 *   - v2 신규 필드(training_period·training_level)는 없으면 기본값으로 backfill
 */

import { describe, it, expect } from 'vitest';
import { toRoadmapVersionColumns, fromRoadmapVersionColumns } from './roadmap-storage-mapper';
import type { RoadmapCourseSpec, RoadmapResult } from './roadmap-types';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function makeSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 상반기',
    training_level: 'INTERMEDIATE',
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
    diagnosis_summary: '진단 요약',
    setup_necessity: '수립 배경',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks: '선정 과업',
      main_content: '수립 주요내용',
    },
    course_specs: [makeSpec()],
    ...overrides,
  };
}

describe('toRoadmapVersionColumns — v2 저장', () => {
  it('삭제된 v1 필드 없이 legacy 컬럼 3종에 매핑한다', () => {
    const cols = toRoadmapVersionColumns(makeResult());

    expect(cols.diagnosis_summary).toBe('진단 요약');
    expect(cols.pbl_course.setup_necessity).toBe('수립 배경');
    expect(cols.pbl_course.outcome_summary.ai_competency_level).toBe('INTERMEDIATE');
    expect(cols.courses).toHaveLength(1);
    expect(cols.courses[0].training_period).toBe('2026년 상반기');
    expect(cols.courses[0].training_level).toBe('INTERMEDIATE');
    expect(cols.courses[0].training_method).toBe('집체');
  });

  it('미사용이 된 roadmap_matrix 컬럼은 빈 배열로 저장한다', () => {
    const cols = toRoadmapVersionColumns(makeResult());
    expect(cols.roadmap_matrix).toEqual([]);
  });
});

describe('fromRoadmapVersionColumns — v1 legacy row 하위호환', () => {
  const legacyRow = {
    diagnosis_summary: '진단',
    // v1 orphan: 훈련체계도
    roadmap_matrix: [{ competency_name: '데이터분석', level: 'BEGINNER', content: 'c' }],
    pbl_course: {
      // v1 orphan: 역량 모델링 · 연간계획 · NCS
      competencies: [{ name: '데이터분석', definition: '정의' }],
      annual_plan: {
        items: [{ competency_name: '데이터분석', course_name: '과정A' }],
        usage_plan: '활용',
      },
      ncs: { used: true, methodology: 'NCS 활용', derivation_method: '' },
      // v2 에서도 유지되는 필드
      setup_necessity: '수립 배경',
      outcome_summary: {
        ai_competency_level: 'ADVANCED',
        selected_tasks: '선정 과업',
        main_content: '요약',
      },
    },
    // v1 course_specs: format 보유, training_period·training_level 없음
    courses: [
      {
        course_name: '과정A',
        format: '집체',
        recommended_program: '일반직무훈련',
        goal: '목표',
        main_content: '주요내용',
        target_audience: '대상',
        subjects: [{ name: '교과목1', details: '세부', hours: 4 }],
      },
    ],
  };

  it('v1 orphan 키(competencies·annual_plan·ncs)를 무시하고 파싱한다', () => {
    const result = fromRoadmapVersionColumns(legacyRow);

    expect(result.diagnosis_summary).toBe('진단');
    expect(result.setup_necessity).toBe('수립 배경');
    expect(result.outcome_summary.ai_competency_level).toBe('ADVANCED');
    // orphan 키가 결과 객체에 섞여 나오지 않는다
    expect(Object.keys(result).sort()).toEqual(
      ['course_specs', 'diagnosis_summary', 'outcome_summary', 'setup_necessity'].sort()
    );
  });

  it('v1 course_specs 의 format 을 training_method 로 승격한다', () => {
    const result = fromRoadmapVersionColumns(legacyRow);
    expect(result.course_specs[0].training_method).toBe('집체');
  });

  it('v2 신규 필드가 없는 v1 row 는 기본값으로 backfill 한다', () => {
    const result = fromRoadmapVersionColumns(legacyRow);
    expect(result.course_specs[0].training_period).toBe('');
    expect(result.course_specs[0].training_level).toBe('BEGINNER');
  });
});

describe('fromRoadmapVersionColumns — v2 row', () => {
  it('v2 신규 필드가 있으면 그대로 보존한다', () => {
    const result = fromRoadmapVersionColumns({
      diagnosis_summary: '진단',
      roadmap_matrix: [],
      pbl_course: {
        setup_necessity: '배경',
        outcome_summary: {
          ai_competency_level: 'BEGINNER',
          selected_tasks: 't',
          main_content: 'm',
        },
      },
      courses: [makeSpec({ training_period: '2026년 하반기', training_level: 'ADVANCED' })],
    });
    expect(result.course_specs[0].training_period).toBe('2026년 하반기');
    expect(result.course_specs[0].training_level).toBe('ADVANCED');
    expect(result.course_specs[0].training_method).toBe('집체');
  });

  it('왕복 변환(to → from)이 값을 보존한다', () => {
    const original = makeResult({
      course_specs: [makeSpec(), makeSpec({ course_name: '과정B' })],
    });
    const roundTripped = fromRoadmapVersionColumns(toRoadmapVersionColumns(original));
    expect(roundTripped).toEqual(original);
  });
});

describe('fromRoadmapVersionColumns — 방어적 파싱', () => {
  it('null/누락 row 는 빈 기본값으로 안전 변환한다', () => {
    const result = fromRoadmapVersionColumns({});
    expect(result.diagnosis_summary).toBe('');
    expect(result.setup_necessity).toBe('');
    expect(result.outcome_summary.ai_competency_level).toBe('BEGINNER');
    expect(result.course_specs).toEqual([]);
  });

  it('잘못된 course_specs 원소는 필터링한다', () => {
    const result = fromRoadmapVersionColumns({
      courses: [null, { course_name: '과정A', subjects: [] }, 'bad'],
    });
    expect(result.course_specs).toHaveLength(1);
    expect(result.course_specs[0].course_name).toBe('과정A');
  });

  it('유효하지 않은 training_level 은 BEGINNER 로 폴백한다', () => {
    const result = fromRoadmapVersionColumns({
      courses: [{ course_name: 'A', subjects: [], training_level: 'SUPER' }],
    });
    expect(result.course_specs[0].training_level).toBe('BEGINNER');
  });
});
