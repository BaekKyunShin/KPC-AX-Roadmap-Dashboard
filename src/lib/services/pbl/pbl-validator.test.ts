import { describe, expect, it } from 'vitest';
import type { PBLContent } from './pbl-types';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from './pbl-types';
import { parsePBLContent, validatePBLContent } from './pbl-validator';

function createValidPBLContent(): PBLContent {
  return {
    operation_plan: {
      training_goal: '생산 공정의 불량률을 감소시키는 AI 활용 역량 확보',
      ai_tool_usage_plan: [
        {
          stage: '1단계',
          main_activity: '훈련실시',
          ai_tools: ['Lovable', 'Cursor'],
          utilized_data: '공정 로그 CSV',
          purpose: '실습용 학습 데이터 확보',
          specific_method: '실습 환경에서 AI 도구로 공정 데이터 분석',
        },
        {
          stage: '2단계',
          main_activity: '리뷰 및 피드백',
          ai_tools: ['ChatGPT'],
          utilized_data: '실습 결과물',
          purpose: '피드백 자동화',
          specific_method: 'AI로 실습 결과 리뷰 및 개선점 도출',
        },
        {
          stage: '3단계',
          main_activity: '최종 결과 및 평가',
          ai_tools: ['Cursor'],
          utilized_data: '평가 데이터',
          purpose: '성과 측정',
          specific_method: '최종 결과물 AI 기반 평가',
        },
      ],
      training_plan: {
        overview: {
          course_name: 'AI 기반 품질관리 과정',
          training_period: { start: '2026-05-01', end: '2026-06-30' },
        },
        learning_group: {
          instructors: [
            {
              type: '외부',
              role: '팀장',
              affiliation: '한국생산성본부',
              position: '수석 컨설턴트',
              name: '홍길동',
            },
          ],
          trainees: [
            {
              role: '팀원',
              affiliation: '품질관리팀',
              position: '사원',
              name: '김철수',
            },
          ],
        },
        subject_profile: {
          course_name: 'AI 기반 품질관리 과정',
          total_hours: 40,
          training_goals: ['AI 도구 활용 능력 확보', '공정 데이터 분석 역량 강화'],
          ai_tools: ['Cursor', 'ChatGPT'],
          utilized_data: '공정 로그 CSV',
          analysis_method: 'LLM 기반 패턴 분석',
          training_contents: [
            {
              unit_name: 'AI 개요 및 데이터 수집',
              detail: '공정 데이터 수집·정제 실습',
              training_hours: 16,
              instructor_hours: { external: 8, internal: 8 },
            },
            {
              unit_name: '품질 예측 모델링',
              detail: '공정 로그 기반 불량 예측 모델 구축',
              training_hours: 24,
              instructor_hours: { external: 12, internal: 12 },
            },
          ],
          total_sum_hours: 40,
        },
        facilities: [
          {
            seq: 1,
            category: '시설',
            name: '본사 3층 교육장',
            spec: '30명 수용',
            location: '본사',
          },
        ],
        training_instructors: [
          {
            name: '홍길동',
            internal_external: '외부',
            career_years: 10,
            work_name: 'AI 기반 품질관리 과정',
            detailed_training_content: ['AI 개요 및 데이터 수집', '품질 예측 모델링'],
          },
        ],
      },
      evaluation_plan: {
        course_evaluation: {
          course_name: 'AI 기반 품질관리 과정',
          evaluation_methods: ['포트폴리오', '작업장 평가'],
          evaluation_target: '훈련생 전원',
          evaluation_date: '2026-06-25',
          evaluation_criteria: '14개 중 수행수준 4 이상 8개(60%) 이상시 PASS',
          evaluation_result: '예정',
          performance_checklist: [
            {
              unit_name: 'AI 개요 및 데이터 수집',
              evaluation_criteria: '공정 데이터 수집 절차 이해',
              performance_level: 4,
            },
          ],
          overall_comment: '',
          evaluation_scale: PBL_EVALUATION_SCALE_DESCRIPTION,
        },
        result_evaluation: {
          satisfaction_survey: [null, null, null, null, null],
          achievement_survey: [null, null, null],
          external_expert_survey: [null, null, null, null, null],
          practical_application_survey: [null, null, null, null],
        },
      },
    },
    performance_analysis: {
      training_goal_categories: ['기술문제 해결', '불량률 감소'],
      quantitative_metrics: ['훈련 이후 불량발생률 20% 감소'],
      qualitative_metrics: ['복잡한 현장 문제에 대한 자율적 해결 능력 향상'],
      internalization_plan: ['매뉴얼 제작', '지식 공유 세션'],
      dissemination_plan: ['성과 발표회'],
    },
  };
}

