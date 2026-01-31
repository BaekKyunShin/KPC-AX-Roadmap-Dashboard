/**
 * 클라이언트용 로드맵 유틸리티 함수
 * 테스트 로드맵에서 수동 편집 시 사용
 */

import type { RoadmapCell, RoadmapRow, RoadmapMatrixCell } from '@/lib/services/roadmap';

/**
 * courses 배열에서 roadmap_matrix를 재생성
 * 서버 측 buildRoadmapMatrixFromCourses와 동일한 로직
 */
export function buildRoadmapMatrixFromCourses(courses: RoadmapCell[]): RoadmapRow[] {
  // 업무별로 그룹화
  const taskMap = new Map<string, RoadmapRow>();

  courses.forEach((course, index) => {
    const taskKey = course.target_task;

    if (!taskMap.has(taskKey)) {
      taskMap.set(taskKey, {
        task_id: `task_${index + 1}`,
        task_name: taskKey,
        beginner: [],
        intermediate: [],
        advanced: [],
      });
    }

    const row = taskMap.get(taskKey)!;
    const matrixCell: RoadmapMatrixCell = {
      course_name: course.course_name,
      recommended_hours: course.recommended_hours,
    };

    // 레벨에 따라 배열에 추가
    switch (course.level) {
      case 'BEGINNER':
        row.beginner.push(matrixCell);
        break;
      case 'INTERMEDIATE':
        row.intermediate.push(matrixCell);
        break;
      case 'ADVANCED':
        row.advanced.push(matrixCell);
        break;
    }
  });

  return Array.from(taskMap.values());
}

/**
 * 간단한 클라이언트 측 검증
 * 테스트 모드에서 수동 편집 시 사용
 */
export interface ClientValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCourseClient(course: RoadmapCell): ClientValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 40시간 제한 검증
  if (course.recommended_hours > 40) {
    errors.push(`"${course.course_name}" 과정의 권장 시간이 40시간을 초과합니다. (${course.recommended_hours}시간)`);
  }

  // 필수 필드 검증
  if (!course.course_name || course.course_name.trim() === '') {
    errors.push('과정명은 필수입니다.');
  }

  if (!course.recommended_hours || course.recommended_hours <= 0) {
    errors.push('권장 시간은 1시간 이상이어야 합니다.');
  }

  // 무료 도구 검증 (경고만)
  if (course.tools && course.tools.length > 0) {
    course.tools.forEach((tool) => {
      if (!tool.free_tier_info || tool.free_tier_info.trim() === '') {
        warnings.push(`"${tool.name}" 도구의 무료 범위 정보가 누락되었습니다.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 전체 로드맵 검증 (클라이언트)
 */
export function validateRoadmapClient(courses: RoadmapCell[]): ClientValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  courses.forEach((course) => {
    const result = validateCourseClient(course);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
