import type { LLMRoadmapResult } from './roadmap-types';

// ============================================================================
// 시간 계산 / 안전 보정 유틸리티
// ----------------------------------------------------------------------------
// 산인공 4섹션 구조에서는 시간 필드가 LLM 출력 그대로 사용되므로 복잡한
// 보정 로직은 불필요하다. 다만 LLM 출력의 hours 필드에 음수·NaN·undefined
// 가 포함될 가능성을 대비해 안전망으로 0 이상 정수로 보정한다.
// ============================================================================

/**
 * 모듈/교과목 배열의 시간 합계 계산 (음수·비정상 값은 0으로 처리).
 */
export function sumModuleHours(
  items: { hours?: number | null }[] | undefined | null,
): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, m) => {
    const h = m.hours;
    if (typeof h === 'number' && Number.isFinite(h) && h > 0) {
      return sum + h;
    }
    return sum;
  }, 0);
}

/** 단일 hours 값을 0 이상 유한수로 보정 */
function normalizeHours(h: unknown): number {
  if (typeof h !== 'number' || !Number.isFinite(h) || h < 0) {
    return 0;
  }
  return h;
}

/**
 * LLM 출력 결과의 시간 안전 보정.
 *
 * 처리 대상:
 * - course_specs[*].subjects[*].hours
 * - annual_plan.items[*].hours
 *
 * 음수 / NaN / undefined / Infinity → 0으로 보정. 정상 값은 보존.
 */
export function normalizeRoadmapHours(result: LLMRoadmapResult): LLMRoadmapResult {
  const nextCourseSpecs = (result.course_specs ?? []).map((spec) => ({
    ...spec,
    subjects: (spec.subjects ?? []).map((subj) => ({
      ...subj,
      hours: normalizeHours(subj.hours),
    })),
  }));

  const nextAnnualPlan = {
    ...result.annual_plan,
    items: (result.annual_plan?.items ?? []).map((item) => ({
      ...item,
      hours: normalizeHours(item.hours),
    })),
  };

  return {
    ...result,
    annual_plan: nextAnnualPlan,
    course_specs: nextCourseSpecs,
  };
}
