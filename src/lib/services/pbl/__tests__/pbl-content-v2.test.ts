/**
 * PBL Ⅳ장 LLM 프롬프트/스키마 테스트 (v2 양식)
 *
 * v2 변경점:
 *  - 성과분석 측정 지표(outcome_metrics)가 operation_plan 하위(training_goal 다음)로 이동
 *  - 성과 확산 전략(구 Ⅴ-2 diffusion_strategy)은 출력처 소멸 → 삭제
 *  - 최상위 outcome_analysis 래퍼 제거 → PBLContent = { operation_plan }
 *
 * 검증 범위:
 * 1. pblContentSchema safeParse — fixture 기반
 * 2. buildPBLSystemPrompt — Ⅳ few-shot + 성과분석 측정 지표 섹션 포함, diffusion 부재
 * 3. pbl-types 상수/타입 export
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { pblContentSchema } from '../pbl-validator';
import { buildPBLSystemPrompt, buildPBLUserPrompt } from '../pbl-prompts';
import { TRAINING_GOAL_CATEGORIES } from '../pbl-types';
import sampleFixture from '../__fixtures__/sample-llm-response.json';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

// ============================================================================
// 1. fixture safeParse — pblContentSchema
// ============================================================================

describe('pblContentSchema — fixture safeParse', () => {
  it('sample-llm-response.json 이 스키마를 통과한다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
  });

  it('operation_plan.outcome_metrics 필드가 올바르게 파싱된다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const metrics = result.data.operation_plan.outcome_metrics;
      expect(Array.isArray(metrics.selected_goals)).toBe(true);
      expect(metrics.selected_goals.length).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.quantitative).toBe('string');
      expect(typeof metrics.qualitative).toBe('string');
    }
  });

  it('operation_plan 기존 필드도 그대로 유지된다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const plan = result.data.operation_plan;
      expect(typeof plan.training_goal).toBe('string');
      expect(plan.outcome_metrics).toBeDefined();
      expect(Array.isArray(plan.ai_tool_usage_plan)).toBe(true);
      expect(plan.ai_tool_usage_plan.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('최상위 키는 operation_plan 하나뿐이다 (outcome_analysis 제거)', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    expect(Object.keys(sampleFixture)).toEqual(['operation_plan']);
    expect(sampleFixture).not.toHaveProperty('outcome_analysis');
  });

  it('result_evaluation null 배열 길이가 고정값(5/3/5/4)을 만족한다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const re = result.data.operation_plan.evaluation_plan.result_evaluation;
      expect(re.satisfaction_survey).toHaveLength(5);
      expect(re.achievement_survey).toHaveLength(3);
      expect(re.external_expert_survey).toHaveLength(5);
      expect(re.practical_application_survey).toHaveLength(4);
    }
  });

  it('subject_profile training_contents 강사 투입시간 합이 훈련시간과 일치한다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const contents = result.data.operation_plan.training_plan.subject_profile.training_contents;
      for (const row of contents) {
        const sum = row.instructor_hours.external + row.instructor_hours.internal;
        expect(Math.abs(sum - row.training_hours)).toBeLessThan(1e-6);
      }
    }
  });
});

// ============================================================================
// 2. outcome_metrics 스키마 거부 케이스 — 필수 필드 누락 시 실패
// ============================================================================

describe('pblContentSchema — outcome_metrics 거부 케이스', () => {
  function makeValidBase() {
    return JSON.parse(JSON.stringify(sampleFixture));
  }

  it('operation_plan.outcome_metrics 자체가 없으면 실패한다', () => {
    const data = makeValidBase();
    delete data.operation_plan.outcome_metrics;
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('outcome_metrics.selected_goals 빈 배열이면 실패한다', () => {
    const data = makeValidBase();
    data.operation_plan.outcome_metrics.selected_goals = [];
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('outcome_metrics.quantitative 빈 문자열이면 실패한다', () => {
    const data = makeValidBase();
    data.operation_plan.outcome_metrics.quantitative = '  ';
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('selected_goals에 허용값 이외 문자열이 포함되면 실패한다', () => {
    const data = makeValidBase();
    data.operation_plan.outcome_metrics.selected_goals = ['존재하지않는카테고리'];
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// 3. buildPBLSystemPrompt — Ⅳ few-shot + 성과분석 측정 지표 섹션
// ============================================================================

describe('buildPBLSystemPrompt — Ⅳ장 재설계 (성과분석 측정 지표 포함)', () => {
  let prompt: string;

  beforeAll(() => {
    prompt = buildPBLSystemPrompt();
  });

  it('Ⅳ-2 few-shot 예시(ai_tool_usage_plan)가 포함된다', () => {
    expect(prompt).toContain('ai_tool_usage_plan');
    expect(prompt).toContain('few-shot');
  });

  it('Ⅳ-3-다 few-shot 예시(training_contents)가 포함된다', () => {
    expect(prompt).toContain('training_contents');
    expect(prompt).toContain('total_sum_hours');
  });

  it('성과분석 측정 지표(outcome_metrics) 설계 원칙이 포함된다', () => {
    expect(prompt).toContain('outcome_metrics');
    expect(prompt).toContain('selected_goals');
  });

  it('정량/정성 지표 few-shot 예시가 포함된다', () => {
    expect(prompt).toContain('quantitative');
    expect(prompt).toContain('qualitative');
  });

  it('Ⅳ-4-나 LLM 생성 제외 안내가 포함된다', () => {
    expect(prompt).toContain('LLM 생성 제외');
  });

  it('outcome_metrics가 operation_plan 스키마 안에 위치한다 (별도 outcome_analysis 래퍼 없음)', () => {
    expect(prompt).toContain('operation_plan');
    expect(prompt).toContain('outcome_metrics');
    expect(prompt).not.toContain('outcome_analysis');
  });

  it('삭제된 성과 확산 전략(diffusion_strategy) 잔재가 없다', () => {
    expect(prompt).not.toContain('diffusion_strategy');
    expect(prompt).not.toContain('company_wide_diffusion');
    expect(prompt).not.toContain('internalization');
  });
});

// ============================================================================
// 4. TRAINING_GOAL_CATEGORIES 상수 export 검증
// ============================================================================

describe('TRAINING_GOAL_CATEGORIES 상수', () => {
  it('5개 카테고리를 정확히 포함한다', () => {
    expect(TRAINING_GOAL_CATEGORIES).toHaveLength(5);
    expect(TRAINING_GOAL_CATEGORIES).toContain('기술문제 해결');
    expect(TRAINING_GOAL_CATEGORIES).toContain('공정 최적화');
    expect(TRAINING_GOAL_CATEGORIES).toContain('불량률 감소');
    expect(TRAINING_GOAL_CATEGORIES).toContain('기술 매뉴얼 개발');
    expect(TRAINING_GOAL_CATEGORIES).toContain('기타');
  });
});

// ============================================================================
// 5. buildPBLUserPrompt — Ⅳ장 생성 요청 포함
// ============================================================================

describe('buildPBLUserPrompt — Ⅳ장 생성 요청 포함', () => {
  // V2 (PBLInterviewStrict, flat camelCase) 정본 fixture 사용.
  const fakeInterview = PBL_INTERVIEW_SAMPLE as unknown as Record<string, unknown>;

  it('프롬프트에 Ⅳ장 생성 요청 문구가 포함된다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
    expect(result).toContain('Ⅳ장');
  });
});
