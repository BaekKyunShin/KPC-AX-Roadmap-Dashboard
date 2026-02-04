import type { RoadmapRow, PBLCourse, RoadmapCell } from '@/lib/services/roadmap';
import type { RoadmapVersionStatus } from '@/types/database';

/**
 * 로드맵 버전 UI용 타입
 */
export interface RoadmapVersionUI {
  id: string;
  version_number: number;
  status: RoadmapVersionStatus;
  diagnosis_summary: string;
  roadmap_matrix: RoadmapRow[];
  pbl_course: PBLCourse;
  courses: RoadmapCell[];
  free_tool_validated: boolean;
  time_limit_validated: boolean;
  revision_prompt: string | null;
  created_at: string;
  finalized_at: string | null;
}

/**
 * 로드맵 탭 키 타입
 */
export type RoadmapTabKey = 'matrix' | 'pbl' | 'courses';

/**
 * 로드맵 탭 설정
 */
export const ROADMAP_TABS: { key: RoadmapTabKey; label: string }[] = [
  { key: 'matrix', label: '과정 체계도' },
  { key: 'courses', label: '과정 상세' },
  { key: 'pbl', label: 'PBL 과정' },
];
