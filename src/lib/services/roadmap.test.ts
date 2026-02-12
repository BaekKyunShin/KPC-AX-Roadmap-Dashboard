import { describe, it, expect } from 'vitest';
import {
  sumModuleHours,
  normalizeCoursesHours,
  normalizePBLHours,
  normalizeRoadmapHours,
  buildRoadmapMatrixFromCourses,
} from './roadmap';
import type { RoadmapCell, PBLCourse } from './roadmap';

// ============================================================================
// 테스트 헬퍼: 최소한의 RoadmapCell / PBLCourse 팩토리
// ============================================================================

function makeCourse(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: '테스트 과정',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '전 직원',
    recommended_hours: 24,
    curriculum: [
      { module_name: '모듈1', hours: 8, details: ['상세1'], practice: '실습1' },
      { module_name: '모듈2', hours: 8, details: ['상세2'], practice: '실습2' },
      { module_name: '모듈3', hours: 8, details: ['상세3'], practice: '실습3' },
    ],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료: 일 제한 있음' }],
    expected_outcome: '업무 효율화',
    measurement_method: '처리 시간 비교',
    prerequisites: ['노트북'],
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
      pain_point_alignment: '관련',
      feasibility_assessment: '가능',
      summary: '요약',
    },
    course_name: 'PBL: 테스트 과정',
    total_hours: 24,
    target_tasks: ['데이터 분석'],
    target_audience: '전 직원',
    curriculum: [
      {
        module_name: '모듈1',
        hours: 8,
        details: ['상세1'],
        practice: '실습1',
        deliverables: ['결과물1'],
        tools: [{ name: 'ChatGPT', free_tier_info: '무료' }],
      },
      {
        module_name: '모듈2',
        hours: 8,
        details: ['상세2'],
        practice: '실습2',
        deliverables: ['결과물2'],
        tools: [{ name: 'Google Sheets', free_tier_info: '무료' }],
      },
      {
        module_name: '모듈3',
        hours: 8,
        details: ['상세3'],
        practice: '실습3',
        deliverables: ['결과물3'],
        tools: [{ name: 'Notion', free_tier_info: '무료' }],
      },
    ],
    final_deliverables: ['최종 결과물'],
    expected_outcomes: ['기대 효과'],
    business_impact: '비즈니스 임팩트',
    measurement_methods: ['측정 방법'],
    prerequisites: ['준비물'],
    ...overrides,
  };
}

// ============================================================================
// sumModuleHours
// ============================================================================

describe('sumModuleHours', () => {
  it('undefined 입력 시 0을 반환한다', () => {
    expect(sumModuleHours(undefined)).toBe(0);
  });

  it('빈 배열 입력 시 0을 반환한다', () => {
    expect(sumModuleHours([])).toBe(0);
  });

  it('단일 모듈의 시간을 반환한다', () => {
    expect(sumModuleHours([{ hours: 10 }])).toBe(10);
  });

  it('여러 모듈의 시간 합계를 반환한다', () => {
    const modules = [{ hours: 6 }, { hours: 10 }, { hours: 8 }];
    expect(sumModuleHours(modules)).toBe(24);
  });

  it('hours가 0인 모듈은 0으로 처리한다', () => {
    const modules = [{ hours: 10 }, { hours: 0 }, { hours: 5 }];
    expect(sumModuleHours(modules)).toBe(15);
  });

  it('hours가 falsy(undefined/NaN)인 모듈은 0으로 처리한다', () => {
    // hours || 0 로직 검증
    const modules = [{ hours: 10 }, { hours: undefined as unknown as number }];
    expect(sumModuleHours(modules)).toBe(10);
  });

  it('소수점 시간도 정확히 합산한다', () => {
    const modules = [{ hours: 1.5 }, { hours: 2.5 }, { hours: 4 }];
    expect(sumModuleHours(modules)).toBe(8);
  });
});

