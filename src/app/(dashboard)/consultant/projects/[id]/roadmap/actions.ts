'use server';

import { requireAuth, requireAuthWithRole } from '@/lib/actions/auth-helpers';
import {
  generateRoadmap,
  finalizeRoadmap,
  getRoadmapVersions,
  getRoadmapVersion,
  updateRoadmapManually,
  type RoadmapRow,
  type PBLCourse,
  type RoadmapCell,
} from '@/lib/services/roadmap';
import { insertSystemActivityLog } from '@/lib/services/activity-log';

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface ProjectInfoResult {
  success: boolean;
  data?: { companyName: string };
  error?: string;
}

/**
 * 로드맵 생성
 */
export async function createRoadmap(
  projectId: string,
  revisionPrompt?: string
): Promise<ActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 생성할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // 프로젝트 접근 권한 확인
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id, status')
      .eq('id', projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }

    if (!['INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED'].includes(projectData.status)) {
      return { success: false, error: '인터뷰가 완료된 프로젝트만 로드맵을 생성할 수 있습니다.' };
    }

    // 로드맵 생성
    const { roadmapId, result, validation } = await generateRoadmap(
      projectId,
      user.id,
      revisionPrompt
    );

    // 활동 일지 자동 기록
    const logContent = revisionPrompt
      ? '새 로드맵 버전이 생성되었습니다.'
      : '로드맵이 생성되었습니다.';
    await insertSystemActivityLog(projectId, user.id, logContent);

    return {
      success: true,
      data: {
        roadmapId,
        result,
        validation,
      },
    };
  } catch (error) {
    console.error('[createRoadmap Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '로드맵 생성에 실패했습니다.',
    };
  }
}

/**
 * 로드맵 최종 확정
 */
export async function confirmFinalRoadmap(roadmapId: string): Promise<ActionResult> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    await finalizeRoadmap(roadmapId, user.id);

    // 활동 일지 자동 기록
    const { data: roadmapData } = await supabase
      .from('roadmap_versions')
      .select('project_id')
      .eq('id', roadmapId)
      .single();

    if (roadmapData) {
      await insertSystemActivityLog(
        roadmapData.project_id,
        user.id,
        '로드맵이 최종 확정되었습니다.',
      );
    }

    return { success: true };
  } catch (error) {
    console.error('[confirmFinalRoadmap Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '최종 확정에 실패했습니다.',
    };
  }
}

/**
 * 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersions(projectId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return [];
    const { user, supabase } = auth;

    // 접근 권한 확인 (컨설턴트 또는 OPS_ADMIN)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) return [];

    if (profile.role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', projectId)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return [];
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return [];
    }

    return await getRoadmapVersions(projectId);
  } catch {
    return [];
  }
}

/**
 * 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersion(roadmapId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase } = auth;

    const roadmap = await getRoadmapVersion(roadmapId);
    if (!roadmap) return null;

    // 접근 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    if (profile.role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', roadmap.project_id)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return null;
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return null;
    }

    return roadmap;
  } catch {
    return null;
  }
}

/**
 * 로드맵 수동 편집
 */
export async function editRoadmapManually(
  roadmapId: string,
  updates: {
    diagnosis_summary?: string;
    roadmap_matrix?: RoadmapRow[];
    pbl_course?: PBLCourse;
    courses?: RoadmapCell[];
  }
): Promise<ActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 편집할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const result = await updateRoadmapManually(roadmapId, user.id, updates);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        validation: result.validation,
      },
    };
  } catch (error) {
    console.error('[editRoadmapManually Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '로드맵 편집에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 기본 정보 조회 (회사명 등)
 */
export async function fetchProjectInfo(projectId: string): Promise<ProjectInfoResult> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const { data: project } = await supabase
      .from('projects')
      .select('company_name, assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 접근 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    if (profile.role === 'CONSULTANT_APPROVED') {
      if (project.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    return {
      success: true,
      data: { companyName: project.company_name },
    };
  } catch (error) {
    console.error('[fetchProjectInfo Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '프로젝트 정보 조회에 실패했습니다.',
    };
  }
}

