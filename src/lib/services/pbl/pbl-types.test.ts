import { describe, expect, it } from 'vitest';
import {
  PBL_ACHIEVEMENT_SURVEY_LENGTH,
  PBL_ACHIEVEMENT_SURVEY_QUESTIONS,
  PBL_COURSE_EVALUATION_METHODS,
  PBL_EVALUATION_SCALE_DESCRIPTION,
  PBL_EXTERNAL_EXPERT_SURVEY_LENGTH,
  PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS,
  PBL_MIN_AI_TOOL_USAGE_STAGES,
  PBL_PERFORMANCE_LEVELS,
  PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH,
  PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS,
  PBL_SATISFACTION_SURVEY_LENGTH,
  PBL_SATISFACTION_SURVEY_QUESTIONS,
  PBL_TRAINING_GOAL_CATEGORIES,
} from './pbl-types';

describe('pbl-types constants', () => {
  it('고정 설문 문항 수가 양식과 일치한다 (5/3/5/4)', () => {
    expect(PBL_SATISFACTION_SURVEY_LENGTH).toBe(5);
    expect(PBL_ACHIEVEMENT_SURVEY_LENGTH).toBe(3);
    expect(PBL_EXTERNAL_EXPERT_SURVEY_LENGTH).toBe(5);
    expect(PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH).toBe(4);
    expect(PBL_SATISFACTION_SURVEY_QUESTIONS.length).toBe(5);
    expect(PBL_ACHIEVEMENT_SURVEY_QUESTIONS.length).toBe(3);
    expect(PBL_EXTERNAL_EXPERT_SURVEY_QUESTIONS.length).toBe(5);
    expect(PBL_PRACTICAL_APPLICATION_SURVEY_QUESTIONS.length).toBe(4);
  });

  it('과정평가 method는 3종', () => {
    expect(PBL_COURSE_EVALUATION_METHODS).toEqual([
      '포트폴리오',
      '문제해결시나리오',
      '작업장 평가',
    ]);
  });

  it('수행수준은 1~5', () => {
    expect(PBL_PERFORMANCE_LEVELS).toEqual([1, 2, 3, 4, 5]);
  });

  it('훈련목표 분류 5종 (기타 포함)', () => {
    expect(PBL_TRAINING_GOAL_CATEGORIES).toEqual([
      '기술문제 해결',
      '공정 최적화',
      '불량률 감소',
      '기술 매뉴얼 개발',
      '기타',
    ]);
  });

  it('AI 도구 활용 계획 최소 단계는 3', () => {
    expect(PBL_MIN_AI_TOOL_USAGE_STAGES).toBe(3);
  });

  it('평가척도 설명은 1~5 수준 모두 포함한다', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(PBL_EVALUATION_SCALE_DESCRIPTION).toContain(String(level));
    }
  });
});