// ============================================================================
// normalizeCoursesHours
// ============================================================================

describe('normalizeCoursesHours', () => {
  it('recommended_hours가 모듈 합계와 일치하면 변경하지 않는다', () => {
    const course = makeCourse({ recommended_hours: 24 }); // 8+8+8=24
    const result = normalizeCoursesHours([course]);
    expect(result[0].recommended_hours).toBe(24);
  });

  it('recommended_hours가 모듈 합계와 다르면 보정한다', () => {
    const course = makeCourse({ recommended_hours: 30 }); // 8+8+8=24, 30≠24
    const result = normalizeCoursesHours([course]);
    expect(result[0].recommended_hours).toBe(24);
  });

  it('커리큘럼이 비어있으면 보정하지 않는다 (modulesTotal=0)', () => {
    const course = makeCourse({ recommended_hours: 30, curriculum: [] });
    const result = normalizeCoursesHours([course]);
    expect(result[0].recommended_hours).toBe(30);
  });

  it('여러 과정 중 불일치하는 것만 보정한다', () => {
    const courseA = makeCourse({
      course_name: '과정A',
      recommended_hours: 24, // 일치
    });
    const courseB = makeCourse({
      course_name: '과정B',
      recommended_hours: 40, // 불일치 → 24로 보정
    });
    const result = normalizeCoursesHours([courseA, courseB]);
    expect(result[0].recommended_hours).toBe(24);
    expect(result[1].recommended_hours).toBe(24);
  });

  it('원본 객체를 변경하지 않는다 (불변성)', () => {
    const original = makeCourse({ recommended_hours: 40 });
    normalizeCoursesHours([original]);
    expect(original.recommended_hours).toBe(40);
  });

  it('빈 배열 입력 시 빈 배열을 반환한다', () => {
    expect(normalizeCoursesHours([])).toEqual([]);
  });

  it('다양한 모듈 시간을 가진 과정을 올바르게 보정한다', () => {
    const course = makeCourse({
      recommended_hours: 10,
      curriculum: [
        { module_name: 'M1', hours: 6, details: [], practice: '' },
        { module_name: 'M2', hours: 10, details: [], practice: '' },
        { module_name: 'M3', hours: 8, details: [], practice: '' },
        { module_name: 'M4', hours: 12, details: [], practice: '' },
        { module_name: 'M5', hours: 4, details: [], practice: '' },
      ],
    });
    const result = normalizeCoursesHours([course]);
    expect(result[0].recommended_hours).toBe(40); // 6+10+8+12+4=40
  });
});

// ============================================================================
// normalizePBLHours
// ============================================================================

describe('normalizePBLHours', () => {
  it('total_hours가 모듈 합계와 일치하면 변경하지 않는다', () => {
    const pbl = makePBLCourse({ total_hours: 24 }); // 8+8+8=24
    const result = normalizePBLHours(pbl);
    expect(result.total_hours).toBe(24);
  });

  it('total_hours가 모듈 합계와 다르면 보정한다', () => {
    const pbl = makePBLCourse({ total_hours: 40 }); // 8+8+8=24, 40≠24
    const result = normalizePBLHours(pbl);
    expect(result.total_hours).toBe(24);
  });

  it('커리큘럼이 비어있으면 보정하지 않는다', () => {
    const pbl = makePBLCourse({ total_hours: 40, curriculum: [] });
    const result = normalizePBLHours(pbl);
    expect(result.total_hours).toBe(40);
  });

  it('원본 객체를 변경하지 않는다 (불변성)', () => {
    const original = makePBLCourse({ total_hours: 40 });
    normalizePBLHours(original);
    expect(original.total_hours).toBe(40);
  });

  it('보정 시 다른 필드는 유지된다', () => {
    const pbl = makePBLCourse({ total_hours: 40, course_name: 'PBL: 원본' });
    const result = normalizePBLHours(pbl);
    expect(result.course_name).toBe('PBL: 원본');
    expect(result.target_tasks).toEqual(['데이터 분석']);
    expect(result.selection_rationale.summary).toBe('요약');
  });
});

