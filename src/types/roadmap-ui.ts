import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlan,
  RoadmapCourseSpec,
} from '@/lib/services/roadmap';
import type { RoadmapVersionStatus } from '@/types/database';

/**
 * 로드맵 버전 UI용 타입 (산인공 공식 양식 4섹션 구조)
 *
 *   Ⅲ-1. 역량 모델링        → competencies
 *   Ⅲ-2. 훈련체계도         → training_structure
 *   Ⅲ-3. 연간 훈련계획      → annual_plan
 *   Ⅲ-4. 훈련과정 명세서    → course_specs
 */
export interface RoadmapVersionUI {
  id: string;
  version_number: number;
  status: RoadmapVersionStatus;
  diagnosis_summary: string;
  competencies: RoadmapCompetency[];
  training_structure: RoadmapTrainingStructureItem[];
  annual_plan: RoadmapAnnualPlan;
  course_specs: RoadmapCourseSpec[];
  revision_prompt: string | null;
  is_shared: boolean;
  created_at: string;
  finalized_at: string | null;
}

/**
 * 로드맵 탭 키 타입 (4섹션)
 */
export type RoadmapTabKey = 'competencies' | 'structure' | 'plan' | 'specs';

/**
 * 로드맵 탭 설정 (산인공 양식 Ⅲ장 순서)
 */
export const ROADMAP_TABS: { key: RoadmapTabKey; label: string }[] = [
  { key: 'competencies', label: '역량 모델링' },
  { key: 'structure', label: '훈련체계도' },
  { key: 'plan', label: '연간 훈련계획' },
  { key: 'specs', label: '훈련과정 명세서' },
];
