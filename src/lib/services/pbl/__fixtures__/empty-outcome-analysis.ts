import type { PBLOutcomeMetrics } from '../pbl-types';

/**
 * 빈 성과분석 측정 지표(outcome_metrics)를 생성한다.
 *
 * v2 양식에서 성과 확산 전략(diffusion_strategy)이 삭제되고 outcome_metrics 가
 * operation_plan 하위(training_goal 다음)로 이동함에 따라, 이 fixture 는 이제
 * `operation_plan.outcome_metrics` 자리에 넣을 빈 지표 객체를 반환한다.
 * (export 이름은 기존 importer 호환을 위해 유지 — 사용처는 향후 커밋에서 위치만 이동)
 */
export function createEmptyOutcomeAnalysis(): PBLOutcomeMetrics {
  return {
    selected_goals: [],
    quantitative: '',
    qualitative: '',
  };
}
