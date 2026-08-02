import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import type { PBLContent } from './pbl-types';

// ============================================================================
// 상수 / 타입
// ============================================================================

/** pbl_reports 조회 공통 컬럼 */
export const PBL_REPORT_COLUMNS =
  'id, project_id, version_number, status, consultant_profile_snapshot, diagnosis_summary, pbl_content, free_tool_validated, time_limit_validated, revision_prompt, is_shared, like_count, created_by, finalized_by, finalized_at, created_at, updated_at';

export type PBLReportStatus = 'DRAFT' | 'FINAL' | 'ARCHIVED';

export interface PBLReportRow {
  id: string;
  project_id: string;
  version_number: number;
  status: PBLReportStatus;
  consultant_profile_snapshot: Record<string, unknown>;
  diagnosis_summary: string;
  pbl_content: PBLContent;
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
}

/** finalize_pbl RPC 반환 타입 (판별 유니온) */
type FinalizePBLRpcResult =
  | { success: true; project_id: string; version_number: number }
  | { success: false; error: string };

/** save_pbl_draft RPC 반환 타입 (판별 유니온) */
type SavePBLDraftRpcResult =
  | { success: true; report: PBLReportRow }
  | { success: false; error: string };

/**
 * PBL DRAFT 저장 + 상태 전이(원자적 RPC)가 실패해 **아무것도 저장되지 않은** 경우 throw.
 * 호출부(Server Action)가 재생성 안내를 그대로 사용자에게 전달한다.
 */
export class PBLPersistError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PBLPersistError';
  }
}

/** 저장 실패 시 사용자에게 노출하는 안내 (재생성 필요를 명시) */
export const PBL_PERSIST_FAILED_MESSAGE =
  'PBL 보고서 저장에 실패했습니다. 생성된 내용이 저장되지 않았으니 다시 생성해 주세요.';

// ============================================================================
// CRUD
// ============================================================================

/**
 * PBL DRAFT 버전 생성.
 *  - `consultant_profile_snapshot`: 작성 시점에 `consultant_profiles`에서 조회해 JSONB로 스냅샷.
 *  - `diagnosis_summary`: 인자로 받은 요약 저장.
 *  - `version_number`: MAX(version_number) + 1.
 *  - `transitionToStatus`: 전달하면 저장과 **같은 트랜잭션**에서 projects.status 를 전이한다
 *    (마이그 081 `save_pbl_draft`). null/미전달이면 상태를 건드리지 않는다.
 *    전이 가능 여부 판정은 호출부의 중앙 전이 규칙(validateStatusTransition)이 담당한다.
 */
export async function createDraftVersion(
  projectId: string,
  content: PBLContent,
  userId: string,
  diagnosisSummary: string,
  revisionPrompt: string | null,
  supabase?: SupabaseClient,
  transitionToStatus?: string | null
): Promise<PBLReportRow> {
  const client = supabase ?? createAdminClient();

  // 컨설턴트 프로필 스냅샷
  const { data: project } = await client
    .from('projects')
    .select('assigned_consultant_id')
    .eq('id', projectId)
    .single();
  let snapshot: Record<string, unknown> = {};
  if (project?.assigned_consultant_id) {
    const { data: profile } = await client
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', project.assigned_consultant_id)
      .single();
    if (profile) {
      snapshot = profile as Record<string, unknown>;
    }
  }

  // 다음 버전 번호
  const { data: latest } = await client
    .from('pbl_reports')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (latest?.version_number ?? 0) + 1;

  // 보고서 저장 + 상태 전이를 단일 트랜잭션으로 실행한다 (마이그 081).
  // 예전에는 INSERT 와 status UPDATE 가 분리돼 있었고, 심지어 서로 다른 admin
  // 클라이언트 인스턴스를 써서 "보고서는 저장됐는데 목록 상태는 그대로"인 desync 가 남았다.
  const { data, error } = await client.rpc('save_pbl_draft', {
    p_project_id: projectId,
    p_version_number: versionNumber,
    p_consultant_profile_snapshot: snapshot,
    p_diagnosis_summary: diagnosisSummary,
    p_pbl_content: content,
    p_revision_prompt: revisionPrompt,
    p_created_by: userId,
    p_transition_to_status: transitionToStatus ?? null,
  });

  const result = (data ?? null) as SavePBLDraftRpcResult | null;
  if (error || !result?.success) {
    const detail = error?.message ?? (result && !result.success ? result.error : 'unknown');
    console.error(`[createDraftVersion] PBL DRAFT 저장 실패 project=${projectId}:`, detail);
    throw new PBLPersistError(PBL_PERSIST_FAILED_MESSAGE);
  }

  return result.report;
}

/**
 * DRAFT 버전 수정.
 *  - DRAFT 상태일 때만 update (서비스 가드 + RLS 이중 방어).
 */
