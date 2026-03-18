/**
 * roadmap-time-utils.ts 테스트
 * - sumModuleHours: 커리큘럼 모듈 시간 합산
 * - normalizeCoursesHours: courses의 recommended_hours 보정
 * - normalizePBLHours: PBL 과정의 total_hours 보정
 * - normalizeRoadmapHours: 전체 로드맵 시간 보정
 */

import { describe, it, expect } from 'vitest';
import {
  sumModuleHours,
  normalizeCoursesHours,
  normalizePBLHours,
  normalizeRoadmapHours,
} from './roadmap-time-utils';
import type { RoadmapCell, PBLCourse } from './roadmap-types';

// ─── 팩토리 함수 ──────────────────────────────────────────────────────────

function makeModule(hours: number) {
  return { module_name: '모듈', hours, details: ['상세'], practice: '실습' };
}

function makePBLModule(hours: number) {
  return {
    module_name: '모듈',
    hours,
    details: ['상세'],
    practice: '실습',
    deliverables: ['산출물'],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료' }],
    topics: ['주제'],
    practice_project: '프로젝트',
  };
}

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: '테스트 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '전 직원',
    recommended_hours: 24,
    curriculum: [makeModule(8), makeModule(8), makeModule(8)],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료' }],
    expected_outcome: '효과',
    measurement_method: '측정',
    prerequisites: ['준비물'],
    ...overrides,
  };
}

function makePBLCourse(overrides: Partial<PBLCourse> = {}): PBLCourse {
  return {
    selected_course_name: '테스트 과정',
    selected_course_level: 'BEGINNER',
    selected_course_task: '데이터 분석',
    selection_rationale: {
      consultant_expertise_fit: '적합',
      pain_point_alignment: '연관',
      feasibility_assessment: '가능',
      summary: '요약',
    },
    course_name: 'PBL 테스트 과정',
    total_hours: 16,
    target_tasks: ['데이터 분석'],
    target_audience: '전 직원',
    curriculum: [makePBLModule(8), makePBLModule(8)],
    final_deliverables: ['최종 산출물'],
    expected_outcomes: ['기대 효과'],
    business_impact: '비즈니스 임팩트',
    measurement_methods: ['측정 방법'],
    prerequisites: ['준비물'],
    ...overrides,
  };
}

// ─── sumModuleHours ───────────────────────────────────────────────────────

describe('sumModuleHours', () => {
  it('undefined 입력 시 0을 반환한다', () => {
    expect(sumModuleHours(undefined)).toBe(0);
  });

  it('빈 배열 입력 시 0을 반환한다', () => {
    expect(sumModuleHours([])).toBe(0);
  });

  it('정상 배열의 시간을 합산한다', () => {
    expect(sumModuleHours([{ hours: 4 }, { hours: 8 }])).toBe(12);
  });

  it('hours가 0인 모듈을 포함해도 올바르게 합산한다', () => {
    expect(sumModuleHours([{ hours: 0 }, { hours: 6 }, { hours: 4 }])).toBe(10);
  });
});

// ─── normalizeCoursesHours ────────────────────────────────────────────────

describe('normalizeCoursesHours', () => {
  it('빈 배열을 전달하면 빈 배열을 반환한다', () => {
    expect(normalizeCoursesHours([])).toEqual([]);
  });

  it('curriculum 시간합이 recommended_hours와 같으면 원본 참조를 그대로 반환한다', () => {
    const course = makeCourse({ recommended_hours: 24 }); // 8+8+8 = 24
    const result = normalizeCoursesHours([course]);
    expect(result[0]).toBe(course);
  });

  it('curriculum 시간합이 recommended_hours와 다르면 recommended_hours를 보정한다', () => {
    const course = makeCourse({ recommended_hours: 30 }); // 8+8+8 = 24 != 30
    const result = normalizeCoursesHours([course]);
    expect(result[0].recommended_hours).toBe(24);
  });

  it('curriculum이 undefined이거나 빈 배열이면 보정하지 않는다', () => {
    const courseUndefined = makeCourse({
      recommended_hours: 30,
      curriculum: undefined as unknown as RoadmapCell['curriculum'],
    });
    const courseEmpty = makeCourse({ recommended_hours: 30, curriculum: [] });

    const result = normalizeCoursesHours([courseUndefined, courseEmpty]);
    expect(result[0]).toBe(courseUndefined);
    expect(result[1]).toBe(courseEmpty);
  });
});

// ─── normalizePBLHours ────────────────────────────────────────────────────

describe('normalizePBLHours', () => {
  it('curriculum 시간합이 total_hours와 같으면 원본을 반환한다', () => {
    const pbl = makePBLCourse({ total_hours: 16 }); // 8+8 = 16
    expect(normalizePBLHours(pbl)).toBe(pbl);
  });

  it('curriculum 시간합이 total_hours와 다르면 total_hours를 보정한다', () => {
    const pbl = makePBLCourse({ total_hours: 20 }); // 8+8 = 16 != 20
    const result = normalizePBLHours(pbl);
    expect(result.total_hours).toBe(16);
  });

  it('modulesTotal이 0이면 보정하지 않는다', () => {
    const pbl = makePBLCourse({ total_hours: 20, curriculum: [] });
    expect(normalizePBLHours(pbl)).toBe(pbl);
  });
});

// ─── normalizeRoadmapHours ────────────────────────────────────────────────

describe('normalizeRoadmapHours', () => {
  it('courses와 pbl_course를 동시에 보정한다', () => {
    const input = {
      diagnosis_summary: '진단 요약',
      courses: [makeCourse({ recommended_hours: 30 })], // 24 != 30
      pbl_course: makePBLCourse({ total_hours: 20 }), // 16 != 20
    };

    const result = normalizeRoadmapHours(input);
    expect(result.courses[0].recommended_hours).toBe(24);
    expect(result.pbl_course.total_hours).toBe(16);
  });

  it('diagnosis_summary가 유지된다', () => {
    const input = {
      diagnosis_summary: '중요한 진단 내용',
      courses: [makeCourse()],
      pbl_course: makePBLCourse(),
    };

    const result = normalizeRoadmapHours(input);
    expect(result.diagnosis_summary).toBe('중요한 진단 내용');
  });

  it('보정이 불필요한 경우 원본 구조를 유지한다', () => {
    const course = makeCourse({ recommended_hours: 24 }); // 8+8+8 = 24
    const pbl = makePBLCourse({ total_hours: 16 }); // 8+8 = 16
    const input = {
      diagnosis_summary: '진단 요약',
      courses: [course],
      pbl_course: pbl,
    };

    const result = normalizeRoadmapHours(input);
    expect(result.courses[0]).toBe(course);
    expect(result.pbl_course).toBe(pbl);
  });
});
