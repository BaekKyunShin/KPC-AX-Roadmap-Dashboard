import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import type {
  RoadmapAnnualPlan,
  RoadmapCompetency,
  RoadmapCourseSpec,
  RoadmapResult,
  RoadmapTrainingStructureItem,
  ValidationResult,
} from './roadmap-types';
import { validateRoadmap } from './roadmap-validator';
import {
  fromRoadmapVersionColumns,
  toRoadmapVersionColumns,
} from './roadmap-storage-mapper';

/** roadmap_versions 테이블의 공통 select 컬럼 (legacy 이름 유지; Step 12에서 변경 예정) */
const ROADMAP_VERSION_COLUMNS =
  'id, project_id, version_number, status, consultant_profile_snapshot, diagnosis_summary, roadmap_matrix, pbl_course, courses, free_tool_validated, time_limit_validated, revision_prompt, is_shared, like_count, created_by, finalized_by, finalized_at, created_at, updated_at';

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
  actorUserId: string,
): Promise<void> {
  const supabase = createAdminClient();

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

/** 로드맵 버전 목록 조회 (raw row 반환; 호출자에서 fromRoadmapVersionColumns로 변환) */
export async function fetchRoadmapVersions(projectId: string) {
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from('roadmap_versions')
    .select(ROADMAP_VERSION_COLUMNS)
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  return versions || [];
}

/** 특정 로드맵 버전 조회 (raw row 반환) */
export async function fetchRoadmapVersion(roadmapId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('roadmap_versions')
    .select(ROADMAP_VERSION_COLUMNS)
    .eq('id', roadmapId)
    .single();

  return data;
}

/** projects JOIN 포함 로드맵 조회 결과 타입 (legacy 컬럼은 unknown으로 두고 매퍼로 변환) */
interface RoadmapWithProject {
  id: string;
  project_id: string;
  version_number: number;
  status: string;
  consultant_profile_snapshot: unknown;
  diagnosis_summary: string | null;
  roadmap_matrix: unknown;
  pbl_course: unknown;
  courses: unknown;
  free_tool_validated: boolean;
  time_limit_validated: boolean;
  revision_prompt: string | null;
  is_shared: boolean;
  like_count: number;
  created_by: string;
  finalized_by: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  projects: { assigned_consultant_id: string };
}

/**
 * 로드맵 수동 편집 (산인공 4섹션 부분 업데이트).
 * DRAFT 상태의 로드맵만 편집 가능.
 * 배정된 컨설턴트만 편집 가능.
 */
export async function updateRoadmapManually(
  roadmapId: string,
  actorUserId: string,
  updates: {
    diagnosis_summary?: string;
    competencies?: RoadmapCompetency[];
    training_structure?: RoadmapTrainingStructureItem[];
    annual_plan?: RoadmapAnnualPlan;
    course_specs?: RoadmapCourseSpec[];
  },
): Promise<{ success: boolean; validation: ValidationResult; error?: string }> {
  const supabase = createAdminClient();

  const emptyValidation: ValidationResult = { isValid: false, errors: [], warnings: [] };

  // 현재 로드맵 조회
  const { data: roadmap, error: fetchError } = await supabase
    .from('roadmap_versions')
    .select(`${ROADMAP_VERSION_COLUMNS}, projects!inner(assigned_consultant_id)`)
    .eq('id', roadmapId)
    .returns<RoadmapWithProject[]>()
    .single();

  if (fetchError || !roadmap) {
    return {
      success: false,
      validation: emptyValidation,
      error: '로드맵을 찾을 수 없습니다.',
    };
  }

  if (roadmap.status !== 'DRAFT') {
    return {
      success: false,
      validation: emptyValidation,
      error: 'DRAFT 상태의 로드맵만 편집할 수 있습니다.',
    };
  }

  if (roadmap.projects.assigned_consultant_id !== actorUserId) {
    return {
      success: false,
      validation: emptyValidation,
      error: '배정된 컨설턴트만 로드맵을 편집할 수 있습니다.',
    };
  }

  // 기존 데이터 복원 → updates 적용 → 신규 RoadmapResult 구성
  const current = fromRoadmapVersionColumns(roadmap);
  const merged: RoadmapResult = {
    diagnosis_summary: updates.diagnosis_summary ?? current.diagnosis_summary,
    competencies: updates.competencies ?? current.competencies,
    training_structure: updates.training_structure ?? current.training_structure,
    annual_plan: updates.annual_plan ?? current.annual_plan,
    course_specs: updates.course_specs ?? current.course_specs,
  };

  // 검증 실행
  const validation = validateRoadmap(merged);

  // DB 업데이트 (legacy 컬럼 매핑)
  const cols = toRoadmapVersionColumns(merged);
  const { error: updateError } = await supabase
    .from('roadmap_versions')
    .update({
      diagnosis_summary: cols.diagnosis_summary,
      roadmap_matrix: cols.roadmap_matrix,
      pbl_course: cols.pbl_course,
      courses: cols.courses,
      // legacy 플래그: Step 12에서 제거 예정. 현재는 true 고정.
      free_tool_validated: true,
      time_limit_validated: true,
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

// ─── 매퍼 재-export (CRUD 호출부가 raw row를 신규 구조로 변환하도록) ────
export { fromRoadmapVersionColumns, toRoadmapVersionColumns } from './roadmap-storage-mapper';
