'use server';

import { createClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/services/audit';
import { EXPORT_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import { canAccessProjectArtifact } from '@/lib/actions/auth-helpers';
import { fromRoadmapVersionColumns, sanitizeRoadmapResult } from '@/lib/services/roadmap';
import type { ProjectStatus, UserRole } from '@/types/database';
import type { RoadmapExportData } from '@/lib/services/export-pdf';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/** projects!inner() 조인 결과 타입 */
interface ProjectJoinData {
  company_name: string;
  assigned_consultant_id: string;
  status: string;
}

/**
 * 내보내기용 데이터 준비
 * - CONSULTANT_APPROVED: 자신이 담당한 프로젝트만 접근 가능
 * - OPS_ADMIN, SYSTEM_ADMIN: 모든 프로젝트 접근 가능
 */
export async function prepareExportData(
  roadmapId: string
): Promise<ActionResult<RoadmapExportData>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 로드맵 데이터 조회
    const { data: roadmap } = await supabase
      .from('roadmap_versions')
      .select('*, projects!inner(company_name, assigned_consultant_id, status)')
      .eq('id', roadmapId)
      .single();

    if (!roadmap) {
      return { success: false, error: '로드맵을 찾을 수 없습니다.' };
    }

    const projectData = roadmap.projects as ProjectJoinData;

    // 프로젝트 상태 검증 (ROADMAP_DRAFTED, FINALIZED에서만 내보내기 허용)
    if (!EXPORT_ELIGIBLE_STATUSES.includes(projectData.status as ProjectStatus)) {
      return { success: false, error: '내보내기할 수 없는 프로젝트 상태입니다.' };
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

    // 역할별 접근 권한 검증
    if (
      !canAccessProjectArtifact(
        profile.role as UserRole,
        projectData.assigned_consultant_id,
        user.id
      )
    ) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    // DB legacy 컬럼(roadmap_matrix / pbl_course / courses) → RoadmapResult(v2) 매핑
    const mappedRaw = fromRoadmapVersionColumns({
      diagnosis_summary: roadmap.diagnosis_summary,
      roadmap_matrix: roadmap.roadmap_matrix,
      pbl_course: roadmap.pbl_course,
      courses: roadmap.courses,
    });

    // 정책 이전 (2026-05-18) — 내보내기 직전 1회 sanitize.
    // DRAFT 편집 중 sanitize 가 해제되어 DB 에 빈 행이 남을 수 있어 보호.
    const mapped = sanitizeRoadmapResult(mappedRaw);

    // 양식 v2 — Ⅲ-1 역량 모델링 / Ⅲ-2 훈련체계도 / Ⅲ-3 연간 훈련계획 표가 삭제되어
    // PDF·XLSX 로 넘기는 payload 도 명세서(course_specs) 중심으로 축소되었다.
    const exportData: RoadmapExportData = {
      companyName: projectData.company_name,
      projectId: roadmap.project_id,
      versionNumber: roadmap.version_number,
      status: roadmap.status,
      diagnosisSummary: mapped.diagnosis_summary,
      courseSpecs: mapped.course_specs,
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
 * 다운로드 감사로그 기록
 */
export async function logDownload(
  roadmapId: string,
  format: 'PDF' | 'XLSX'
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    return { success: false, error: '감사로그 기록에 실패했습니다.' };
  }
}
