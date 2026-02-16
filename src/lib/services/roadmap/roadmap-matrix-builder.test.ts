/**
 * roadmap-matrix-builder.ts 테스트
 * - buildRoadmapMatrixFromCourses: 레벨/업무별 과정 배치 로직
 */

import { describe, it, expect } from 'vitest';
import { buildRoadmapMatrixFromCourses } from './roadmap-matrix-builder';
import type { RoadmapCell } from './roadmap-types';

// ─── 헬퍼: 최소 RoadmapCell 생성 ─────────────────────────────────────────

function createCourse(
  overrides: Partial<RoadmapCell> & Pick<RoadmapCell, 'course_name' | 'level' | 'target_task'>
): RoadmapCell {
  return {
    target_audience: '전 직원',
    recommended_hours: 8,
    curriculum: [],
    tools: [],
    expected_outcome: '기대 효과',
    measurement_method: '측정 방법',
    prerequisites: [],
    ...overrides,
  };
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('buildRoadmapMatrixFromCourses', () => {
  it('빈 courses 배열은 빈 배열을 반환한다', () => {
    const result = buildRoadmapMatrixFromCourses([]);
    expect(result).toEqual([]);
  });

  it('단일 BEGINNER 과정을 beginner 셀에 배치한다', () => {
    const courses = [
      createCourse({ course_name: 'AI 기초', level: 'BEGINNER', target_task: '데이터 분석' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(1);
    expect(result[0].task_name).toBe('데이터 분석');
    expect(result[0].beginner).toEqual([{ course_name: 'AI 기초', recommended_hours: 8 }]);
    expect(result[0].intermediate).toEqual([]);
    expect(result[0].advanced).toEqual([]);
  });

  it('단일 INTERMEDIATE 과정을 intermediate 셀에 배치한다', () => {
    const courses = [
      createCourse({ course_name: '머신러닝 실무', level: 'INTERMEDIATE', target_task: '모델링' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result[0].intermediate).toEqual([{ course_name: '머신러닝 실무', recommended_hours: 8 }]);
    expect(result[0].beginner).toEqual([]);
    expect(result[0].advanced).toEqual([]);
  });

  it('단일 ADVANCED 과정을 advanced 셀에 배치한다', () => {
    const courses = [
      createCourse({ course_name: 'MLOps 심화', level: 'ADVANCED', target_task: '배포' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result[0].advanced).toEqual([{ course_name: 'MLOps 심화', recommended_hours: 8 }]);
    expect(result[0].beginner).toEqual([]);
    expect(result[0].intermediate).toEqual([]);
  });

  it('같은 업무의 다른 레벨 과정을 한 행에 모은다', () => {
    const courses = [
      createCourse({ course_name: '기초', level: 'BEGINNER', target_task: '데이터 분석' }),
      createCourse({ course_name: '실무', level: 'INTERMEDIATE', target_task: '데이터 분석' }),
      createCourse({ course_name: '심화', level: 'ADVANCED', target_task: '데이터 분석' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(1);
    expect(result[0].task_name).toBe('데이터 분석');
    expect(result[0].beginner).toHaveLength(1);
    expect(result[0].intermediate).toHaveLength(1);
    expect(result[0].advanced).toHaveLength(1);
  });

  it('다른 업무의 과정은 별도 행으로 분리한다', () => {
    const courses = [
      createCourse({ course_name: 'AI 기초', level: 'BEGINNER', target_task: '데이터 분석' }),
      createCourse({ course_name: '챗봇 기초', level: 'BEGINNER', target_task: '고객 응대' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(2);
    expect(result[0].task_name).toBe('데이터 분석');
    expect(result[1].task_name).toBe('고객 응대');
  });

  it('같은 업무·같은 레벨의 여러 과정을 한 셀에 모은다', () => {
    const courses = [
      createCourse({ course_name: 'Python 기초', level: 'BEGINNER', target_task: '데이터 분석', recommended_hours: 4 }),
      createCourse({ course_name: 'Excel 분석', level: 'BEGINNER', target_task: '데이터 분석', recommended_hours: 6 }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(1);
    expect(result[0].beginner).toEqual([
      { course_name: 'Python 기초', recommended_hours: 4 },
      { course_name: 'Excel 분석', recommended_hours: 6 },
    ]);
  });

  it('task_id를 순차적으로 생성한다 (task_1, task_2, ...)', () => {
    const courses = [
      createCourse({ course_name: '과정A', level: 'BEGINNER', target_task: '업무1' }),
      createCourse({ course_name: '과정B', level: 'BEGINNER', target_task: '업무2' }),
      createCourse({ course_name: '과정C', level: 'BEGINNER', target_task: '업무3' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result[0].task_id).toBe('task_1');
    expect(result[1].task_id).toBe('task_2');
    expect(result[2].task_id).toBe('task_3');
  });

  it('입력 순서대로 행이 생성된다', () => {
    const courses = [
      createCourse({ course_name: '과정C', level: 'ADVANCED', target_task: '세번째 업무' }),
      createCourse({ course_name: '과정A', level: 'BEGINNER', target_task: '첫번째 업무' }),
      createCourse({ course_name: '과정B', level: 'INTERMEDIATE', target_task: '두번째 업무' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result[0].task_name).toBe('세번째 업무');
    expect(result[1].task_name).toBe('첫번째 업무');
    expect(result[2].task_name).toBe('두번째 업무');
  });

  it('RoadmapMatrixCell에 course_name과 recommended_hours만 포함한다', () => {
    const courses = [
      createCourse({
        course_name: 'AI 기초',
        level: 'BEGINNER',
        target_task: '업무',
        recommended_hours: 16,
        target_audience: '개발팀',
        expected_outcome: '기대효과',
      }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    const cell = result[0].beginner[0];
    expect(Object.keys(cell)).toEqual(['course_name', 'recommended_hours']);
    expect(cell.course_name).toBe('AI 기초');
    expect(cell.recommended_hours).toBe(16);
  });
});
