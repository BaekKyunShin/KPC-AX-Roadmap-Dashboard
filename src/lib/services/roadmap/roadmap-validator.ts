import type { RoadmapResult, ValidationResult } from './roadmap-types';

// ============================================================================
// 산인공 공식 양식(Ⅰ·Ⅲ장) 기반 로드맵 검증
// ----------------------------------------------------------------------------
// 정책:
//  1. competencies.length >= 1
//  2. training_structure.length >= 1
//  3. annual_plan.items.length >= 1
//  4. course_specs.length >= 3
//  5. 각 course_specs[*].subjects.length >= 1
//  6. 루트 NCS 일관성: ncs_used=true → ncs_methodology 필수
//                      ncs_used=false → ncs_derivation_method 필수 (Ⅲ-1 표 전체 단위)
//  7. training_structure_method 비어있으면 warning (Ⅲ-2 수립 방법)
//  8. 역량 참조 정합성: training_structure / annual_plan.items 의
//     competency_name 은 competencies[*].name 집합에 존재해야 함 (errors)
//  9. 과정명 정합성: course_specs[*].course_name 은
//     annual_plan.items[*].course_name 집합과 일치해야 함 (warnings)
// 10. diagnosis_summary 누락 시 warning
// ============================================================================

function validateRequiredFields(
  result: RoadmapResult,
  errors: string[],
  warnings: string[],
): void {
  if (!result.diagnosis_summary || result.diagnosis_summary.trim() === '') {
    warnings.push('진단 요약(diagnosis_summary)이 비어있습니다.');
  }

  if (!result.competencies || result.competencies.length === 0) {
    errors.push('역량 모델링(competencies)이 비어있습니다.');
  }

  if (!result.training_structure || result.training_structure.length === 0) {
    errors.push('훈련체계도(training_structure)가 비어있습니다.');
  }

  if (!result.annual_plan?.items || result.annual_plan.items.length === 0) {
    errors.push('연간 훈련계획(annual_plan.items)이 비어있습니다.');
  }

  if (!result.course_specs || result.course_specs.length < 3) {
    errors.push(
      `훈련과정 명세서(course_specs)는 최소 3개 이상이어야 합니다. 현재: ${result.course_specs?.length ?? 0}개`,
    );
  }

  if (!result.training_structure_method || result.training_structure_method.trim() === '') {
    warnings.push('훈련체계 수립 방법(training_structure_method)이 비어있습니다.');
  }
}

function validateCourseSubjects(result: RoadmapResult, errors: string[]): void {
  result.course_specs?.forEach((spec) => {
    if (!spec.subjects || spec.subjects.length === 0) {
      errors.push(`교과목 누락: "${spec.course_name}" 명세서에 교과목(subjects)이 없습니다.`);
    }
  });
}

function validateNcsConsistency(result: RoadmapResult, errors: string[]): void {
  if (result.ncs_used) {
    if (!result.ncs_methodology || result.ncs_methodology.trim() === '') {
      errors.push(
        'NCS 활용 방법(ncs_methodology)이 누락되었습니다. ncs_used=true 이지만 활용 방법이 비어있습니다.',
      );
    }
  } else {
    if (!result.ncs_derivation_method || result.ncs_derivation_method.trim() === '') {
      errors.push(
        'NCS 도출 방법(ncs_derivation_method)이 누락되었습니다. ncs_used=false 이지만 도출 방법이 비어있습니다.',
      );
    }
  }
}

function validateCompetencyReferences(result: RoadmapResult, errors: string[]): void {
  const competencyNames = new Set(result.competencies?.map((c) => c.name) ?? []);

  result.training_structure?.forEach((item) => {
    if (!competencyNames.has(item.competency_name)) {
      errors.push(
        `훈련체계도 역량 참조 오류: "${item.competency_name}"은(는) competencies에 정의되지 않은 역량입니다.`,
      );
    }
  });

  result.annual_plan?.items?.forEach((item) => {
    if (!competencyNames.has(item.competency_name)) {
      errors.push(
        `연간 훈련계획 역량 참조 오류: "${item.competency_name}"은(는) competencies에 정의되지 않은 역량입니다.`,
      );
    }
  });
}

function validateCourseNameAlignment(result: RoadmapResult, warnings: string[]): void {
  const annualCourseNames = new Set(
    result.annual_plan?.items?.map((item) => item.course_name) ?? [],
  );

  result.course_specs?.forEach((spec) => {
    if (!annualCourseNames.has(spec.course_name)) {
      warnings.push(
        `명세서 과정명 불일치: "${spec.course_name}"은(는) 연간 훈련계획 items의 course_name에 존재하지 않습니다.`,
      );
    }
  });
}

/**
 * 로드맵 검증
 */
export function validateRoadmap(result: RoadmapResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  validateRequiredFields(result, errors, warnings);
  validateCourseSubjects(result, errors);
  validateNcsConsistency(result, errors);
  validateCompetencyReferences(result, errors);
  validateCourseNameAlignment(result, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
