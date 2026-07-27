import type { RoadmapResult, ValidationResult } from './roadmap-types';
import { ROADMAP_COURSE_SPEC_COUNT } from './roadmap-types';

// ============================================================================
// 산인공 공식 양식 v2 (2026-07-13 개정) 기반 로드맵 검증
// ----------------------------------------------------------------------------
// 양식 Ⅲ장이 "훈련체계 수립"에서 "훈련실시 계획 제안"으로 재설계되면서
// 역량 모델링·NCS·훈련체계도·연간 훈련계획 표가 전부 삭제되었다.
// LLM 생성물은 훈련과정 명세서 6개로 축소되었고, 각 명세서에
// 훈련시기·훈련수준이 새로 추가되었다.
//
// 정책:
//  1. course_specs.length >= 6              (error) — 양식의 명세서 표 개수
//  2. course_specs[*].course_name 공백       (error)
//  3. course_specs[*].subjects.length >= 1  (error)
//  4. course_specs[*].training_period 공백   (warning)
//  5. diagnosis_summary 공백                 (warning)
// ============================================================================

function validateRequiredFields(result: RoadmapResult, errors: string[], warnings: string[]): void {
  if (!result.diagnosis_summary || result.diagnosis_summary.trim() === '') {
    warnings.push('진단 요약(diagnosis_summary)이 비어있습니다.');
  }

  const count = result.course_specs?.length ?? 0;
  if (count < ROADMAP_COURSE_SPEC_COUNT) {
    errors.push(
      `훈련과정 명세서(course_specs)는 최소 ${ROADMAP_COURSE_SPEC_COUNT}개 이상이어야 합니다. 현재: ${count}개`
    );
  }
}

function validateCourseSpecs(result: RoadmapResult, errors: string[], warnings: string[]): void {
  result.course_specs?.forEach((spec, index) => {
    const label = spec.course_name?.trim() || `${index + 1}번째 과정`;

    if (!spec.course_name || spec.course_name.trim() === '') {
      errors.push(`과정명 누락: ${index + 1}번째 훈련과정 명세서에 과정명이 없습니다.`);
    }

    if (!spec.subjects || spec.subjects.length === 0) {
      errors.push(`교과목 누락: "${label}" 명세서에 교과목(subjects)이 없습니다.`);
    }

    if (!spec.training_period || spec.training_period.trim() === '') {
      warnings.push(`훈련시기 누락: "${label}" 명세서에 훈련시기가 비어있습니다.`);
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
  validateCourseSpecs(result, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
