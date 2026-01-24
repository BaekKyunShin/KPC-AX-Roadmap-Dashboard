'use server';

import { createClient } from '@/lib/supabase/server';
import { getRoadmapVersions, getRoadmapVersion } from '@/lib/services/roadmap';

/**
 * OPS_ADMIN용 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersionsForOps(projectId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return [];
    }

    return await getRoadmapVersions(projectId);
  } catch {
    return [];
  }
}

/**
 * OPS_ADMIN용 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersionForOps(roadmapId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return null;
    }

    return await getRoadmapVersion(roadmapId);
  } catch {
    return null;
  }
}
