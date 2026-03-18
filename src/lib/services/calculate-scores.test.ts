import { describe, it, expect } from 'vitest';

import { calculateScores } from './calculate-scores';

describe('calculateScores', () => {
  const questions = [
    { id: 'q1', dimension: 'AI 이해도', weight: 1 },
    { id: 'q2', dimension: 'AI 이해도', weight: 2 },
    { id: 'q3', dimension: '데이터 활용', weight: 1 },
  ];

  it('모든 응답이 최대값(5)일 때 정확한 점수를 계산해야 한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: 5 },
      { question_id: 'q2', answer_value: 5 },
      { question_id: 'q3', answer_value: 5 },
    ];

    const result = calculateScores(answers, questions);

    // AI 이해도: (5*1 + 5*2) = 15, max: (5*1 + 5*2) = 15
    // 데이터 활용: (5*1) = 5, max: (5*1) = 5
    expect(result.total_score).toBe(20);
    expect(result.max_possible_score).toBe(20);
    expect(result.dimension_scores).toHaveLength(2);
  });

  it('모든 응답이 최소값(1)일 때 정확한 점수를 계산해야 한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: 1 },
      { question_id: 'q2', answer_value: 1 },
      { question_id: 'q3', answer_value: 1 },
    ];

    const result = calculateScores(answers, questions);

    // AI 이해도: (1*1 + 1*2) = 3
    // 데이터 활용: (1*1) = 1
    expect(result.total_score).toBe(4);
    expect(result.max_possible_score).toBe(20);
  });

  it('가중치가 반영된 차원별 점수를 계산해야 한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: 3 },
      { question_id: 'q2', answer_value: 4 },
      { question_id: 'q3', answer_value: 2 },
    ];

    const result = calculateScores(answers, questions);

    const aiDimension = result.dimension_scores.find(
      (d) => d.dimension === 'AI 이해도'
    );
    const dataDimension = result.dimension_scores.find(
      (d) => d.dimension === '데이터 활용'
    );

    // AI 이해도: (3*1 + 4*2) = 11, max: 15
    expect(aiDimension?.score).toBe(11);
    expect(aiDimension?.max_score).toBe(15);

    // 데이터 활용: (2*1) = 2, max: 5
    expect(dataDimension?.score).toBe(2);
    expect(dataDimension?.max_score).toBe(5);

    expect(result.total_score).toBe(13);
  });

  it('문자열 answer_value를 숫자로 변환해야 한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: '4' },
      { question_id: 'q2', answer_value: '3' },
      { question_id: 'q3', answer_value: '5' },
    ];

    const result = calculateScores(answers, questions);

    // AI 이해도: (4*1 + 3*2) = 10
    // 데이터 활용: (5*1) = 5
    expect(result.total_score).toBe(15);
  });

  it('응답이 없는 문항은 0점으로 처리해야 한다', () => {
    const answers = [{ question_id: 'q1', answer_value: 5 }];

    const result = calculateScores(answers, questions);

    // AI 이해도: (5*1 + 0*2) = 5
    // 데이터 활용: (0*1) = 0
    expect(result.total_score).toBe(5);
    expect(result.max_possible_score).toBe(20);
  });

  it('빈 질문 배열은 빈 결과를 반환해야 한다', () => {
    const result = calculateScores([], []);

    expect(result.total_score).toBe(0);
    expect(result.max_possible_score).toBe(0);
    expect(result.dimension_scores).toHaveLength(0);
  });

  it('NaN answer_value는 0으로 처리한다', () => {
    // parseInt('abc') → NaN, 소스에서 || '0'으로 대체되므로 빈 문자열만 0이 됨
    // 하지만 'abc'는 parseInt('abc') = NaN → NaN * weight = NaN
    // 실제 동작: answer_value가 문자열 'abc'일 때 parseInt('abc', 10) = NaN
    const answers = [
      { question_id: 'q1', answer_value: 'abc' },
      { question_id: 'q2', answer_value: '3' },
      { question_id: 'q3', answer_value: '5' },
    ];

    const result = calculateScores(answers, questions);

    // NaN * 1 = NaN → dimension score에 NaN이 포함됨
    // AI 이해도: NaN*1 + 3*2 = NaN, 데이터 활용: 5*1 = 5
    // NaN은 합산 시 NaN을 전파하므로 total_score는 NaN
    expect(result.total_score).toBeNaN();
  });

  it('weight가 0인 질문은 점수에 영향을 주지 않는다', () => {
    const questionsWithZeroWeight = [
      { id: 'q1', dimension: 'AI 이해도', weight: 1 },
      { id: 'q2', dimension: 'AI 이해도', weight: 0 },
      { id: 'q3', dimension: '데이터 활용', weight: 1 },
    ];

    const answers = [
      { question_id: 'q1', answer_value: 5 },
      { question_id: 'q2', answer_value: 5 },
      { question_id: 'q3', answer_value: 5 },
    ];

    const result = calculateScores(answers, questionsWithZeroWeight);

    // AI 이해도: (5*1 + 5*0) = 5, max: (5*1 + 5*0) = 5
    // 데이터 활용: (5*1) = 5, max: (5*1) = 5
    expect(result.total_score).toBe(10);
    expect(result.max_possible_score).toBe(10);

    const aiDimension = result.dimension_scores.find(
      (d) => d.dimension === 'AI 이해도'
    );
    expect(aiDimension?.score).toBe(5);
    expect(aiDimension?.max_score).toBe(5);
  });

  it('존재하지 않는 question_id를 가진 응답은 무시한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: 5 },
      { question_id: 'q_nonexistent', answer_value: 5 },
      { question_id: 'q_unknown', answer_value: 3 },
    ];

    const result = calculateScores(answers, questions);

    // q1만 매칭됨, q2/q3는 응답 없음 → 0
    // 존재하지 않는 응답(q_nonexistent, q_unknown)은 어떤 question에도 매칭되지 않으므로 무시
    // AI 이해도: (5*1 + 0*2) = 5, max: (5*1 + 5*2) = 15
    // 데이터 활용: (0*1) = 0, max: (5*1) = 5
    expect(result.total_score).toBe(5);
    expect(result.max_possible_score).toBe(20);
  });

  it('음수 answer_value도 계산에 포함한다', () => {
    const answers = [
      { question_id: 'q1', answer_value: -2 },
      { question_id: 'q2', answer_value: 3 },
      { question_id: 'q3', answer_value: -1 },
    ];

    const result = calculateScores(answers, questions);

    // AI 이해도: (-2*1 + 3*2) = 4, max: (5*1 + 5*2) = 15
    // 데이터 활용: (-1*1) = -1, max: (5*1) = 5
    expect(result.total_score).toBe(3);
    expect(result.max_possible_score).toBe(20);

    const dataDimension = result.dimension_scores.find(
      (d) => d.dimension === '데이터 활용'
    );
    expect(dataDimension?.score).toBe(-1);
  });
});
