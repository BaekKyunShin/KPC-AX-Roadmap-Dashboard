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
});
