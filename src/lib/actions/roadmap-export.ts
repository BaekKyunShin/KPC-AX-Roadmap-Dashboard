'use server';

import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/services/audit';
import type { RoadmapExportData } from '@/lib/services/export-pdf';

export interface ExportActionResult {
  success: boolean;
  error?: string;
}

export interface PrepareExportDataResult {
  success: boolean;
  data?: RoadmapExportData;
  error?: string;
}

/**
 * 내보내기용 데이터 준비
 * - CONSULTANT_APPROVED: 자신이 담당한 프로젝트만 접근 가능
 * - OPS_ADMIN, SYSTEM_ADMIN: 모든 프로젝트 접근 가능
 */
export async function prepareExportData(roadmapId: string): Promise<PrepareExportDataResult> {
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

    // 역할별 접근 권한 검증
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
 * 다운로드 감사 로그 기록
 */
export async function logDownload(
  roadmapId: string,
  format: 'PDF' | 'XLSX'
): Promise<ExportActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 사용자 역할 조회
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

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
        role: profile?.role,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[logDownload Error]', error);
    return { success: false, error: '감사 로그 기록에 실패했습니다.' };
  }
}
