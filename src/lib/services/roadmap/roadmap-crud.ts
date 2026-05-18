import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import type {
  RoadmapAnnualPlan,
  RoadmapCompetency,
  RoadmapCourseSpec,
  RoadmapOutcomeSummary,
  RoadmapResult,
  RoadmapTrainingStructureItem,
  ValidationResult,
} from './roadmap-types';
import { validateRoadmap } from './roadmap-validator';
import { sanitizeRoadmapResult } from './roadmap-sanitize';
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

  // 정책 이전 (2026-05-18): 확정 시점에 1회 sanitize.
  // DRAFT 편집 중에는 빈 행을 그대로 보존하므로, 여기서 정리 후 RPC 호출.
  // 조회 실패해도 RPC 는 정상 호출되도록 best-effort 처리.
  try {
    const { data: currentRow } = await supabase
      .from('roadmap_versions')
      .select(ROADMAP_VERSION_COLUMNS)
      .eq('id', roadmapId)
      .single();

    if (currentRow) {
      const current = fromRoadmapVersionColumns(
        currentRow as Parameters<typeof fromRoadmapVersionColumns>[0],
      );
      const sanitized = sanitizeRoadmapResult(current);
      const cols = toRoadmapVersionColumns(sanitized);
      await supabase
        .from('roadmap_versions')
        .update({
          diagnosis_summary: cols.diagnosis_summary,
          roadmap_matrix: cols.roadmap_matrix,
          pbl_course: cols.pbl_course,
          courses: cols.courses,
        })
        .eq('id', roadmapId);
    }
  } catch (e) {
    console.error('[finalizeRoadmap] 확정 전 sanitize 실패 (RPC 계속 진행):', e);
  }

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
    setup_necessity?: string;
    outcome_summary?: RoadmapOutcomeSummary;
    competencies?: RoadmapCompetency[];
    ncs_used?: boolean;
    ncs_methodology?: string;
    ncs_derivation_method?: string;
    training_structure?: RoadmapTrainingStructureItem[];
    training_structure_method?: string;
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

  // PR5 (R6 spec) — FINAL in-place 수정 허용. ARCHIVED 만 차단.
  // DRAFT 든 FINAL 든 동일 위치(version_number 변경 X, finalized_at 보존)에서 patch.
  // 변경 이력은 audit_logs (ROADMAP_RESULT_EDITED) 에만 누적.
  if (roadmap.status === 'ARCHIVED') {
    return {
      success: false,
      validation: emptyValidation,
      error: '아카이브된 로드맵은 편집할 수 없습니다.',
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
  const mergedRaw: RoadmapResult = {
    diagnosis_summary: updates.diagnosis_summary ?? current.diagnosis_summary,
    setup_necessity: updates.setup_necessity ?? current.setup_necessity,
    outcome_summary: updates.outcome_summary ?? current.outcome_summary,
    competencies: updates.competencies ?? current.competencies,
    ncs_used: updates.ncs_used ?? current.ncs_used,
    ncs_methodology: updates.ncs_methodology ?? current.ncs_methodology,
    ncs_derivation_method: updates.ncs_derivation_method ?? current.ncs_derivation_method,
    training_structure: updates.training_structure ?? current.training_structure,
    training_structure_method: updates.training_structure_method ?? current.training_structure_method,
    annual_plan: updates.annual_plan ?? current.annual_plan,
    course_specs: updates.course_specs ?? current.course_specs,
  };

  // 정책 이전 (2026-05-18): DRAFT 편집 중에는 빈 행을 sanitize 하지 않는다.
  // "행 추가" 직후 자동 정리되어 사용자가 입력할 행이 사라지는 문제 해결.
  // 빈 행 정리는 finalizeRoadmap / 내보내기 시점에 1회만 수행.
  const merged = mergedRaw;

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

  // 감사로그 (ROADMAP_RESULT_EDITED — PR5)
  // FINAL in-place 수정 추적이 핵심이므로 status 필드를 meta 에 포함.
  // diff 페이로드: 텍스트 ≤ 200자 원문 / 초과 시 preview 100자 + 길이.
  // 배열 (표 행): length 변화만 기록 (개인정보 영향 최소화).
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_RESULT_EDITED',
    targetType: 'roadmap',
    targetId: roadmapId,
    meta: {
      project_id: roadmap.project_id,
      version_id: roadmapId,
      version_number: roadmap.version_number,
      status: roadmap.status,
      fields_changed: Object.keys(updates),
      diff: buildEditDiff(current, merged, Object.keys(updates) as Array<keyof RoadmapResult>),
      validation_result: {
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      },
    },
  });

  return { success: true, validation };
}

// ---------------------------------------------------------------------------
// 감사로그 diff 빌더 (PR5)
// ---------------------------------------------------------------------------
// - 텍스트 필드 ≤ 200자: before/after 원문
// - 텍스트 필드 > 200자: { before_preview, after_preview, before_length, after_length }
// - 배열 필드 (표 행): { before_length, after_length } 만
// - 객체 필드: JSON 직렬화 후 길이 비교
// ---------------------------------------------------------------------------
const TEXT_PREVIEW_THRESHOLD = 200;
const TEXT_PREVIEW_LENGTH = 100;

function buildEditDiff(
  before: RoadmapResult,
  after: RoadmapResult,
  changedKeys: Array<keyof RoadmapResult>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  for (const key of changedKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];
    if (Array.isArray(beforeVal) || Array.isArray(afterVal)) {
      diff[key] = {
        before_length: Array.isArray(beforeVal) ? beforeVal.length : 0,
        after_length: Array.isArray(afterVal) ? afterVal.length : 0,
      };
      continue;
    }
    if (typeof beforeVal === 'string' || typeof afterVal === 'string') {
      const b = typeof beforeVal === 'string' ? beforeVal : '';
      const a = typeof afterVal === 'string' ? afterVal : '';
      if (b.length <= TEXT_PREVIEW_THRESHOLD && a.length <= TEXT_PREVIEW_THRESHOLD) {
        diff[key] = { before: b, after: a };
      } else {
        diff[key] = {
          before_preview: b.slice(0, TEXT_PREVIEW_LENGTH),
          after_preview: a.slice(0, TEXT_PREVIEW_LENGTH),
          before_length: b.length,
          after_length: a.length,
        };
      }
      continue;
    }
    if (typeof beforeVal === 'boolean' || typeof afterVal === 'boolean') {
      diff[key] = { before: beforeVal, after: afterVal };
      continue;
    }
    if (typeof beforeVal === 'object' || typeof afterVal === 'object') {
      const bJson = JSON.stringify(beforeVal ?? null);
      const aJson = JSON.stringify(afterVal ?? null);
      diff[key] = {
        before_length: bJson.length,
        after_length: aJson.length,
      };
      continue;
    }
    diff[key] = { before: beforeVal, after: afterVal };
  }
  return diff;
}

// ─── 매퍼 재-export (CRUD 호출부가 raw row를 신규 구조로 변환하도록) ────
export { fromRoadmapVersionColumns, toRoadmapVersionColumns } from './roadmap-storage-mapper';
