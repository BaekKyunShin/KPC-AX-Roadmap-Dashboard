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
import { createAuditLog } from '@/lib/services/audit';
import type { RoadmapExportData } from '@/lib/services/export-pdf';

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
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
 * 내보내기용 데이터 준비
 */
export async function prepareExportData(roadmapId: string): Promise<{
  success: boolean;
  data?: RoadmapExportData;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 로드맵 데이터 조회
    const { data: roadmap } = await supabase
      .from('roadmap_versions')
      .select('*, projects!inner(company_name, assigned_consultant_id)')
      .eq('id', roadmapId)
      .single();

    if (!roadmap) {
      return { success: false, error: '로드맵을 찾을 수 없습니다.' };
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

    const projectData = roadmap.projects as { company_name: string; assigned_consultant_id: string };

    if (profile.role === 'CONSULTANT_APPROVED') {
      if (projectData.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    const exportData: RoadmapExportData = {
      companyName: projectData.company_name,
      projectId: roadmap.project_id,
      versionNumber: roadmap.version_number,
      status: roadmap.status,
      diagnosisSummary: roadmap.diagnosis_summary,
      roadmapMatrix: roadmap.roadmap_matrix,
      pblCourse: roadmap.pbl_course,
      courses: roadmap.courses,
      createdAt: roadmap.created_at,
      finalizedAt: roadmap.finalized_at,
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error('[prepareExportData Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '데이터 준비에 실패했습니다.',
    };
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
 * 다운로드 감사 로그 기록
 */
export async function logDownload(
  roadmapId: string,
  format: 'PDF' | 'XLSX'
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 로드맵 정보 조회
    const { data: roadmap } = await supabase
      .from('roadmap_versions')
      .select('project_id, version_number, status')
      .eq('id', roadmapId)
      .single();

    if (!roadmap) {
      return { success: false, error: '로드맵을 찾을 수 없습니다.' };
    }

    await createAuditLog({
      actorUserId: user.id,
      action: format === 'PDF' ? 'DOWNLOAD_PDF' : 'DOWNLOAD_XLSX',
      targetType: 'roadmap',
      targetId: roadmapId,
      meta: {
        project_id: roadmap.project_id,
        version_number: roadmap.version_number,
        status: roadmap.status,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[logDownload Error]', error);
    return { success: false, error: '감사 로그 기록에 실패했습니다.' };
  }
}
