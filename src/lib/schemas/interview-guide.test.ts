import { describe, it, expect } from 'vitest';
import { guideDataSchema, guideQuestionSchema, guideKeyPointSchema, updateGuideQuestionsSchema } from './interview-guide';

// ============================================================================
// 유효한 테스트 데이터
// ============================================================================

const validKeyPoint = {
  dimension: '데이터 준비도',
  score_percent: 28,
  status: 'critical' as const,
  insight: '데이터 수집 체계가 거의 없는 상태입니다.',
};

const validQuestion = {
  id: 'q1',
  dimension: '데이터 준비도',
  question: '업무 데이터를 어떤 시스템에서 관리하고 계신가요?',
  intent: '데이터 저장 현황 파악',
  checked: true,
  is_custom: false,
};

const validGuideData = {
  company_summary: '전자/반도체 업종 중견기업으로 AI 도입 의지는 높으나 데이터 인프라가 부족합니다.',
  key_points: [validKeyPoint],
  questions: [validQuestion],
  cautions: ['AI 성숙도는 높으나 데이터가 부족한 상태이므로 기대 관리가 필요합니다.'],
};

// ============================================================================
// guideKeyPointSchema
// ============================================================================

describe('guideKeyPointSchema', () => {
  it('유효한 key point를 통과시킨다', () => {
    expect(guideKeyPointSchema.safeParse(validKeyPoint).success).toBe(true);
  });

  it('status가 critical/warning/good 외의 값이면 실패', () => {
    const invalid = { ...validKeyPoint, status: 'unknown' };
    expect(guideKeyPointSchema.safeParse(invalid).success).toBe(false);
  });

  it('score_percent가 0~100 범위를 벗어나면 실패', () => {
    expect(guideKeyPointSchema.safeParse({ ...validKeyPoint, score_percent: -1 }).success).toBe(false);
    expect(guideKeyPointSchema.safeParse({ ...validKeyPoint, score_percent: 101 }).success).toBe(false);
  });

  it('score_percent가 소수이면 실패', () => {
    expect(guideKeyPointSchema.safeParse({ ...validKeyPoint, score_percent: 28.5 }).success).toBe(false);
  });

  it('빈 dimension이면 실패', () => {
    expect(guideKeyPointSchema.safeParse({ ...validKeyPoint, dimension: '' }).success).toBe(false);
  });
});

// ============================================================================
// guideQuestionSchema
// ============================================================================

describe('guideQuestionSchema', () => {
  it('유효한 question을 통과시킨다', () => {
    expect(guideQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it('빈 id이면 실패', () => {
    expect(guideQuestionSchema.safeParse({ ...validQuestion, id: '' }).success).toBe(false);
  });

  it('checked가 boolean이 아니면 실패', () => {
    expect(guideQuestionSchema.safeParse({ ...validQuestion, checked: 'yes' }).success).toBe(false);
  });
});

// ============================================================================
// guideDataSchema
// ============================================================================

describe('guideDataSchema', () => {
  it('유효한 guide data를 통과시킨다', () => {
    expect(guideDataSchema.safeParse(validGuideData).success).toBe(true);
  });

  it('company_summary가 빈 문자열이면 실패', () => {
    const invalid = { ...validGuideData, company_summary: '' };
    expect(guideDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('key_points가 빈 배열이면 실패', () => {
    const invalid = { ...validGuideData, key_points: [] };
    expect(guideDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('questions가 빈 배열이면 실패', () => {
    const invalid = { ...validGuideData, questions: [] };
    expect(guideDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('cautions가 빈 배열이면 실패', () => {
    const invalid = { ...validGuideData, cautions: [] };
    expect(guideDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('cautions에 빈 문자열이 있으면 실패', () => {
    const invalid = { ...validGuideData, cautions: [''] };
    expect(guideDataSchema.safeParse(invalid).success).toBe(false);
  });

  it('여러 key_points와 questions를 포함할 수 있다', () => {
    const data = {
      ...validGuideData,
      key_points: [
        validKeyPoint,
        { ...validKeyPoint, dimension: '인프라 준비도', score_percent: 45, status: 'warning' as const },
      ],
      questions: [
        validQuestion,
        { ...validQuestion, id: 'q2', question: '보안 정책은 어떤가요?' },
      ],
    };
    expect(guideDataSchema.safeParse(data).success).toBe(true);
  });
});

// ============================================================================
// updateGuideQuestionsSchema
// ============================================================================

describe('updateGuideQuestionsSchema', () => {
  it('유효한 questions 배열을 통과시킨다', () => {
    const input = { questions: [validQuestion] };
    expect(updateGuideQuestionsSchema.safeParse(input).success).toBe(true);
  });

  it('빈 배열이면 실패', () => {
    expect(updateGuideQuestionsSchema.safeParse({ questions: [] }).success).toBe(false);
  });
});
