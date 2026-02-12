import type { RoadmapCell, RoadmapMatrixCell, RoadmapRow } from '../roadmap';

// ============================================================================
// 로드맵 매트릭스 생성
// ============================================================================

/**
 * courses 배열에서 roadmap_matrix 자동 생성
 * 한 셀에 여러 과정이 있을 수 있음
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