// ============================================================================
// normalizeRoadmapHours
// ============================================================================

describe('normalizeRoadmapHours', () => {
  it('courses와 pbl_course 모두 보정한다', () => {
    const input = {
      diagnosis_summary: '진단 요약',
      courses: [makeCourse({ recommended_hours: 40 })], // 24로 보정
      pbl_course: makePBLCourse({ total_hours: 40 }), // 24로 보정
    };
    const result = normalizeRoadmapHours(input);
    expect(result.courses[0].recommended_hours).toBe(24);
    expect(result.pbl_course.total_hours).toBe(24);
  });

  it('diagnosis_summary를 보존한다', () => {
    const input = {
      diagnosis_summary: '기업 현황 진단 요약입니다.',
      courses: [makeCourse()],
      pbl_course: makePBLCourse(),
    };
    const result = normalizeRoadmapHours(input);
    expect(result.diagnosis_summary).toBe('기업 현황 진단 요약입니다.');
  });

  it('이미 일치하는 경우 값을 변경하지 않는다', () => {
    const input = {
      diagnosis_summary: '진단',
      courses: [makeCourse({ recommended_hours: 24 })],
      pbl_course: makePBLCourse({ total_hours: 24 }),
    };
    const result = normalizeRoadmapHours(input);
    expect(result.courses[0].recommended_hours).toBe(24);
    expect(result.pbl_course.total_hours).toBe(24);
  });
});

// ============================================================================
// buildRoadmapMatrixFromCourses
// ============================================================================

