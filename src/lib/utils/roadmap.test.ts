import { describe, it, expect } from 'vitest';
import {
  getLevelLabel,
  getLevelLabelEn,
  getLevelColorClass,
  formatMatrixCourseNames,
  formatMatrixCourseHoursWithUnit,
  formatMatrixCourseHours,
  PAID_TOOL_KEYWORDS,
  MAX_COURSE_HOURS,
} from './roadmap';

// ─── getLevelLabel ───

describe('getLevelLabel', () => {
  it('BEGINNER→초급, INTERMEDIATE→중급, ADVANCED→고급', () => {
    expect(getLevelLabel('BEGINNER')).toBe('초급');
    expect(getLevelLabel('INTERMEDIATE')).toBe('중급');
    expect(getLevelLabel('ADVANCED')).toBe('고급');
  });

  it('알 수 없는 레벨이면 원본 문자열 반환', () => {
    expect(getLevelLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(getLevelLabel('EXPERT')).toBe('EXPERT');
  });
});

// ─── getLevelLabelEn ───

describe('getLevelLabelEn', () => {
  it('BEGINNER→Beginner, INTERMEDIATE→Intermediate, ADVANCED→Advanced', () => {
    expect(getLevelLabelEn('BEGINNER')).toBe('Beginner');
    expect(getLevelLabelEn('INTERMEDIATE')).toBe('Intermediate');
    expect(getLevelLabelEn('ADVANCED')).toBe('Advanced');
  });

  it('알 수 없는 레벨이면 원본 문자열 반환', () => {
    expect(getLevelLabelEn('UNKNOWN')).toBe('UNKNOWN');
    expect(getLevelLabelEn('EXPERT')).toBe('EXPERT');
  });
});

// ─── getLevelColorClass ───

describe('getLevelColorClass', () => {
  it('각 레벨별 올바른 CSS 클래스 반환', () => {
    expect(getLevelColorClass('BEGINNER')).toBe('text-green-600 border-green-200');
    expect(getLevelColorClass('INTERMEDIATE')).toBe('text-blue-600 border-blue-200');
    expect(getLevelColorClass('ADVANCED')).toBe('text-purple-600 border-purple-200');
  });

  it('알 수 없는 레벨이면 gray 기본 클래스 반환', () => {
    expect(getLevelColorClass('UNKNOWN')).toBe('text-gray-600 border-gray-200');
  });
});

// ─── formatMatrixCourseNames ───

describe('formatMatrixCourseNames', () => {
  it('과정명들을 줄바꿈으로 합침', () => {
    const courses = [
      { course_name: 'AI 기초' },
      { course_name: '데이터 분석' },
      { course_name: '머신러닝 입문' },
    ];
    expect(formatMatrixCourseNames(courses)).toBe('AI 기초\n데이터 분석\n머신러닝 입문');
  });

  it('빈 배열이면 "-" 반환', () => {
    expect(formatMatrixCourseNames([])).toBe('-');
  });

  it('undefined이면 "-" 반환', () => {
    expect(formatMatrixCourseNames(undefined)).toBe('-');
  });
});

// ─── formatMatrixCourseHoursWithUnit ───

describe('formatMatrixCourseHoursWithUnit', () => {
  it('시간에 "h" 단위를 붙여 줄바꿈으로 합침', () => {
    const courses = [
      { recommended_hours: 8 },
      { recommended_hours: 16 },
      { recommended_hours: 24 },
    ];
    expect(formatMatrixCourseHoursWithUnit(courses)).toBe('8h\n16h\n24h');
  });

  it('빈 배열이면 "-" 반환', () => {
    expect(formatMatrixCourseHoursWithUnit([])).toBe('-');
  });

  it('undefined이면 "-" 반환', () => {
    expect(formatMatrixCourseHoursWithUnit(undefined)).toBe('-');
  });
});

// ─── formatMatrixCourseHours ───

describe('formatMatrixCourseHours', () => {
  it('숫자만 줄바꿈으로 합침', () => {
    const courses = [
      { recommended_hours: 8 },
      { recommended_hours: 16 },
    ];
    expect(formatMatrixCourseHours(courses)).toBe('8\n16');
  });

  it('빈 배열이면 "-" 반환', () => {
    expect(formatMatrixCourseHours([])).toBe('-');
  });

  it('undefined이면 "-" 반환', () => {
    expect(formatMatrixCourseHours(undefined)).toBe('-');
  });
});

// ─── 상수 ───

describe('상수', () => {
  it('PAID_TOOL_KEYWORDS 길이가 6이고 MAX_COURSE_HOURS가 40', () => {
    expect(PAID_TOOL_KEYWORDS).toHaveLength(6);
    expect(MAX_COURSE_HOURS).toBe(40);
  });
});
