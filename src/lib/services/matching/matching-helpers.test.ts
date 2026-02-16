/**
 * matching-helpers.ts 테스트
 * - filterValidRecommendations: LLM 응답에서 유효한 후보만 필터링
 */

import { describe, it, expect } from 'vitest';
import { filterValidRecommendations } from './matching-helpers';
import type { LLMMatchingResponse } from './matching-helpers';

describe('filterValidRecommendations', () => {
  const validCandidateIds = ['user-a', 'user-b', 'user-c'];

  it('유효한 userId만 포함된 추천은 그대로 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'user-a', score: 90, analysis: '분석A', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'user-b', score: 80, analysis: '분석B', strengths: ['강점'], considerations: ['고려'] },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-b']);
  });

  it('hallucinated userId는 필터링됨', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'user-a', score: 90, analysis: '분석A', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'hallucinated-id', score: 85, analysis: '분석X', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'user-c', score: 70, analysis: '분석C', strengths: ['강점'], considerations: ['고려'] },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-c']);
  });

  it('모든 userId가 hallucinated이면 빈 배열 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'fake-1', score: 90, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'fake-2', score: 80, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(0);
  });

  it('빈 추천 목록은 빈 배열 반환', () => {
    const result = filterValidRecommendations([], validCandidateIds);
    expect(result).toHaveLength(0);
  });
});
