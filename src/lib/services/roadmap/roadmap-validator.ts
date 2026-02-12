import type { RoadmapCell, PBLCourse, RoadmapResult, ValidationResult } from './roadmap-types';
import { PAID_TOOL_KEYWORDS, MAX_COURSE_HOURS } from '@/lib/utils/roadmap';
import { sumModuleHours } from './roadmap-time-utils';

// ============================================================================
// 검증 헬퍼 함수들
// ============================================================================

interface ToolInfo {
  name: string;
  free_tier_info: string;
}

/**
 * 도구의 무료 범위 정책 검증
 */
function validateToolFreeTier(
  tool: ToolInfo,
  contextName?: string
): { error?: string } {
  if (!tool.free_tier_info || tool.free_tier_info.trim() === '') {
    const context = contextName ? ` (${contextName})` : '';
    return { error: `무료 범위 미표기: ${tool.name}${context}` };
  }

  const hasPaidKeyword = PAID_TOOL_KEYWORDS.some(kw =>
    tool.free_tier_info?.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasPaidKeyword) {
    return { error: `유료 도구 사용 감지: ${tool.name} - ${tool.free_tier_info}` };
  }

  return {};
}

/**
 * 과정별 도구 검증
 */
function validateCourseTools(
  courses: RoadmapCell[],
  errors: string[]
): void {
  courses.forEach(course => {
    course.tools?.forEach(tool => {
      const result = validateToolFreeTier(tool, course.course_name);
      if (result.error) {
        errors.push(result.error);
      }
    });
  });
}

/**
 * PBL 과정 도구 검증
 */
function validatePBLTools(
  pblCourse: PBLCourse,
  errors: string[]
): void {
  pblCourse.curriculum?.forEach(module => {
    module.tools?.forEach(tool => {
      const result = validateToolFreeTier(tool);
      if (result.error) {
        errors.push(result.error);
      }
    });
  });
}

/**
 * 과정별 시간 제한 및 일관성 검증
 */
function validateCourseHours(
  courses: RoadmapCell[],
  errors: string[],
  warnings: string[]
): void {
  courses.forEach(course => {
    const { course_name, recommended_hours, curriculum } = course;

    // 1. 시간 초과 검증
    if (recommended_hours > MAX_COURSE_HOURS) {
      errors.push(`시간 초과: ${course_name} (${recommended_hours}시간 > ${MAX_COURSE_HOURS}시간)`);
    }

    // 2. 시간 일관성 검증 (recommended_hours = 모듈 시간 합계)
    const modulesTotal = sumModuleHours(curriculum);
    if (modulesTotal > 0 && recommended_hours !== modulesTotal) {
      warnings.push(
        `시간 불일치: ${course_name} - recommended_hours(${recommended_hours}시간)와 ` +
        `모듈 시간 합계(${modulesTotal}시간)가 다릅니다.`
      );
    }
  });
}

/**
 * PBL 과정 시간 제한 및 일관성 검증
 */
function validatePBLHours(
  pblCourse: PBLCourse,
  errors: string[],
  warnings: string[]
): void {
  const { total_hours, curriculum } = pblCourse;
  const modulesTotal = sumModuleHours(curriculum);

  // 1. 시간 초과 검증
  if (total_hours > MAX_COURSE_HOURS) {
    errors.push(`PBL 과정 시간 초과: ${total_hours}시간 > ${MAX_COURSE_HOURS}시간`);
  }
  if (modulesTotal > MAX_COURSE_HOURS) {
    errors.push(`PBL 모듈 합계 시간 초과: ${modulesTotal}시간 > ${MAX_COURSE_HOURS}시간`);
  }

  // 2. 시간 일관성 검증 (total_hours와 모듈 합계 일치 여부)
  if (modulesTotal > 0 && total_hours !== modulesTotal) {
    warnings.push(
      `PBL 시간 불일치: total_hours(${total_hours}시간)와 모듈 합계(${modulesTotal}시간)가 다릅니다.`
    );
  }
}

/**
 * PBL 과정이 courses에서 선정되었는지 검증
 */
