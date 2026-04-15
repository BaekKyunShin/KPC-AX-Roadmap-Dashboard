import { describe, it, expect } from 'vitest';
import { ROADMAP_INTERVIEW_STEPS, ROADMAP_REQUIRED_STEP_IDS } from './interview-steps-roadmap';
import { getInterviewSteps } from './interview-steps';

describe('ROADMAP_INTERVIEW_STEPS', () => {
  it('5개 스텝 정의 (기본 · 요구 · 과업 · 대상 · 확인)', () => {
    expect(ROADMAP_INTERVIEW_STEPS).toHaveLength(5);
    expect(ROADMAP_INTERVIEW_STEPS.map((s) => s.shortName)).toEqual([
      '기본',
      '요구',
      '과업',
      '대상',
      '확인',
    ]);
  });

  it('스텝 id는 1~5 순차', () => {
    expect(ROADMAP_INTERVIEW_STEPS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('ROADMAP_REQUIRED_STEP_IDS', () => {
  it('확인 단계를 제외한 4개 스텝이 필수', () => {
    expect(ROADMAP_REQUIRED_STEP_IDS).toEqual([1, 2, 3, 4]);
  });
});

describe('getInterviewSteps', () => {
  it("ROADMAP 트랙 → ROADMAP_INTERVIEW_STEPS 반환", () => {
    const steps = getInterviewSteps('ROADMAP');
    expect(steps).toEqual(ROADMAP_INTERVIEW_STEPS);
  });

  it('PBL 트랙은 미구현 에러 (Step 8 예정)', () => {
    expect(() => getInterviewSteps('PBL')).toThrow(/PBL/);
  });
});
