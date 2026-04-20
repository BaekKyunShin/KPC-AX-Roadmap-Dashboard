import { describe, it, expect } from 'vitest';
import { ROADMAP_INTERVIEW_STEPS, ROADMAP_REQUIRED_STEP_IDS } from './interview-steps-roadmap';
import { getInterviewSteps } from './interview-steps';

describe('ROADMAP_INTERVIEW_STEPS', () => {
  it('6개 스텝 정의 (개요 · 기본 · 요구 · 과업 · 대상 · 확인)', () => {
    expect(ROADMAP_INTERVIEW_STEPS).toHaveLength(6);
    expect(ROADMAP_INTERVIEW_STEPS.map((s) => s.shortName)).toEqual([
      '개요',
      '기본',
      '요구',
      '과업',
      '대상',
      '확인',
    ]);
  });

  it('스텝 id는 1~6 순차 (첫 스텝은 개요)', () => {
    expect(ROADMAP_INTERVIEW_STEPS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ROADMAP_INTERVIEW_STEPS[0].shortName).toBe('개요');
  });
});

describe('ROADMAP_REQUIRED_STEP_IDS', () => {
  it('확인 단계를 제외한 5개 스텝이 필수', () => {
    expect(ROADMAP_REQUIRED_STEP_IDS).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('getInterviewSteps', () => {
  it("ROADMAP 트랙 → ROADMAP_INTERVIEW_STEPS 반환", () => {
    const steps = getInterviewSteps('ROADMAP');
    expect(steps).toEqual(ROADMAP_INTERVIEW_STEPS);
  });

  it("PBL 트랙 → PBL_INTERVIEW_STEPS 반환", () => {
    // interview-steps.ts Line 23: track === 'PBL' 분기 커버
    const steps = getInterviewSteps('PBL');
    expect(steps).toBeDefined();
    expect(steps.length).toBeGreaterThan(0);
  });
});