function validatePBLCourseSelection(
  pblCourse: PBLCourse,
  courses: RoadmapCell[],
  errors: string[],
  warnings: string[]
): void {
  const { selected_course_name, selected_course_level, selected_course_task } = pblCourse;

  if (!selected_course_name) {
    errors.push('PBL 과정에 선정된 과정명(selected_course_name)이 없습니다.');
    return;
  }

  // 완전 일치 검색
  const matchingCourse = courses.find(
    course =>
      course.course_name === selected_course_name &&
      course.level === selected_course_level &&
      course.target_task === selected_course_task
  );

  if (matchingCourse) {
    return; // 완전 일치하면 검증 통과
  }

  // 과정명만으로 검색
  const courseByName = courses.find(c => c.course_name === selected_course_name);

  if (!courseByName) {
    errors.push(
      `PBL 선정 과정 "${selected_course_name}"이(가) 과정 상세(courses)에 존재하지 않습니다.`
    );
  } else {
    warnings.push(
      `PBL 선정 과정의 레벨 또는 업무가 일치하지 않습니다. ` +
      `선정: ${selected_course_level}/${selected_course_task}, ` +
      `실제: ${courseByName.level}/${courseByName.target_task}`
    );
  }
}

/**
 * PBL 선정 이유 검증
 */
function validatePBLSelectionRationale(
  pblCourse: PBLCourse,
  errors: string[],
  warnings: string[]
): void {
  if (!pblCourse.selection_rationale) {
    errors.push('PBL 과정 선정 이유(selection_rationale)가 없습니다.');
    return;
  }

  const { selection_rationale: rationale } = pblCourse;

  if (!rationale.consultant_expertise_fit) {
    warnings.push('PBL 선정 이유에 컨설턴트 전문성 적합도 설명이 없습니다.');
  }
  if (!rationale.pain_point_alignment) {
    warnings.push('PBL 선정 이유에 페인포인트 연관성 설명이 없습니다.');
  }
  if (!rationale.feasibility_assessment) {
    warnings.push('PBL 선정 이유에 현실 가능성 평가가 없습니다.');
  }
  if (!rationale.summary) {
    warnings.push('PBL 선정 이유 요약이 없습니다.');
  }
}

/**
 * PBL 상세 필드 검증
 */
function validatePBLDetailFields(
  pblCourse: PBLCourse,
  warnings: string[]
): void {
  if (!pblCourse.final_deliverables || pblCourse.final_deliverables.length === 0) {
    warnings.push('PBL 최종 산출물(final_deliverables)이 없습니다.');
  }

  if (!pblCourse.business_impact) {
    warnings.push('PBL 비즈니스 임팩트(business_impact) 설명이 없습니다.');
  }

  // 각 모듈의 deliverables 검증
  pblCourse.curriculum?.forEach((module, idx) => {
    if (!module.deliverables || module.deliverables.length === 0) {
      warnings.push(
        `PBL 모듈 ${idx + 1}(${module.module_name})에 결과물(deliverables)이 없습니다.`
      );
    }
  });
}

// ============================================================================
// 메인 검증 함수
// ============================================================================

/**
 * 로드맵 검증
 */
export function validateRoadmap(result: RoadmapResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 무료 도구 정책 검증
  validateCourseTools(result.courses, errors);
  if (result.pbl_course?.curriculum) {
    validatePBLTools(result.pbl_course, errors);
  }

  // 2. 시간 제한 및 일관성 검증
  validateCourseHours(result.courses, errors, warnings);
  if (result.pbl_course) {
    validatePBLHours(result.pbl_course, errors, warnings);
  }

  // 3. 필수 필드 검증
  if (!result.diagnosis_summary) {
    warnings.push('진단 요약이 비어있습니다.');
  }

  if (!result.roadmap_matrix || result.roadmap_matrix.length === 0) {
    errors.push('로드맵 매트릭스가 비어있습니다.');
  }

  if (!result.pbl_course) {
    errors.push('PBL 과정이 없습니다.');
  }

  // 4. PBL 과정 상세 검증
  if (result.pbl_course && result.courses && result.courses.length > 0) {
    validatePBLCourseSelection(result.pbl_course, result.courses, errors, warnings);
    validatePBLSelectionRationale(result.pbl_course, errors, warnings);
    validatePBLDetailFields(result.pbl_course, warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
