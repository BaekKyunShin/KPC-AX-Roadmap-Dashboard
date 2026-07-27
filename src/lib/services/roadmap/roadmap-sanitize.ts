import type { RoadmapCourseSubject, RoadmapCourseSpec, RoadmapResult } from './roadmap-types';

// ============================================================================
// 빈 행 자동 정리 유틸리티 — 산인공 양식 v2
// ----------------------------------------------------------------------------
// "행 추가" 버튼을 눌러 빈 행을 만든 뒤 값을 채우지 않고 저장한 경우,
// 저장 시점에 자동으로 제거하여 결과 화면 / 내보내기 / 검증 단계에서
// 의미 없는 빈 행이 섞여 들어가지 않도록 한다.
//
// v1 의 역량(competencies)·연간계획(annual_plan) 정리 함수는 해당 표가 양식에서
// 삭제되면서 함께 제거됐다. v2 의 정리 대상은 훈련과정 명세서와 교과목뿐이다.
//
// 적용 위치: Server Action → updateRoadmapManually(merged 완성 직후) 및
//           LLM 생성 결과 저장 직전(방어적 호출).
// ============================================================================

/** "의미 있는 문자"가 하나라도 있는지 확인 (공백·탭·줄바꿈만 있으면 false). */
function hasText(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 교과목 빈 행 판정.
 * name·details 모두 공백이면 빈 행.
 */
export function isEmptyCourseSubject(s: RoadmapCourseSubject): boolean {
  return !hasText(s.name) && !hasText(s.details);
}

/**
 * 훈련과정 명세서 전체 빈 카드 판정.
 * course_name이 공백이고 유효한 교과목도 없으면 빈 카드.
 */
export function isEmptyCourseSpec(spec: RoadmapCourseSpec): boolean {
  if (hasText(spec.course_name)) return false;
  const meaningfulSubjects = (spec.subjects ?? []).filter((s) => !isEmptyCourseSubject(s));
  return meaningfulSubjects.length === 0;
}

/**
 * 저장 직전 전체 로드맵 결과를 정리한다 (불변).
 * - 명세서·교과목의 빈 행 제거
 * - v1 orphan 키가 입력에 섞여 있어도 결과에는 v2 구조만 담는다
 */
export function sanitizeRoadmapResult(result: RoadmapResult): RoadmapResult {
  const cleanedCourseSpecs = (result.course_specs ?? [])
    .map((spec) => ({
      ...spec,
      subjects: (spec.subjects ?? []).filter((s) => !isEmptyCourseSubject(s)),
    }))
    .filter((spec) => !isEmptyCourseSpec(spec));

  return {
    diagnosis_summary: result.diagnosis_summary,
    setup_necessity: result.setup_necessity,
    outcome_summary: result.outcome_summary,
    course_specs: cleanedCourseSpecs,
  };
}
