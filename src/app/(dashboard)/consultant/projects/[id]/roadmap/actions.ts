'use server';

import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
      return { success: false, error: '컨설턴트만 로드맵을 생성할 수 있습니다.' };
    }

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
 * 로드맵 FINAL 확정
 */
export async function confirmFinalRoadmap(roadmapId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    await finalizeRoadmap(roadmapId, user.id);

    return { success: true };
  } catch (error) {
    console.error('[confirmFinalRoadmap Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'FINAL 확정에 실패했습니다.',
    };
  }
}

/**
 * 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersions(projectId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

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
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
      return { success: false, error: '컨설턴트만 로드맵을 편집할 수 있습니다.' };
    }

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
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

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

