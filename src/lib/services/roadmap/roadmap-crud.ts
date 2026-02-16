import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import type { RoadmapRow, PBLCourse, RoadmapCell, RoadmapResult } from './roadmap-types';
import { buildRoadmapMatrixFromCourses } from './roadmap-matrix-builder';
import { validateRoadmap } from './roadmap-validator';
import type { ValidationResult } from './roadmap-types';

// ============================================================================
// 로드맵 CRUD
// ============================================================================

/** finalize_roadmap RPC 반환 타입 (판별 유니온) */
type FinalizeRoadmapRpcResult =
  | { success: true; project_id: string; version_number: number }
  | { success: false; error: string };

/**
 * 로드맵 최종 확정
 * RPC로 기존 FINAL→ARCHIVED + 현재→FINAL + 프로젝트 FINALIZED를 원자적 실행
 */
export async function finalizeRoadmap(
  roadmapId: string,
  actorUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  // RPC로 원자적 확정 (검증 + 3개 UPDATE를 단일 트랜잭션에서 실행)
  // 상태 전이는 RPC 내부의 선행 조건(DRAFT 상태 확인)으로 제한됨
  const { data, error } = await supabase.rpc('finalize_roadmap', {
    p_roadmap_id: roadmapId,
    p_actor_user_id: actorUserId,
  });

  if (error || !data) {
    throw new Error('로드맵 확정에 실패했습니다.');
  }

  const result = data as FinalizeRoadmapRpcResult;

  if (!result.success) {
    throw new Error(result.error || '로드맵 확정에 실패했습니다.');
  }

  // 부수 효과 (감사로그, 알림) — 실패해도 확정 결과에 영향 없음
  try {
    await createAuditLog({
      actorUserId,
      action: 'ROADMAP_FINALIZE',
      targetType: 'roadmap',
      targetId: roadmapId,
      meta: {
        project_id: result.project_id,
        version_number: result.version_number,
      },
    });
  } catch (e) {
    console.error('[finalizeRoadmap] 감사로그 기록 실패:', e);
  }

  try {
    const { data: projectInfo } = await supabase
      .from('projects')
      .select('company_name, is_test_mode')
      .eq('id', result.project_id)
      .single();

    if (!projectInfo?.is_test_mode) {
      await createNotificationForAdmins({
        type: 'roadmap_finalized',
        title: '로드맵 확정',
        message: `${projectInfo?.company_name || '(알 수 없는 기업)'} 프로젝트 로드맵이 최종 확정되었습니다.`,
        link: `/ops/projects/${result.project_id}`,
      });
    }
  } catch (e) {
    console.error('[finalizeRoadmap] 알림 발송 실패:', e);
  }
}

/**
 * 로드맵 조회
 */
export async function fetchRoadmapVersions(projectId: string) {
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  return versions || [];
}

/**
 * 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersion(roadmapId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('id', roadmapId)
    .single();

  return data;
}

/**
 * 로드맵 수동 편집
 * DRAFT 상태의 로드맵만 편집 가능
 */
export async function updateRoadmapManually(
  roadmapId: string,
  actorUserId: string,
  updates: {
    diagnosis_summary?: string;
    roadmap_matrix?: RoadmapRow[];
    pbl_course?: PBLCourse;
    courses?: RoadmapCell[];
  }
): Promise<{ success: boolean; validation: ValidationResult; error?: string }> {
  const supabase = createAdminClient();

  // 현재 로드맵 조회
  const { data: roadmap, error: fetchError } = await supabase
    .from('roadmap_versions')
    .select('*, projects!inner(assigned_consultant_id)')
    .eq('id', roadmapId)
    .single();

  if (fetchError || !roadmap) {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: '로드맵을 찾을 수 없습니다.' };
  }

  // DRAFT 상태만 편집 가능
  if (roadmap.status !== 'DRAFT') {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: 'DRAFT 상태의 로드맵만 편집할 수 있습니다.' };
  }

  // 배정된 컨설턴트 확인
  const projectData = roadmap.projects as { assigned_consultant_id: string };
  if (projectData.assigned_consultant_id !== actorUserId) {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: '배정된 컨설턴트만 로드맵을 편집할 수 있습니다.' };
  }

  // 새 데이터 구성
  const newCourses = updates.courses ?? roadmap.courses;
  const newResult: RoadmapResult = {
    diagnosis_summary: updates.diagnosis_summary ?? roadmap.diagnosis_summary,
    // courses가 업데이트되면 roadmap_matrix 자동 재생성
    roadmap_matrix: updates.courses
      ? buildRoadmapMatrixFromCourses(newCourses)
      : (updates.roadmap_matrix ?? roadmap.roadmap_matrix),
    pbl_course: updates.pbl_course ?? roadmap.pbl_course,
    courses: newCourses,
  };

  // 검증 실행
  const validation = validateRoadmap(newResult);

  // DB 업데이트
  const { error: updateError } = await supabase
    .from('roadmap_versions')
    .update({
      diagnosis_summary: newResult.diagnosis_summary,
      roadmap_matrix: newResult.roadmap_matrix,
      pbl_course: newResult.pbl_course,
      courses: newResult.courses,
      free_tool_validated: validation.errors.filter(e => e.includes('무료') || e.includes('유료')).length === 0,
      time_limit_validated: validation.errors.filter(e => e.includes('시간')).length === 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roadmapId);

  if (updateError) {
    return { success: false, validation, error: updateError.message };
  }

  // 감사로그
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_UPDATE',
    targetType: 'roadmap',
    targetId: roadmapId,
    meta: {
      project_id: roadmap.project_id,
      version_number: roadmap.version_number,
      edited_fields: Object.keys(updates),
      validation_result: {
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      },
    },
  });

  return { success: true, validation };
}
