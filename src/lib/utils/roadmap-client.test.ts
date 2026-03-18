import { describe, test, expect } from 'vitest';
import {
  buildRoadmapMatrixFromCourses,
  validateCourseClient,
  validateRoadmapClient,
} from './roadmap-client';
import type { RoadmapCell } from '@/lib/services/roadmap';

// ─── 팩토리 함수 ───

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: '테스트 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '전 직원',
    recommended_hours: 24,
    curriculum: [{ module_name: '모듈1', hours: 8, details: ['상세'], practice: '실습' }],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료: 일 제한 있음' }],
    expected_outcome: '업무 효율화',
    measurement_method: '처리 시간 비교',
    prerequisites: ['노트북'],
    ...overrides,
  };
}

// ─── buildRoadmapMatrixFromCourses ───

describe('buildRoadmapMatrixFromCourses', () => {
  test('같은 target_task 과정들이 하나의 row로 그룹화', () => {
    const courses = [
      makeCourse({ course_name: 'AI 기초', level: 'BEGINNER', target_task: '데이터 분석' }),
      makeCourse({ course_name: 'AI 심화', level: 'ADVANCED', target_task: '데이터 분석' }),
    ];

    const rows = buildRoadmapMatrixFromCourses(courses);

    expect(rows).toHaveLength(1);
    expect(rows[0].task_name).toBe('데이터 분석');
  });

  test('레벨별 올바른 배열에 추가', () => {
    const courses = [
      makeCourse({ course_name: '초급 과정', level: 'BEGINNER', target_task: '업무A' }),
      makeCourse({ course_name: '중급 과정', level: 'INTERMEDIATE', target_task: '업무A' }),
      makeCourse({ course_name: '고급 과정', level: 'ADVANCED', target_task: '업무A' }),
    ];

    const rows = buildRoadmapMatrixFromCourses(courses);

    expect(rows[0].beginner).toEqual([{ course_name: '초급 과정', recommended_hours: 24 }]);
    expect(rows[0].intermediate).toEqual([{ course_name: '중급 과정', recommended_hours: 24 }]);
    expect(rows[0].advanced).toEqual([{ course_name: '고급 과정', recommended_hours: 24 }]);
  });

  test('task_id가 task_1, task_2 순차 증가', () => {
    const courses = [
      makeCourse({ target_task: '업무A' }),
      makeCourse({ target_task: '업무B' }),
      makeCourse({ target_task: '업무C' }),
    ];

    const rows = buildRoadmapMatrixFromCourses(courses);

    expect(rows[0].task_id).toBe('task_1');
    expect(rows[1].task_id).toBe('task_2');
    expect(rows[2].task_id).toBe('task_3');
  });

  test('빈 courses 배열이면 빈 rows 배열 반환', () => {
    const rows = buildRoadmapMatrixFromCourses([]);
    expect(rows).toEqual([]);
  });

  test('한 task에 같은 레벨 과정 여러 개', () => {
    const courses = [
      makeCourse({ course_name: '과정A', level: 'BEGINNER', target_task: '업무X' }),
      makeCourse({ course_name: '과정B', level: 'BEGINNER', target_task: '업무X' }),
    ];

    const rows = buildRoadmapMatrixFromCourses(courses);

    expect(rows).toHaveLength(1);
    expect(rows[0].beginner).toHaveLength(2);
    expect(rows[0].beginner[0].course_name).toBe('과정A');
    expect(rows[0].beginner[1].course_name).toBe('과정B');
  });
});

// ─── validateCourseClient ───

describe('validateCourseClient', () => {
  test('정상 과정은 isValid: true, errors: []', () => {
    const result = validateCourseClient(makeCourse());

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('40시간 초과 시 에러', () => {
    const result = validateCourseClient(makeCourse({ recommended_hours: 50 }));

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some(e => e.includes('40시간'))).toBe(true);
  });

  test('과정명 빈 문자열 시 에러', () => {
    const result = validateCourseClient(makeCourse({ course_name: '' }));

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('과정명'))).toBe(true);
  });

  test('recommended_hours가 0 이하이면 에러', () => {
    const result = validateCourseClient(makeCourse({ recommended_hours: 0 }));

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('1시간 이상'))).toBe(true);
  });

  test('도구의 free_tier_info 누락 시 경고 (isValid는 true)', () => {
    const result = validateCourseClient(
      makeCourse({ tools: [{ name: 'Copilot', free_tier_info: '' }] })
    );

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.some(w => w.includes('Copilot'))).toBe(true);
  });
});

// ─── validateRoadmapClient ───

describe('validateRoadmapClient', () => {
  test('모든 과정 유효하면 isValid: true', () => {
    const courses = [makeCourse(), makeCourse({ course_name: '다른 과정' })];
    const result = validateRoadmapClient(courses);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('하나라도 에러 있으면 isValid: false, 모든 에러/경고 수집', () => {
    const courses = [
      makeCourse({ recommended_hours: 50 }), // 에러: 40시간 초과
      makeCourse({ tools: [{ name: 'Notion', free_tier_info: '' }] }), // 경고: free_tier_info 누락
    ];
    const result = validateRoadmapClient(courses);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });
});