describe('buildRoadmapMatrixFromCourses', () => {
  it('빈 배열 입력 시 빈 배열을 반환한다', () => {
    expect(buildRoadmapMatrixFromCourses([])).toEqual([]);
  });

  it('단일 과정을 올바른 레벨에 배치한다', () => {
    const course = makeCourse({
      course_name: 'AI 입문',
      level: 'BEGINNER',
      target_task: '데이터 분석',
      recommended_hours: 24,
    });

    const result = buildRoadmapMatrixFromCourses([course]);

    expect(result).toHaveLength(1);
    expect(result[0].task_name).toBe('데이터 분석');
    expect(result[0].beginner).toHaveLength(1);
    expect(result[0].beginner[0]).toEqual({
      course_name: 'AI 입문',
      recommended_hours: 24,
    });
    expect(result[0].intermediate).toHaveLength(0);
    expect(result[0].advanced).toHaveLength(0);
  });

  it('같은 업무의 서로 다른 레벨 과정을 하나의 행에 그룹화한다', () => {
    const courses = [
      makeCourse({ course_name: '초급', level: 'BEGINNER', target_task: '보고서 작성' }),
      makeCourse({ course_name: '중급', level: 'INTERMEDIATE', target_task: '보고서 작성' }),
      makeCourse({ course_name: '고급', level: 'ADVANCED', target_task: '보고서 작성' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(1);
    expect(result[0].task_name).toBe('보고서 작성');
    expect(result[0].beginner).toHaveLength(1);
    expect(result[0].beginner[0].course_name).toBe('초급');
    expect(result[0].intermediate).toHaveLength(1);
    expect(result[0].intermediate[0].course_name).toBe('중급');
    expect(result[0].advanced).toHaveLength(1);
    expect(result[0].advanced[0].course_name).toBe('고급');
  });

  it('서로 다른 업무는 별도 행으로 분리한다', () => {
    const courses = [
      makeCourse({ course_name: '과정A', target_task: '업무A' }),
      makeCourse({ course_name: '과정B', target_task: '업무B' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(2);
    expect(result[0].task_name).toBe('업무A');
    expect(result[1].task_name).toBe('업무B');
  });

  it('같은 업무×레벨에 여러 과정이 있으면 배열에 모두 추가한다', () => {
    const courses = [
      makeCourse({ course_name: '과정1', level: 'BEGINNER', target_task: '데이터 분석' }),
      makeCourse({ course_name: '과정2', level: 'BEGINNER', target_task: '데이터 분석' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(1);
    expect(result[0].beginner).toHaveLength(2);
    expect(result[0].beginner[0].course_name).toBe('과정1');
    expect(result[0].beginner[1].course_name).toBe('과정2');
  });

  it('task_id를 순서대로 생성한다', () => {
    const courses = [
      makeCourse({ target_task: '업무A' }),
      makeCourse({ target_task: '업무B' }),
      makeCourse({ target_task: '업무C' }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result[0].task_id).toBe('task_1');
    expect(result[1].task_id).toBe('task_2');
    expect(result[2].task_id).toBe('task_3');
  });

  it('INTERMEDIATE 레벨 과정을 올바르게 배치한다', () => {
    const course = makeCourse({ level: 'INTERMEDIATE', target_task: '고객 응대' });
    const result = buildRoadmapMatrixFromCourses([course]);

    expect(result[0].beginner).toHaveLength(0);
    expect(result[0].intermediate).toHaveLength(1);
    expect(result[0].advanced).toHaveLength(0);
  });

  it('ADVANCED 레벨 과정을 올바르게 배치한다', () => {
    const course = makeCourse({ level: 'ADVANCED', target_task: '자동화' });
    const result = buildRoadmapMatrixFromCourses([course]);

    expect(result[0].beginner).toHaveLength(0);
    expect(result[0].intermediate).toHaveLength(0);
    expect(result[0].advanced).toHaveLength(1);
  });

  it('매트릭스 셀에 course_name과 recommended_hours만 포함한다', () => {
    const course = makeCourse({
      course_name: 'AI 활용',
      recommended_hours: 16,
      target_task: '업무',
      level: 'BEGINNER',
    });

    const result = buildRoadmapMatrixFromCourses([course]);
    const cell = result[0].beginner[0];

    expect(Object.keys(cell)).toEqual(['course_name', 'recommended_hours']);
    expect(cell.course_name).toBe('AI 활용');
    expect(cell.recommended_hours).toBe(16);
  });

  it('복잡한 시나리오: 여러 업무 × 여러 레벨을 올바르게 구성한다', () => {
    const courses = [
      makeCourse({ course_name: 'A-초급', level: 'BEGINNER', target_task: '업무A', recommended_hours: 10 }),
      makeCourse({ course_name: 'A-중급', level: 'INTERMEDIATE', target_task: '업무A', recommended_hours: 20 }),
      makeCourse({ course_name: 'B-초급', level: 'BEGINNER', target_task: '업무B', recommended_hours: 15 }),
      makeCourse({ course_name: 'B-고급', level: 'ADVANCED', target_task: '업무B', recommended_hours: 30 }),
      makeCourse({ course_name: 'A-고급', level: 'ADVANCED', target_task: '업무A', recommended_hours: 35 }),
    ];

    const result = buildRoadmapMatrixFromCourses(courses);

    expect(result).toHaveLength(2);

    // 업무A: 초급1, 중급1, 고급1
    const rowA = result[0];
    expect(rowA.task_name).toBe('업무A');
    expect(rowA.beginner).toHaveLength(1);
    expect(rowA.intermediate).toHaveLength(1);
    expect(rowA.advanced).toHaveLength(1);
    expect(rowA.beginner[0].course_name).toBe('A-초급');
    expect(rowA.advanced[0].course_name).toBe('A-고급');

    // 업무B: 초급1, 중급0, 고급1
    const rowB = result[1];
    expect(rowB.task_name).toBe('업무B');
    expect(rowB.beginner).toHaveLength(1);
    expect(rowB.intermediate).toHaveLength(0);
    expect(rowB.advanced).toHaveLength(1);
  });
});
