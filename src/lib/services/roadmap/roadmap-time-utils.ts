import type { RoadmapCell, PBLCourse } from '../roadmap';

// ============================================================================
// 시간 계산 유틸리티
// ============================================================================

/** 커리큘럼 모듈 배열의 시간 합계 계산 */
export function sumModuleHours(curriculum: { hours: number }[] | undefined): number {
  if (!curriculum || curriculum.length === 0) return 0;
  return curriculum.reduce((sum, module) => sum + (module.hours || 0), 0);
}

// ============================================================================
// 시간 보정 함수
// ============================================================================

/**
 * courses의 recommended_hours를 커리큘럼 모듈 시간 합계로 보정
 */
export function normalizeCoursesHours(courses: RoadmapCell[]): RoadmapCell[] {
  return courses.map(course => {
    const modulesTotal = sumModuleHours(course.curriculum);
    if (modulesTotal === 0 || course.recommended_hours === modulesTotal) {
      return course;
    }
    return { ...course, recommended_hours: modulesTotal };
  });
}

/**
 * PBL 과정의 total_hours를 모듈 시간 합계로 보정
 */
export function normalizePBLHours(pblCourse: PBLCourse): PBLCourse {
  const modulesTotal = sumModuleHours(pblCourse.curriculum);
  if (modulesTotal === 0 || pblCourse.total_hours === modulesTotal) {
    return pblCourse;
  }
  return { ...pblCourse, total_hours: modulesTotal };
}

/**
 * LLM 출력 결과의 시간을 자동 보정
 */
export function normalizeRoadmapHours(llmResult: { diagnosis_summary: string; pbl_course: PBLCourse; courses: RoadmapCell[] }): { diagnosis_summary: string; pbl_course: PBLCourse; courses: RoadmapCell[] } {
  return {
    ...llmResult,
    courses: normalizeCoursesHours(llmResult.courses),
    pbl_course: normalizePBLHours(llmResult.pbl_course),
  };
}