export async function updateDraft(
  pblId: string,
  patch: { pbl_content?: PBLContent; diagnosis_summary?: string; revision_prompt?: string | null },
  supabase?: SupabaseClient
): Promise<PBLReportRow> {
  const client = supabase ?? createAdminClient();

  // 상태 가드
  const { data: current, error: fetchError } = await client
    .from('pbl_reports')
    .select('id, status')
    .eq('id', pblId)
    .single();

  if (fetchError || !current) {
    throw new Error('PBL 보고서를 찾을 수 없습니다.');
  }
  if (current.status !== 'DRAFT') {
    throw new Error('DRAFT 상태의 PBL 보고서만 편집할 수 있습니다.');
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.pbl_content !== undefined) updatePayload.pbl_content = patch.pbl_content;
  if (patch.diagnosis_summary !== undefined)
    updatePayload.diagnosis_summary = patch.diagnosis_summary;
  if (patch.revision_prompt !== undefined) updatePayload.revision_prompt = patch.revision_prompt;

  const { data, error } = await client
    .from('pbl_reports')
    .update(updatePayload)
    .eq('id', pblId)
    .select(PBL_REPORT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`PBL DRAFT 수정 실패: ${error?.message ?? 'unknown'}`);
  }

  return data as PBLReportRow;
}

/**
 * PBL 보고서 최종 확정.
 *  RPC `finalize_pbl` 호출 (Step 2 마이그 061, `finalize_roadmap`과 동일 패턴):
 *   - 기존 FINAL → ARCHIVED
 *   - 현재 DRAFT → FINAL
 *   - projects.status → FINALIZED
 *   - 트랙·DRAFT·배정 검증 (RPC 내부)
 */
export async function finalizePBL(pblId: string, actorUserId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('finalize_pbl', {
    p_pbl_report_id: pblId,
    p_actor_user_id: actorUserId,
  });

  if (error || !data) {
    throw new Error('PBL 보고서 확정에 실패했습니다.');
  }

  const result = data as FinalizePBLRpcResult;
  if (!result.success) {
    throw new Error(result.error || 'PBL 보고서 확정에 실패했습니다.');
  }

  // 부수 효과
  try {
    await createAuditLog({
      actorUserId,
      action: 'PBL_REPORT_FINALIZED',
      targetType: 'pbl_report',
      targetId: pblId,
      meta: {
        project_id: result.project_id,
        version_number: result.version_number,
      },
    });
  } catch (e) {
    console.error('[finalizePBL] 감사로그 실패:', e);
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
        title: 'PBL 보고서 확정',
        message: `${projectInfo?.company_name ?? '(알 수 없는 기업)'} 프로젝트 PBL 보고서가 최종 확정되었습니다.`,
        link: `/ops/projects/${result.project_id}`,
      });
    }
  } catch (e) {
    console.error('[finalizePBL] 알림 발송 실패:', e);
  }
}

/** 최신 FINAL 버전 조회 */
export async function getLatestFinal(
  projectId: string,
  supabase?: SupabaseClient
): Promise<PBLReportRow | null> {
  const client = supabase ?? createAdminClient();
  const { data } = await client
    .from('pbl_reports')
    .select(PBL_REPORT_COLUMNS)
    .eq('project_id', projectId)
    .eq('status', 'FINAL')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PBLReportRow) ?? null;
}

/** 프로젝트의 모든 PBL 버전 이력 (DRAFT + FINAL + ARCHIVED) */
export async function listVersions(
  projectId: string,
  supabase?: SupabaseClient
): Promise<PBLReportRow[]> {
  const client = supabase ?? createAdminClient();
  const { data } = await client
    .from('pbl_reports')
    .select(PBL_REPORT_COLUMNS)
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  return (data as PBLReportRow[]) ?? [];
}

/** 특정 버전 조회 */
export async function getPBLReport(
  pblId: string,
  supabase?: SupabaseClient
): Promise<PBLReportRow | null> {
  const client = supabase ?? createAdminClient();
  const { data } = await client
    .from('pbl_reports')
    .select(PBL_REPORT_COLUMNS)
    .eq('id', pblId)
    .maybeSingle();

  return (data as PBLReportRow) ?? null;
}

/** DRAFT 삭제 (FINAL·ARCHIVED 는 금지) */
export async function deleteDraft(pblId: string, supabase?: SupabaseClient): Promise<void> {
  const client = supabase ?? createAdminClient();
  const { data: current } = await client
    .from('pbl_reports')
    .select('status')
    .eq('id', pblId)
    .single();

  if (!current) {
    throw new Error('PBL 보고서를 찾을 수 없습니다.');
  }
  if (current.status !== 'DRAFT') {
    throw new Error('DRAFT 상태의 PBL 보고서만 삭제할 수 있습니다.');
  }

  const { error } = await client.from('pbl_reports').delete().eq('id', pblId);
  if (error) {
    throw new Error(`PBL DRAFT 삭제 실패: ${error.message}`);
  }
}

/**
 * 갤러리 공유 토글 (FINAL 상태만 허용).
 */
export async function sharePBL(
  pblId: string,
  isShared: boolean,
  supabase?: SupabaseClient
): Promise<PBLReportRow> {
  const client = supabase ?? createAdminClient();

  const { data: current, error: fetchError } = await client
    .from('pbl_reports')
    .select('id, status')
    .eq('id', pblId)
    .single();

  if (fetchError || !current) {
    throw new Error('PBL 보고서를 찾을 수 없습니다.');
  }
  if (current.status !== 'FINAL') {
    throw new Error('FINAL 상태의 PBL 보고서만 갤러리 공유가 가능합니다.');
  }

  const { data, error } = await client
    .from('pbl_reports')
    .update({ is_shared: isShared, updated_at: new Date().toISOString() })
    .eq('id', pblId)
    .select(PBL_REPORT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`PBL 공유 토글 실패: ${error?.message ?? 'unknown'}`);
  }

  return data as PBLReportRow;
}
