import { describe, it, expect } from 'vitest';
import { getConsultantProfile, parseRationale } from './utils';
import type { ValidRecommendation } from './utils';

describe('getConsultantProfile', () => {
  function makeCandidate(consultant_profile: unknown): ValidRecommendation['candidate'] {
    return {
      id: 'consultant-1',
      name: '김컨설턴트',
      email: 'kim@test.com',
      consultant_profile:
        consultant_profile as ValidRecommendation['candidate']['consultant_profile'],
    };
  }

  it('consultant_profile 가 undefined 면 null 반환', () => {
    expect(getConsultantProfile(makeCandidate(undefined))).toBeNull();
  });

  it('consultant_profile 가 빈 배열 [] 이면 null 반환', () => {
    expect(getConsultantProfile(makeCandidate([]))).toBeNull();
  });

  it('consultant_profile 가 배열이면 첫 요소 반환', () => {
    const profile = { years_of_experience: 20, available_industries: ['제조', 'IT'] };
    const result = getConsultantProfile(makeCandidate([profile]));
    expect(result).toEqual(profile);
  });

  it('consultant_profile 가 객체면 그대로 반환', () => {
    const profile = { years_of_experience: 15, expertise_domains: ['AI'] };
    const result = getConsultantProfile(makeCandidate(profile));
    expect(result).toEqual(profile);
  });

  it('consultant_profile 가 빈 객체 {} 이면 빈 객체 반환 (null 아님)', () => {
    const result = getConsultantProfile(makeCandidate({}));
    expect(result).toEqual({});
  });
});

describe('parseRationale (회귀 확인)', () => {
  it('null 입력 시 빈 strengths/notes 반환', () => {
    const result = parseRationale(null);
    expect(result.strengths).toEqual([]);
    expect(result.notes).toEqual([]);
  });
});
