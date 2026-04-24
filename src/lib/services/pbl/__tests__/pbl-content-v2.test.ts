/**
 * Task 2.10 — PBL Ⅳ·Ⅴ장 LLM 프롬프트 재설계 테스트
 *
 * 검증 범위:
 * 1. pblContentSchema (Ⅴ장 포함) safeParse — fixture 기반
 * 2. buildPBLSystemPrompt — Ⅳ few-shot + Ⅴ장 섹션 포함 여부
 * 3. pbl-types Ⅴ장 상수/타입 export
 * 4. pbl-validator Ⅴ장 비즈니스 검증
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { pblContentSchema } from '../pbl-validator';
import { buildPBLSystemPrompt, buildPBLUserPrompt } from '../pbl-prompts';
import { TRAINING_GOAL_CATEGORIES } from '../pbl-types';
import sampleFixture from '../__fixtures__/sample-llm-response.json';

// ============================================================================
// 1. fixture safeParse — pblContentSchema (Ⅴ장 포함)
// ============================================================================

describe('pblContentSchema — fixture safeParse', () => {
  it('sample-llm-response.json 이 스키마를 통과한다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
  });

  it('outcome_analysis.outcome_metrics 필드가 올바르게 파싱된다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const metrics = result.data.outcome_analysis.outcome_metrics;
      expect(Array.isArray(metrics.selected_goals)).toBe(true);
      expect(metrics.selected_goals.length).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.quantitative).toBe('string');
      expect(typeof metrics.qualitative).toBe('string');
    }
  });

  it('outcome_analysis.diffusion_strategy 필드가 올바르게 파싱된다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const strategy = result.data.outcome_analysis.diffusion_strategy;
      expect(typeof strategy.internalization).toBe('string');
      expect(strategy.internalization.trim().length).toBeGreaterThan(0);
      expect(typeof strategy.company_wide_diffusion).toBe('string');
      expect(strategy.company_wide_diffusion.trim().length).toBeGreaterThan(0);
    }
  });

  it('operation_plan 기존 필드도 그대로 유지된다', () => {
    const result = pblContentSchema.safeParse(sampleFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      const plan = result.data.operation_plan;
      expect(typeof plan.training_goal).toBe('string');
      expect(Array.isArray(plan.ai_tool_usage_plan)).toBe(true);
      expect(plan.ai_tool_usage_plan.length).toBeGreaterThanOrEqual(3);
    }
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
      const contents =
        result.data.operation_plan.training_plan.subject_profile.training_contents;
      for (const row of contents) {
        const sum = row.instructor_hours.external + row.instructor_hours.internal;
        expect(Math.abs(sum - row.training_hours)).toBeLessThan(1e-6);
      }
    }
  });
});

// ============================================================================
// 2. Ⅴ장 스키마 거부 케이스 — 필수 필드 누락 시 실패
// ============================================================================

describe('pblContentSchema — Ⅴ장 거부 케이스', () => {
  function makeValidBase() {
    return JSON.parse(JSON.stringify(sampleFixture));
  }

  it('outcome_analysis 자체가 없으면 실패한다', () => {
    const data = makeValidBase();
    delete data.outcome_analysis;
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('outcome_metrics.selected_goals 빈 배열이면 실패한다', () => {
    const data = makeValidBase();
    data.outcome_analysis.outcome_metrics.selected_goals = [];
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('outcome_metrics.quantitative 빈 문자열이면 실패한다', () => {
    const data = makeValidBase();
    data.outcome_analysis.outcome_metrics.quantitative = '  ';
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('diffusion_strategy.internalization 빈 문자열이면 실패한다', () => {
    const data = makeValidBase();
    data.outcome_analysis.diffusion_strategy.internalization = '';
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('selected_goals에 허용값 이외 문자열이 포함되면 실패한다', () => {
    const data = makeValidBase();
    data.outcome_analysis.outcome_metrics.selected_goals = ['존재하지않는카테고리'];
    const result = pblContentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// 3. buildPBLSystemPrompt — Ⅳ few-shot + Ⅴ장 섹션 포함 여부
// ============================================================================

describe('buildPBLSystemPrompt — Ⅳ·Ⅴ장 재설계', () => {
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

  it('Ⅴ-1 섹션(outcome_metrics) 설계 원칙이 포함된다', () => {
    expect(prompt).toContain('outcome_metrics');
    expect(prompt).toContain('selected_goals');
  });

  it('Ⅴ-2 섹션(diffusion_strategy) 설계 원칙이 포함된다', () => {
    expect(prompt).toContain('diffusion_strategy');
    expect(prompt).toContain('internalization');
    expect(prompt).toContain('company_wide_diffusion');
  });

  it('Ⅴ장 few-shot 예시(정량/정성 지표)가 포함된다', () => {
    expect(prompt).toContain('quantitative');
    expect(prompt).toContain('qualitative');
  });

  it('Ⅳ-4-나 LLM 생성 제외 안내가 포함된다', () => {
    expect(prompt).toContain('LLM 생성 제외');
  });

  it('outcome_analysis 최상위 키가 출력 JSON 스키마에 포함된다', () => {
    expect(prompt).toContain('outcome_analysis');
  });

  it('Ⅴ-2 내재화 방안 few-shot 예시가 포함된다', () => {
    expect(prompt).toContain('멘토-멘티');
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
// 5. buildPBLUserPrompt — Ⅴ장 생성 요청 포함
// ============================================================================

describe('buildPBLUserPrompt — Ⅴ장 생성 요청 포함', () => {
  const fakeInterview = {
    courseOverview: {
      company_name: '테스트제조(주)',
      course_name: 'AI 품질검사 자동화 과정',
      training_hours: 32,
      trainee_count: 5,
      training_job: '품질 관리',
      ai_level: 'AI탐구형',
      training_goals: ['불량률 감소'],
    },
    companyStatus: { business_issues: '불량률 문제', organization: [] },
    trainingEnvironment: {
      proper_training_hours: 32,
      training_place: { types: ['사내'], location: '본사', special_notes: '' },
      internal_instructor: { used: false, name: '', position: '' },
      target_count: 5,
      target_characteristics: { career: '3년 이상', level: '초급' },
      ai_infrastructure: { ai_tools: '가능', network: '양호', pc_count: 10, etc_equipment: '' },
      training_needs_analysis: 'AI 도구 실무 적용',
      expectation: { as_is: '수동 검사', to_be: 'AI 자동화' },
    },
    hrdNecessity: { course_development_necessity: 'AI 과정 필요', training_history: [], recommendations: [] },
    performanceActivities: { performance_activities: [] },
    problemDefinition: {
      problem_definition: { background: '', core_problem: '', scope: '', constraints: '' },
      problem_priorities: [],
    },
    targetTasks: { target_tasks: [], selection_reason: '', target_task_details: [] },
    aiLevelDiagnosis: { current_ai_level: 'AI탐구형', expected_ai_level: 'AI활용형', improvement_reason: '훈련 후 역량 향상' },
  };

  it('프롬프트에 Ⅴ장 생성 요청 문구가 포함된다', () => {
    const result = buildPBLUserPrompt(fakeInterview, {}, null, '요약');
    expect(result).toContain('Ⅴ장');
  });
});
