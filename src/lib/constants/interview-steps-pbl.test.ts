import { describe, it, expect } from 'vitest';
import { PBL_INTERVIEW_STEPS, PBL_REQUIRED_STEP_IDS, PBL_TOTAL_STEPS } from './interview-steps-pbl';
import { getInterviewSteps } from './interview-steps';

describe('PBL_INTERVIEW_STEPS', () => {
  it('9개 스텝 정의 (개요·기업·환경·HRD·수행활동·문제·업무·AI수준·확인)', () => {
    expect(PBL_INTERVIEW_STEPS).toHaveLength(9);
    expect(PBL_INTERVIEW_STEPS.map((s) => s.shortName)).toEqual([
      '개요',
      '기업',
      '환경',
      '필요성',
      '수행활동',
      '문제',
      '업무',
      'AI수준',
      '확인',
    ]);
  });

  it('스텝 id는 1~9 순차', () => {
    expect(PBL_INTERVIEW_STEPS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('첫 스텝 이름은 "훈련과정 개요"', () => {
    expect(PBL_INTERVIEW_STEPS[0].name).toBe('훈련과정 개요');
  });

  it('다섯번째 스텝은 Ⅲ-1 수행활동', () => {
    expect(PBL_INTERVIEW_STEPS[4].name).toBe('훈련과제 도출 수행활동');
  });
});

describe('PBL_REQUIRED_STEP_IDS', () => {
  it('확인 단계를 제외한 8개 스텝이 필수', () => {
    expect(PBL_REQUIRED_STEP_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('PBL_TOTAL_STEPS', () => {
  it('전체 스텝 개수는 9', () => {
    expect(PBL_TOTAL_STEPS).toBe(9);
  });
});

describe('getInterviewSteps(PBL)', () => {
  it('PBL 트랙 → PBL_INTERVIEW_STEPS 반환', () => {
    const steps = getInterviewSteps('PBL');
    expect(steps).toEqual(PBL_INTERVIEW_STEPS);
  });
});
