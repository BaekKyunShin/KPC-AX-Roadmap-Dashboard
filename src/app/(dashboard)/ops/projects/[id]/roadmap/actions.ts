'use server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { fetchRoadmapVersions, fetchRoadmapVersion } from '@/lib/services/roadmap';

/**
 * OPS_ADMIN용 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersionsForOps(projectId: string) {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return [];

    return await fetchRoadmapVersions(projectId);
  } catch {
    return [];
  }
}

/**
 * OPS_ADMIN용 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersionForOps(roadmapId: string) {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return null;

    return await fetchRoadmapVersion(roadmapId);
  } catch {
    return null;
  }
}