describe('pbl-validator - 성공 케이스', () => {
  it('유효한 PBLContent를 성공적으로 파싱한다', () => {
    const content = createValidPBLContent();
    expect(() => parsePBLContent(content)).not.toThrow();
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('pbl-validator - AI 도구 활용 계획', () => {
  it('3단계 미만이면 실패', () => {
    const content = createValidPBLContent();
    content.operation_plan.ai_tool_usage_plan = content.operation_plan.ai_tool_usage_plan.slice(0, 2);
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('최소 3단계'))).toBe(true);
  });

  it('단계 필드 중 하나가 비면 실패', () => {
    const content = createValidPBLContent();
    content.operation_plan.ai_tool_usage_plan[0]!.main_activity = '';
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
  });
});

describe('pbl-validator - 교과목 프로파일 강사 투입시간', () => {
  it('외부+내부 합이 훈련시간과 다르면 실패', () => {
    const content = createValidPBLContent();
    content.operation_plan.training_plan.subject_profile.training_contents[0]!.instructor_hours = {
      external: 5,
      internal: 5,
    }; // 합 10 ≠ training_hours 16
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('강사 투입시간'))).toBe(true);
  });

  it('total_sum_hours가 training_contents 합과 다르면 실패', () => {
    const content = createValidPBLContent();
    content.operation_plan.training_plan.subject_profile.total_sum_hours = 100; // 실제 40
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
  });
});

describe('pbl-validator - 과정평가 performance_level', () => {
  it('performance_level 1~5 범위만 허용', () => {
    const content = createValidPBLContent();
    // @ts-expect-error 의도적 범위 이탈
    content.operation_plan.evaluation_plan.course_evaluation.performance_checklist[0]!.performance_level = 6;
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
  });

  it('evaluation_methods enum만 허용', () => {
    const content = createValidPBLContent();
    // @ts-expect-error 의도적 enum 이탈
    content.operation_plan.evaluation_plan.course_evaluation.evaluation_methods = ['잘못된값'];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
  });
});

describe('pbl-validator - 결과평가 설문 문항 수 고정', () => {
  it('만족도 설문은 정확히 5문항이어야 한다', () => {
    const content = createValidPBLContent();
    content.operation_plan.evaluation_plan.result_evaluation.satisfaction_survey = [null, null];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('만족도'))).toBe(true);
  });

  it('성취도 설문은 정확히 3문항이어야 한다', () => {
    const content = createValidPBLContent();
    content.operation_plan.evaluation_plan.result_evaluation.achievement_survey = [null, null, null, null];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('성취도'))).toBe(true);
  });

  it('외부전문가 만족도는 정확히 5문항이어야 한다', () => {
    const content = createValidPBLContent();
    content.operation_plan.evaluation_plan.result_evaluation.external_expert_survey = [null, null];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('외부전문가'))).toBe(true);
  });

  it('현업적용도는 정확히 4문항이어야 한다', () => {
    const content = createValidPBLContent();
    content.operation_plan.evaluation_plan.result_evaluation.practical_application_survey = [null, null];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('현업적용도'))).toBe(true);
  });
});

describe('pbl-validator - Ⅴ장 성과분석', () => {
  it('training_goal_categories enum만 허용', () => {
    const content = createValidPBLContent();
    // @ts-expect-error 의도적 enum 이탈
    content.performance_analysis.training_goal_categories = ['존재하지않는분류'];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
  });

  it('정량/정성/내재화/전사 확산 각 최소 1개', () => {
    const content = createValidPBLContent();
    content.performance_analysis.quantitative_metrics = [];
    const result = validatePBLContent(content);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('정량'))).toBe(true);
  });
});

describe('pbl-validator - 경고(warnings)', () => {
  it('placeholder 수치(00%) 포함 시 warning', () => {
    const content = createValidPBLContent();
    content.performance_analysis.quantitative_metrics = ['훈련 이후 불량발생률 00% 감소'];
    const result = validatePBLContent(content);
    // errors 비어있고 warnings만 남아야 한다
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('00%'))).toBe(true);
  });

  it('시설·장비 연번 중복 시 warning', () => {
    const content = createValidPBLContent();
    content.operation_plan.training_plan.facilities = [
      { seq: 1, category: '시설', name: 'A', spec: 'spec', location: '본사' },
      { seq: 1, category: '장비', name: 'B', spec: 'spec', location: '본사' },
    ];
    const result = validatePBLContent(content);
    expect(result.warnings.some((w) => w.includes('연번 중복'))).toBe(true);
  });
});
