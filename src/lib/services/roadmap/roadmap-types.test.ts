/**
 * roadmap-types.ts 테스트 — 산인공 공식 양식 v2 (2026-07-13 개정) 구조 검증
 *
 * v2 에서 Ⅲ장이 "훈련체계 수립"에서 "훈련실시 계획 제안"으로 재설계되면서
 * 역량 모델링·NCS·훈련체계도·연간 훈련계획 표가 전부 삭제되었다.
 *
 * - 삭제 필드 부재:  competencies · ncs_used · ncs_methodology ·
 *                    ncs_derivation_method · training_structure ·
 *                    training_structure_method · annual_plan
 * - 신규 필드 존재:  course_specs[*].training_period · training_level
 *                    (+ 구 `format` → `training_method` 로 개명)
 * - 명세서 개수:     ROADMAP_COURSE_SPEC_COUNT = 6 (v1 은 3)
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  TrainingLevel,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  RoadmapOutcomeSummary,
  LLMRoadmapResult,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';
import { TRAINING_LEVEL_LABEL, ROADMAP_COURSE_SPEC_COUNT } from './roadmap-types';

// ─── 타입 형태 (v2) ───────────────────────────────────────────────────────

describe('roadmap-types — v2 인터페이스 형태', () => {
  it('TrainingLevel은 BEGINNER | INTERMEDIATE | ADVANCED 유니온이다', () => {
    expectTypeOf<TrainingLevel>().toEqualTypeOf<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>();
  });

  it('RoadmapOutcomeSummary는 Ⅰ-3 수립 주요 결과 3필드다', () => {
    expectTypeOf<RoadmapOutcomeSummary>().toEqualTypeOf<{
      ai_competency_level: TrainingLevel;
      selected_tasks: string;
      main_content: string;
    }>();
  });

  it('RoadmapCourseSubject는 교과목명·세부내용·시간을 보유한다', () => {
    expectTypeOf<RoadmapCourseSubject>().toEqualTypeOf<{
      name: string;
      details: string;
      hours: number;
    }>();
  });

  it('RoadmapCourseSpec는 v2 9필드를 정확히 보유한다 (훈련시기·훈련수준·훈련방법 포함)', () => {
    expectTypeOf<RoadmapCourseSpec>().toEqualTypeOf<{
      training_period: string;
      training_level: TrainingLevel;
      course_name: string;
      training_method: string;
      recommended_program: string;
      goal: string;
      main_content: string;
      target_audience: string;
      subjects: RoadmapCourseSubject[];
    }>();
  });

  it('LLMRoadmapResult는 v2 4필드만 보유한다 (Ⅰ-1 · Ⅰ-3 · Ⅲ + 진단요약)', () => {
    expectTypeOf<LLMRoadmapResult>().toEqualTypeOf<{
      diagnosis_summary: string;
      setup_necessity: string;
      outcome_summary: RoadmapOutcomeSummary;
      course_specs: RoadmapCourseSpec[];
    }>();
  });

  it('RoadmapResult는 LLMRoadmapResult와 동일한 구조이다', () => {
    expectTypeOf<RoadmapResult>().toEqualTypeOf<LLMRoadmapResult>();
  });

  it('ValidationResult는 isValid, errors, warnings를 보유한다', () => {
    expectTypeOf<ValidationResult>().toEqualTypeOf<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>();
  });
});

// ─── 신규 필드 존재 (v2) ──────────────────────────────────────────────────

describe('roadmap-types — v2 신규 필드 존재', () => {
  it('RoadmapCourseSpec에 training_period(훈련시기)가 존재한다', () => {
    expectTypeOf<RoadmapCourseSpec>().toHaveProperty('training_period').toEqualTypeOf<string>();
  });

  it('RoadmapCourseSpec에 training_level(훈련수준)이 존재하며 TrainingLevel 이다', () => {
    expectTypeOf<RoadmapCourseSpec>()
      .toHaveProperty('training_level')
      .toEqualTypeOf<TrainingLevel>();
  });

  it('RoadmapCourseSpec에 training_method(훈련방법)가 존재한다 (구 format 개명)', () => {
    expectTypeOf<RoadmapCourseSpec>().toHaveProperty('training_method').toEqualTypeOf<string>();
  });
});

// ─── 삭제 필드 부재 (v1 → v2) ─────────────────────────────────────────────

describe('roadmap-types — v1 삭제 필드 부재', () => {
  it('LLMRoadmapResult에 역량 모델링(competencies)이 없다', () => {
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('competencies');
  });

  it('LLMRoadmapResult에 NCS 필드(ncs_used·ncs_methodology·ncs_derivation_method)가 없다', () => {
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('ncs_used');
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('ncs_methodology');
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('ncs_derivation_method');
  });

  it('LLMRoadmapResult에 훈련체계도(training_structure·training_structure_method)가 없다', () => {
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('training_structure');
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('training_structure_method');
  });

  it('LLMRoadmapResult에 연간 훈련계획(annual_plan)이 없다', () => {
    expectTypeOf<LLMRoadmapResult>().not.toHaveProperty('annual_plan');
  });

  it('RoadmapCourseSpec에 구 필드 format이 없다 (training_method 로 개명됨)', () => {
    expectTypeOf<RoadmapCourseSpec>().not.toHaveProperty('format');
  });
});

// ─── 상수 ─────────────────────────────────────────────────────────────────

describe('roadmap-types — 상수', () => {
  it('ROADMAP_COURSE_SPEC_COUNT는 6이다 (양식 Ⅲ장 명세서 표 개수, v1 3 → v2 6)', () => {
    expect(ROADMAP_COURSE_SPEC_COUNT).toBe(6);
  });

  it('TRAINING_LEVEL_LABEL은 BEGINNER/INTERMEDIATE/ADVANCED 를 한글 초급/중급/고급 으로 매핑한다', () => {
    expect(TRAINING_LEVEL_LABEL.BEGINNER).toBe('초급');
    expect(TRAINING_LEVEL_LABEL.INTERMEDIATE).toBe('중급');
    expect(TRAINING_LEVEL_LABEL.ADVANCED).toBe('고급');
  });

  it('TRAINING_LEVEL_LABEL은 TrainingLevel 3종만 키로 가진다', () => {
    expect(Object.keys(TRAINING_LEVEL_LABEL).sort()).toEqual([
      'ADVANCED',
      'BEGINNER',
      'INTERMEDIATE',
    ]);
  });
});

// ─── 샘플 객체 ────────────────────────────────────────────────────────────

describe('roadmap-types — 샘플 객체', () => {
  it('v2 샘플 RoadmapResult 객체는 타입 검사를 통과한다', () => {
    const sample: RoadmapResult = {
      diagnosis_summary: '진단',
      setup_necessity: '수립 배경',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks: '선정 과업',
        main_content: '수립 주요내용',
      },
      course_specs: [
        {
          training_period: '2026년 1분기',
          training_level: 'BEGINNER',
          course_name: '기초 과정',
          training_method: '집체',
          recommended_program: '사업주 직업능력개발훈련',
          goal: '목표',
          main_content: '내용',
          target_audience: '대상',
          subjects: [{ name: '과목1', details: '세부', hours: 4 }],
        },
      ],
    };

    expect(sample.course_specs[0].training_period).toBe('2026년 1분기');
    expect(sample.course_specs[0].training_level).toBe('BEGINNER');
    expect(sample.course_specs[0].training_method).toBe('집체');
    expectTypeOf(sample).toEqualTypeOf<RoadmapResult>();
  });
});
