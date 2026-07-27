import type { RoadmapOutcomeSummary, RoadmapCourseSpec } from '@/lib/services/roadmap';
import type { RoadmapVersionStatus } from '@/types/database';

/**
 * 로드맵 버전 UI용 타입 (산인공 공식 양식 v2 — 2026-07-13 개정)
 *
 *   Ⅰ-1. 수립 배경          → setup_necessity
 *   Ⅰ-3. 수립 주요 결과      → outcome_summary
 *   Ⅲ.   훈련실시 계획 제안   → course_specs (훈련과정 명세서 6개)
 *
 * v1 대비 삭제: competencies · ncs_* · training_structure(+_method) · annual_plan
 * (신규 양식에서 역량 모델링·NCS·훈련체계도·연간 훈련계획 표가 전부 제거됨)
 */
export interface RoadmapVersionUI {
  id: string;
  version_number: number;
  status: RoadmapVersionStatus;
  diagnosis_summary: string;
  setup_necessity: string;
  outcome_summary: RoadmapOutcomeSummary;
  course_specs: RoadmapCourseSpec[];
  revision_prompt: string | null;
  is_shared: boolean;
  created_at: string;
  finalized_at: string | null;
}

/**
 * 로드맵 탭 키 타입 (v2: Ⅲ장이 훈련과정 명세서 1섹션으로 축소)
 */
export type RoadmapTabKey = 'specs';

/**
 * 로드맵 탭 설정 (산인공 양식 v2 Ⅲ장)
 */
export const ROADMAP_TABS: { key: RoadmapTabKey; label: string }[] = [
  { key: 'specs', label: '훈련과정 명세서' },
];
