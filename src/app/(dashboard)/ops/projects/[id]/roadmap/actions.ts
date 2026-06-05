'use server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import {
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  fromRoadmapVersionColumns,
} from '@/lib/services/roadmap';

/**
 * raw row → RoadmapVersionUI 호환 형태로 변환.
 * legacy 컬럼을 fromRoadmapVersionColumns로 신규 4섹션 구조로 매핑.
 */
function toRoadmapVersionUI<
  R extends {
    id: string;
    version_number: number;
    status: string;
    diagnosis_summary?: string | null;
    roadmap_matrix?: unknown;
    pbl_course?: unknown;
    courses?: unknown;
    revision_prompt: string | null;
    is_shared: boolean;
    created_at: string;
    finalized_at: string | null;
  },
>(row: R) {
  return {
    id: row.id,
    version_number: row.version_number,
    status: row.status,
    revision_prompt: row.revision_prompt,
    is_shared: row.is_shared,
    created_at: row.created_at,
    finalized_at: row.finalized_at,
    ...fromRoadmapVersionColumns(row),
  };
}

/**
 * OPS_ADMIN용 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersionsForOps(projectId: string) {
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
    if ('error' in auth) return [];

    const rawVersions = await fetchRoadmapVersions(projectId);
    return rawVersions.map(toRoadmapVersionUI);
  } catch {
    return [];
  }
}

/**
 * OPS_ADMIN용 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersionForOps(roadmapId: string) {
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
    if ('error' in auth) return null;

    const roadmap = await fetchRoadmapVersion(roadmapId);
    if (!roadmap) return null;
    return toRoadmapVersionUI(roadmap);
  } catch {
    return null;
  }
}
