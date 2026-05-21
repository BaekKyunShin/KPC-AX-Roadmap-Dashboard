'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, requireAuthWithRole, requireConsultantProjectAccess } from '@/lib/actions/auth-helpers';
import {
  roadmapInterviewSchema,
  roadmapInterviewAutoSaveSchema,
  RoadmapInterviewStrictSchema,
  RoadmapInterviewAutoSaveSchema,
  type RoadmapInterviewInput,
  type RoadmapInterviewAutoSaveInput,
  type RoadmapInterviewStrict,
  type SttInsights,
  type HrdReportAttachment,
} from '@/lib/schemas/interview-roadmap';
import { extractTextFromAttachment } from '@/lib/services/file-parser';
import {
  PBLInterviewStrictSchema,
  PBLInterviewAutoSaveSchema,
  type PBLInterviewStrict,
} from '@/lib/schemas/interview-pbl';
import {
  mapRoadmapInterviewToDb,
  mapDbToRoadmapInterview,
  mapPBLInterviewToDb,
  mapDbToPBLInterview,
} from '@/lib/services/interview/converters';
import { createAuditLog } from '@/lib/services/audit';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { createNotificationForAdmins } from '@/lib/services/notification';
import { extractInsightsFromStt, validateSttTextSize } from '@/lib/services/stt';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { validateStatusTransition } from '@/lib/constants/status';
import { deepMerge } from '@/lib/utils/deep-merge';
import { after } from 'next/server';

import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { ProjectStatus, ProjectTrack } from '@/types/database';

// ============================================================================
// 공통 헬퍼 함수
// ============================================================================

/**
 * 프로젝트에 배정된 컨설턴트인지 확인
 * @returns 인증된 사용자 정보 또는 에러
 */
async function verifyProjectAccess(
  projectId: string,
): Promise<{ user: { id: string } } | { error: string }> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 접근 가능합니다.',
  });
  if ('error' in auth) return auth;

  const accessCheck = await requireConsultantProjectAccess(
    auth.supabase, auth.user.id, projectId,
    '해당 프로젝트에 대한 접근 권한이 없습니다.',
  );
  if (accessCheck !== true) return accessCheck;

  return { user: { id: auth.user.id } };
}

// ============================================================================
// 산인공 로드맵 인터뷰 저장 (OFA-05)
// ----------------------------------------------------------------------------
// 기존 interviews 테이블 컬럼(company_details, job_tasks, improvement_goals 등)을
// 애플리케이션 레이어 매핑으로 재사용. 본 Step에서 DB 마이그레이션은 추가하지 않음.
// 분리 전용 컬럼(roadmap_data JSONB)은 Step 12에서 도입 검토.
// ============================================================================

function mapRoadmapToLegacyColumns(
  data: RoadmapInterviewInput | RoadmapInterviewAutoSaveInput,
): {
  interview_date: string | null;
  interview_round: number;
  interview_time: string | null;
  participants: unknown;
  company_details: unknown;
  job_tasks: unknown;
  pain_points: unknown;
  constraints: unknown;
  improvement_goals: unknown;
  notes: string;
  customer_requirements: string;
  stt_insights: unknown;
} {
  const cr = data.company_requirements ?? {
    company_status: '',
    main_problems: '',
    push_willingness: '',
    expected_outcomes: '',
  };
  const tasks = data.task_workflow_items ?? [];
  const targets = data.training_targets ?? [];
  const an = data.analysis_notes ?? { text: '', attachment_files: [] };

  // ISSUE-10 Step C-2: 시작/종료 시간 정식 저장.
  //   - company_details.roadmap_interview_time JSONB { start, end } 가 정식 경로
  //   - 단일 `interview_time` 컬럼은 시작 시간만 legacy 호환용으로 함께 저장
  //     (mapInterviewRow 의 3순위 fallback + 외부 SQL/리포트 호환)
  const startTime = (data as { interview_start_time?: string }).interview_start_time ?? '';
  const endTime = (data as { interview_end_time?: string }).interview_end_time ?? '';

  return {
    interview_date: data.interview_date ?? null,
    interview_round: data.interview_round ?? 1,
    interview_time: startTime || null,
    participants: data.participants ?? [],
    company_details: {
      ai_experience: cr.company_status ?? '',
      systems_and_tools: [],
      // 신규 4필드 + 수행 방법 + 분석 노트를 병행 저장해 Step 12 이전에도 원본 복구 가능
      roadmap_company_requirements: cr,
      roadmap_interview_method: data.interview_method ?? 'ONSITE',
      roadmap_analysis_notes: an,
      // Ⅰ장 개요 (OFA-06.5 신규 — HRD이음 첨부 메타 포함)
      roadmap_overview: data.overview ?? null,
      // Ⅲ-1 역량 모델링 + NCS 활용 (ISSUE-04, 2026-04-21 신규)
      roadmap_competency_models: data.competency_models ?? [],
      roadmap_ncs_usage: data.ncs_usage ?? null,
      // ISSUE-10 Step C-2: 시작/종료 시간 JSONB
      roadmap_interview_time: { start: startTime, end: endTime },
    },
    job_tasks: tasks.map((t) => ({
      id: t.id,
      task_name: t.task_name,
      task_description: t.as_is,
      roadmap_job: t.job,
      roadmap_problems: t.problems,
      roadmap_data_availability: t.data_availability,
      roadmap_ai_necessity: t.ai_necessity,
    })),
    pain_points: tasks.map((t) => ({
      id: t.id,
      description: t.problems ?? '',
      severity: 'MEDIUM' as const,
    })),
    constraints: [],
    improvement_goals: targets.map((g) => ({
      id: g.id,
      goal_description: g.selection_reason,
      kpi: g.task_name,
      roadmap_as_is: g.as_is,
      roadmap_to_be: g.to_be,
    })),
    notes: data.notes ?? '',
    customer_requirements: cr.expected_outcomes ?? '',
    stt_insights: data.stt_insights ?? null,
  };
}

/**
 * 로드맵 트랙 전용 인터뷰 저장 (OFA-05 산인공 양식)
 *
 * 5단계 패턴: 인증 → 역할 → track 가드 → Zod → admin client 저장 → 상태 전이
 */
export async function saveRoadmapInterview(
  projectId: string,
  data: RoadmapInterviewInput | RoadmapInterviewAutoSaveInput,
  options?: { autoSave?: boolean },
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 인터뷰를 입력할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const { data: projectData } = await supabase
      .from('projects')
      .select('id, status, track, assigned_consultant_id, company_name, is_test_mode')
      .eq('id', projectId)
      .eq('assigned_consultant_id', user.id)
      .single();

    if (!projectData) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }
    if (projectData.track !== 'ROADMAP') {
      return { success: false, error: 'PBL 트랙 프로젝트는 PBL 인터뷰 화면을 사용해야 합니다.' };
    }

    const schema = options?.autoSave ? roadmapInterviewAutoSaveSchema : roadmapInterviewSchema;
    const validation = schema.safeParse(data);
    if (!validation.success) {
      // #001 — 모든 zod 에러를 join 해 사용자가 비어있는 필드를 한 번에 파악할 수 있게 한다.
      // 클라이언트 측 RoadmapInterviewClient.tsx 의 동일 패턴과 일관성 유지.
      const messages = validation.error.errors
        .map((e) => e.message)
        .filter((m) => Boolean(m?.trim()))
        .slice(0, 5);
      return {
        success: false,
        error: messages.length > 0 ? messages.join('\n') : '필수 입력 항목을 확인해주세요.',
      };
    }
    const validated = validation.data;

    const adminSupabase = createAdminClient();

    const { data: existing, error: fetchError } = await adminSupabase
      .from('interviews')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('[saveRoadmapInterview] Fetch:', fetchError.message);
      return { success: false, error: '기존 인터뷰 확인에 실패했습니다.' };
    }

    const legacyColumns = mapRoadmapToLegacyColumns(validated);
    const row = {
      project_id: projectId,
      interviewer_id: user.id,
      ...legacyColumns,
    };

    let auditAction: 'INTERVIEW_CREATE' | 'INTERVIEW_UPDATE';

    if (existing) {
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(row)
        .eq('id', existing.id);
      if (updateError) {
        console.error('[saveRoadmapInterview] Update:', updateError.message);
        return { success: false, error: '인터뷰 수정에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_UPDATE';
    } else {
      const { error: insertError } = await adminSupabase.from('interviews').insert(row);
      if (insertError) {
        console.error('[saveRoadmapInterview] Insert:', insertError.message);
        return { success: false, error: '인터뷰 저장에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_CREATE';
    }

    let statusTransitioned = false;
    if (!options?.autoSave && validateStatusTransition(projectData.status, 'INTERVIEWED')) {
      await adminSupabase
        .from('projects')
        .update({ status: 'INTERVIEWED' })
        .eq('id', projectId);
      statusTransitioned = true;
    }

    after(async () => {
      if (statusTransitioned && !projectData.is_test_mode) {
        await createNotificationForAdmins({
          type: 'interview_complete',
          title: '인터뷰 완료',
          message: `${projectData.company_name || '(알 수 없는 기업)'} 프로젝트 인터뷰가 완료되었습니다.`,
          link: `/ops/projects/${projectId}`,
        });
      }

      await createAuditLog({
        actorUserId: user.id,
        action: auditAction,
        targetType: 'interview',
        targetId: projectId,
        meta: {
          track: 'ROADMAP',
          task_items_count: validated.task_workflow_items?.length ?? 0,
          training_targets_count: validated.training_targets?.length ?? 0,
        },
      });

      if (!options?.autoSave) {
        const logContent = auditAction === 'INTERVIEW_CREATE'
          ? '인터뷰가 저장되었습니다.'
          : '인터뷰가 수정되었습니다.';
        await insertSystemActivityLog(projectId, user.id, logContent);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[saveRoadmapInterview Error]', error);
    return { success: false, error: '인터뷰 저장 중 오류가 발생했습니다.' };
  }
}

// ============================================================================
// HRD이음 진단 보고서 첨부 (산인공 양식 1번 Ⅱ-1)
// ============================================================================

const HRD_ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.hancom.hwpx',
  'application/x-hwp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const HRD_MAX_BYTES = 20 * 1024 * 1024; // 20MB
const HRD_BUCKET = 'interview-attachments';

export interface HrdReportUploadResult {
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

/** HRD이음 진단 보고서 업로드 (Storage 'interview-attachments' 버킷) */
export async function uploadHrdReportAttachment(
  projectId: string,
  formData: FormData,
): Promise<ActionResult<HrdReportUploadResult>> {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { success: false, error: '파일이 첨부되지 않았습니다.' };
    }

    if (file.size === 0) {
      return { success: false, error: '빈 파일은 업로드할 수 없습니다.' };
    }
    if (file.size > HRD_MAX_BYTES) {
      return { success: false, error: '파일 크기는 최대 20MB까지 허용됩니다.' };
    }
    const mimeType = file.type || 'application/octet-stream';
    if (!HRD_ALLOWED_MIMES.has(mimeType)) {
      return { success: false, error: `허용되지 않은 파일 형식입니다 (${mimeType}).` };
    }

    const supabase = createAdminClient();

    // 경로: <project_id>/hrd-<random>.<ext>  (project_id가 첫 segment여야 RLS 통과)
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = ext ? `.${ext}` : '';
    const random = crypto.randomUUID();
    const storagePath = `${projectId}/hrd-${random}${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(HRD_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadHrdReportAttachment] upload error:', uploadError);
      return { success: false, error: `업로드 실패: ${uploadError.message}` };
    }

    return {
      success: true,
      data: {
        storage_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[uploadHrdReportAttachment Error]', error);
    return { success: false, error: '서버 오류로 업로드에 실패했습니다.' };
  }
}

/** HRD이음 첨부 삭제 + signed URL 생성을 위한 헬퍼 */
export async function removeHrdReportAttachment(
  projectId: string,
  storagePath: string,
): Promise<SimpleActionResult> {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };

    // 안전: 경로가 해당 projectId로 시작해야 함
    if (!storagePath.startsWith(`${projectId}/`)) {
      return { success: false, error: '잘못된 파일 경로입니다.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(HRD_BUCKET).remove([storagePath]);
    if (error) {
      console.error('[removeHrdReportAttachment] remove error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[removeHrdReportAttachment Error]', error);
    return { success: false, error: '서버 오류로 삭제에 실패했습니다.' };
  }
}

// ============================================================================
// 인터뷰 분석 노트 첨부 (Step B-2 — ISSUE-14)
// ----------------------------------------------------------------------------
// `analysis_notes.attachment_files[]` 용 범용 첨부. file-parser 모듈로 업로드 직후
// 동기 본문 추출까지 수행해 LLM 프롬프트에 직접 포함시킨다.
//
// HRD 전용 함수(uploadHrdReportAttachment)와 분리한 이유:
//   - HRD 첨부는 단일 슬롯·신뢰성 높은 양식
//   - 분석 노트는 다중 첨부·다양한 포맷·LLM 본문 활용이 핵심 가치
// 두 함수는 동일한 'interview-attachments' Storage 버킷을 공유한다.
// ============================================================================

const INTERVIEW_ATTACHMENT_ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);
const INTERVIEW_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const INTERVIEW_ATTACHMENT_BUCKET = 'interview-attachments';

/**
 * 인터뷰 첨부 업로드 — 로드맵/PBL 공통.
 *
 * 사용처:
 *   - 로드맵 Ⅱ-1 HRD4U 진단 보고서 (`overview.hrd_report_attachment`)
 *   - 로드맵 Ⅱ-3 분석 노트 (`analysis_notes.attachment_files[]`)
 *   - PBL Ⅱ-3-가 HRD이음컨설팅 결과 (`hrdNecessity.hrd_report_attachment`) — ISSUE-14 PBL 확장
 *
 * 5단계 패턴:
 *   1) 인증·역할 (CONSULTANT_APPROVED)
 *   2) 컨설턴트 배정 검증 — track 무관 (assigned_consultant_id === user.id)
 *   3) 입력 검증 (file 존재·MIME 화이트리스트·size 가드)
 *   4) Storage 업로드 → 파싱 (file-parser 디스패처) → 메타 객체 생성
 *   5) ActionResult<HrdReportAttachment> 반환 (extracted_text or parse_error 포함)
 */
export async function uploadInterviewAttachment(
  projectId: string,
  formData: FormData,
): Promise<ActionResult<HrdReportAttachment>> {
  try {
    // (1) 인증·역할
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 첨부 파일을 업로드할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };

    // (2) 배정 검증 (로드맵·PBL 양 트랙 공통 — 프로젝트 단위 배정만 확인)
    const accessCheck = await requireConsultantProjectAccess(
      auth.supabase,
      auth.user.id,
      projectId,
      '해당 프로젝트에 대한 접근 권한이 없습니다.',
    );
    if (accessCheck !== true) return { success: false, error: accessCheck.error };

    // (3) 입력 검증
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { success: false, error: '파일이 첨부되지 않았습니다.' };
    }
    if (file.size === 0) {
      return { success: false, error: '빈 파일은 업로드할 수 없습니다.' };
    }
    if (file.size > INTERVIEW_ATTACHMENT_MAX_BYTES) {
      return { success: false, error: '파일 크기는 최대 10MB까지 허용됩니다.' };
    }
    const mimeType = file.type || 'application/octet-stream';
    if (!INTERVIEW_ATTACHMENT_ALLOWED_MIMES.has(mimeType)) {
      return {
        success: false,
        error: `허용되지 않은 파일 형식입니다 (${mimeType}). PDF/DOCX/PPTX/XLSX/PNG/JPG 만 가능합니다.`,
      };
    }

    // (4) Storage 업로드 + 동기 파싱
    const supabase = createAdminClient();

    // 안전 파일명: 한글 보존을 위해 file_name 은 원본을 메타에 보관하고,
    // storage path 는 UUID + 확장자만 사용한다.
    const ext = (file.name.split('.').pop() ?? 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const safeExt = ext ? `.${ext}` : '';
    const random = crypto.randomUUID();
    const storagePath = `${projectId}/note-${random}${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(INTERVIEW_ATTACHMENT_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error('[uploadInterviewAttachment] upload error:', uploadError);
      return { success: false, error: `업로드 실패: ${uploadError.message}` };
    }

    // 파싱은 file-parser 디스패처가 throw 없이 격리된 결과를 반환한다.
    const parsed = await extractTextFromAttachment(buffer, mimeType);

    // (5) 결과 반환 — extracted_text / parse_error 둘 중 하나만 채워진다.
    const attachment: HrdReportAttachment = {
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      ...(parsed.text != null ? { extracted_text: parsed.text } : {}),
      ...(parsed.parseError ? { parse_error: parsed.parseError } : {}),
    };

    return { success: true, data: attachment };
  } catch (error) {
    console.error('[uploadInterviewAttachment Error]', error);
    return { success: false, error: '서버 오류로 업로드에 실패했습니다.' };
  }
}

/** 인터뷰 첨부 삭제 — 컨설턴트 배정 검증 + 경로 가드 */
export async function removeInterviewAttachment(
  projectId: string,
  storagePath: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 첨부 파일을 삭제할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };

    const accessCheck = await requireConsultantProjectAccess(
      auth.supabase,
      auth.user.id,
      projectId,
      '해당 프로젝트에 대한 접근 권한이 없습니다.',
    );
    if (accessCheck !== true) return { success: false, error: accessCheck.error };

    if (!storagePath.startsWith(`${projectId}/`)) {
      return { success: false, error: '잘못된 파일 경로입니다.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(INTERVIEW_ATTACHMENT_BUCKET)
      .remove([storagePath]);
    if (error) {
      console.error('[removeInterviewAttachment] remove error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[removeInterviewAttachment Error]', error);
    return { success: false, error: '서버 오류로 삭제에 실패했습니다.' };
  }
}

/** HRD이음 첨부의 1시간 짜리 signed URL 발급 (다운로드/미리보기용) */
export async function createHrdReportSignedUrl(
  projectId: string,
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await requireAuthWithRole(
      ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'],
      { roleError: '첨부 파일 조회 권한이 없습니다.' },
    );
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, role, supabase: serverSupabase } = auth;

    if (!storagePath.startsWith(`${projectId}/`)) {
      return { success: false, error: '잘못된 파일 경로입니다.' };
    }

    if (role === 'CONSULTANT_APPROVED') {
      const accessCheck = await requireConsultantProjectAccess(
        serverSupabase,
        user.id,
        projectId,
        '해당 프로젝트의 첨부 파일 접근 권한이 없습니다.',
      );
      if (accessCheck !== true) return { success: false, error: accessCheck.error };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(HRD_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error || !data) {
      return { success: false, error: error?.message || 'URL 생성 실패' };
    }
    return { success: true, data: { url: data.signedUrl } };
  } catch (error) {
    console.error('[createHrdReportSignedUrl Error]', error);
    return { success: false, error: '서버 오류로 URL 생성에 실패했습니다.' };
  }
}

// ============================================================================
// PBL 인터뷰 저장/조회 (OFA-08)
// ----------------------------------------------------------------------------
// Step 2 마이그 063에서 추가된 `interviews.pbl_data JSONB` 컬럼을 사용한다.
// 로드맵 트랙 컬럼(company_details·job_tasks·improvement_goals 등)은 건드리지 않는다.
// ============================================================================

/**
 * PBL 인터뷰 조회 — 컨설턴트 전용 (배정된 프로젝트에 한함)
 */
export async function fetchPBLInterview(
  projectId: string,
): Promise<{ pbl_data: Record<string, unknown> } | null> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase } = auth;

    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id, track')
      .eq('id', projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return null;
    }
    if (projectData.track !== 'PBL') return null;

    const { data: interview } = await supabase
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!interview) return { pbl_data: {} };
    return { pbl_data: (interview.pbl_data as Record<string, unknown> | null) ?? {} };
  } catch {
    return null;
  }
}

export async function fetchInterview(projectId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase } = auth;

    // 배정된 컨설턴트만 조회 가능
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return null;
    }

    const { data: interview } = await supabase
      .from('interviews')
      .select('id, project_id, interview_date, interview_round, interview_time, participants, company_details, job_tasks, pain_points, constraints, improvement_goals, notes, customer_requirements, stt_insights')
      .eq('project_id', projectId)
      .single();

    return interview;
  } catch {
    return null;
  }
}

// ============================================================================
// STT 인사이트 처리
// ============================================================================

/**
 * STT 파일 처리 및 인사이트 추출
 */
export async function processSttFile(
  projectId: string,
  sttText: string
): Promise<ActionResult<SttInsights>> {
  try {
    // 권한 확인
    const authResult = await verifyProjectAccess(projectId);
    if ('error' in authResult) {
      return { success: false, error: authResult.error };
    }

    // 파일 크기 검증
    const sizeValidation = validateSttTextSize(sttText);
    if (!sizeValidation.valid) {
      return { success: false, error: sizeValidation.error };
    }

    // LLM으로 인사이트 추출
    const insights = await extractInsightsFromStt(sttText);

    // DB에 저장
    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('interviews')
      .update({ stt_insights: insights })
      .eq('project_id', projectId);

    if (updateError) {
      return { success: false, error: 'STT 인사이트 저장에 실패했습니다.' };
    }

    // 감사로그는 응답 블로킹 불필요 → after()로 비동기 실행
    after(async () => {
      await createAuditLog({
        actorUserId: authResult.user.id,
        action: 'INTERVIEW_UPDATE',
        targetType: 'interview',
        targetId: projectId,
        meta: {
          stt_processed: true,
          stt_text_length: sttText.length,
          insights_extracted: Object.keys(insights).length,
        },
      });
    });

    return { success: true, data: insights };
  } catch (error) {
    console.error('[processSttFile Error]', error);
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  }
}

/**
 * STT 인사이트 추출 전용 (ISSUE-16, Step C-4)
 *
 * `processSttFile` 와 달리 DB 저장은 하지 않고 LLM 추출 결과만 반환한다.
 * 호출 측(StepSttUpload)이 setter 로 폼 state 에 반영하면 자동저장
 * (`useInterviewAutoSave`)이 stt_insights 필드를 영속화한다.
 *
 * 5단계 패턴:
 *   1) 인증/역할 검증 (verifyProjectAccess)
 *   2) 컨설턴트 프로젝트 배정 검증 (verifyProjectAccess 내부)
 *   3) 입력 검증 (길이 + STT 사이즈)
 *   4) 비즈니스 로직 (extractInsightsFromStt)
 *   5) ActionResult 반환
 */
export async function extractSttInsights(
  projectId: string,
  sttText: string,
): Promise<ActionResult<SttInsights>> {
  try {
    const authResult = await verifyProjectAccess(projectId);
    if ('error' in authResult) {
      return { success: false, error: authResult.error };
    }

    const text = (sttText ?? '').trim();
    if (text.length < 10) {
      return { success: false, error: 'STT 텍스트가 너무 짧습니다 (10자 이상).' };
    }

    const sizeValidation = validateSttTextSize(text);
    if (!sizeValidation.valid) {
      return { success: false, error: sizeValidation.error };
    }

    const insights = await extractInsightsFromStt(text);
    return { success: true, data: insights };
  } catch (error) {
    console.error('[extractSttInsights Error]', error);
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  }
}

/**
 * STT 인사이트 삭제
 */
export async function deleteSttInsights(projectId: string): Promise<SimpleActionResult> {
  try {
    // 권한 확인
    const authResult = await verifyProjectAccess(projectId);
    if ('error' in authResult) {
      return { success: false, error: authResult.error };
    }

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('interviews')
      .update({ stt_insights: null })
      .eq('project_id', projectId);

    if (updateError) {
      return { success: false, error: 'STT 인사이트 삭제에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteSttInsights Error]', error);
    return { success: false, error: 'STT 인사이트 삭제 중 오류가 발생했습니다.' };
  }
}

// ============================================================================
// PR #2 Task 2.7-b — 신규 camelCase Zod 스키마 수용 Server Action
// ----------------------------------------------------------------------------
// Task 2.1 (로드맵) · Task 2.2 (PBL) 에서 양식 1:1 정합 camelCase 스키마가 새로
// 추가됨. 본 Action 들은 신규 스키마를 직접 수용하고, DB 경계에서
// `src/lib/services/interview/converters.ts` 를 거쳐 snake_case JSONB 로 저장/복원한다.
//
// 기존 snake_case Action 들(saveRoadmapInterview/savePBLInterview/fetchInterview/
// fetchPBLInterview)은 Client 이관(Task 2.3-a~d, Task 2.4) 이 끝날 때까지 병존
// 하며, Task 2.11 cleanup 에서 제거 예정.
//
// 5단계 패턴 엄수 (check-server-action):
//   1) 인증 (verifyProjectAccess — requireAuthWithRole 래퍼)
//   2) 역할 (CONSULTANT_APPROVED) + 프로젝트 배정 (verifyProjectAccess 내부 requireConsultantProjectAccess)
//      + track 가드 (별도 프로젝트 메타 조회)
//   3) Zod (자동저장=partial / 제출=StrictSchema — superRefine 포함)
//   4) 비즈니스 (converter → upsert → 상태 전이)
//   5) ActionResult 반환
// ============================================================================

/**
 * 인터뷰 Server Action 내부에서 필요한 프로젝트 메타(track/status/company_name/
 * is_test_mode) 를 조회하는 보조 함수. `verifyProjectAccess` 가 역할 + 배정을
 * 이미 검증했다는 전제하에 호출한다 (중복 검증 회피).
 */
async function fetchProjectMetaForInterview(
  projectId: string,
): Promise<
  | {
      id: string;
      status: ProjectStatus;
      track: ProjectTrack | null;
      company_name: string | null;
      is_test_mode: boolean | null;
    }
  | { error: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, status, track, company_name, is_test_mode')
    .eq('id', projectId)
    .single();
  if (error || !data) {
    return { error: '프로젝트 정보를 불러올 수 없습니다.' };
  }
  return {
    id: data.id,
    status: data.status as ProjectStatus,
    track: (data.track as ProjectTrack | null) ?? null,
    company_name: data.company_name ?? null,
    is_test_mode: data.is_test_mode ?? null,
  };
}

/**
 * 로드맵 인터뷰 저장 — camelCase 신규 스키마 (Task 2.1).
 *
 * options.autoSave=true  → `RoadmapInterviewAutoSaveSchema` 로 deep-loose 검증
 *                          (#011 fix — `.partial()` 의 shallow 한계로 인한
 *                           silent fail 차단; nested string 까지 모두 optional).
 * options.autoSave=false → `RoadmapInterviewStrictSchema` 로 NCS XOR 포함 엄격 검증
 */
export async function saveRoadmapInterviewV2(
  projectId: string,
  data: unknown,
  options?: { autoSave?: boolean },
): Promise<SimpleActionResult> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { user } = access;

    // (2-추가) track/status/company_name/is_test_mode 조회
    const projectData = await fetchProjectMetaForInterview(projectId);
    if ('error' in projectData) {
      return { success: false, error: projectData.error };
    }
    if (projectData.track !== 'ROADMAP') {
      return {
        success: false,
        error: 'PBL 트랙 프로젝트는 PBL 인터뷰 화면을 사용해야 합니다.',
      };
    }

    const schema = options?.autoSave
      ? RoadmapInterviewAutoSaveSchema
      : RoadmapInterviewStrictSchema;
    const validation = schema.safeParse(data);
    if (!validation.success) {
      // #001 — 모든 zod 에러를 join 해 사용자가 비어있는 필드를 한 번에 파악할 수 있게 한다.
      // 클라이언트 측 RoadmapInterviewClient.tsx 의 동일 패턴과 일관성 유지.
      const messages = validation.error.errors
        .map((e) => e.message)
        .filter((m) => Boolean(m?.trim()))
        .slice(0, 5);
      return {
        success: false,
        error: messages.length > 0 ? messages.join('\n') : '필수 입력 항목을 확인해주세요.',
      };
    }
    const validated = validation.data as Partial<RoadmapInterviewStrict>;

    const adminSupabase = createAdminClient();

    // (#4) 부분 머지를 위해 기존 jsonb 컬럼들도 함께 fetch.
    // 이전에는 id 만 select 했기 때문에 mapRoadmapInterviewToDb(validated) 가
    // 다른 필드를 빈 객체·빈 배열로 채워 update 시 lost update 가 발생했다.
    const { data: existing, error: fetchError } = await adminSupabase
      .from('interviews')
      .select('id, company_details, job_tasks, improvement_goals')
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('[saveRoadmapInterviewV2] Fetch:', fetchError.message);
      return { success: false, error: '기존 인터뷰 확인에 실패했습니다.' };
    }

    // (#4) 기존 row 가 있으면 camelCase 로 변환 후 부분 patch 와 깊이 머지.
    // 신규 row 면 validated 만 사용 (기존과 동일).
    const merged: Partial<RoadmapInterviewStrict> = existing
      ? deepMerge(mapDbToRoadmapInterview(existing), validated)
      : validated;
    const dbPayload = mapRoadmapInterviewToDb(merged);
    // 기존 로드맵 저장 Action 과 동일하게 interviewer_id 는 항상 기록한다.
    // interviews 테이블의 interview_date 는 NOT NULL 제약이 있어 INSERT 시
    // 반드시 값을 제공해야 한다 (DB 기본값이 없는 환경 호환). camelCase V2
    // 스키마엔 필드가 없으므로 오늘 날짜(YYYY-MM-DD)를 기본값으로 주입한다.
    const row = {
      project_id: projectId,
      interviewer_id: user.id,
      interview_date: new Date().toISOString().slice(0, 10),
      ...dbPayload,
    };

    let auditAction: 'INTERVIEW_CREATE' | 'INTERVIEW_UPDATE';

    if (existing) {
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(row)
        .eq('id', existing.id);
      if (updateError) {
        console.error('[saveRoadmapInterviewV2] Update:', updateError.message);
        return { success: false, error: '인터뷰 수정에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_UPDATE';
    } else {
      const { error: insertError } = await adminSupabase.from('interviews').insert(row);
      if (insertError) {
        console.error('[saveRoadmapInterviewV2] Insert:', insertError.message);
        return { success: false, error: '인터뷰 저장에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_CREATE';
    }

    let statusTransitioned = false;
    if (!options?.autoSave && validateStatusTransition(projectData.status, 'INTERVIEWED')) {
      await adminSupabase
        .from('projects')
        .update({ status: 'INTERVIEWED' })
        .eq('id', projectId);
      statusTransitioned = true;
    }

    after(async () => {
      if (statusTransitioned && !projectData.is_test_mode) {
        await createNotificationForAdmins({
          type: 'interview_complete',
          title: '인터뷰 완료',
          message: `${projectData.company_name || '(알 수 없는 기업)'} 프로젝트 인터뷰가 완료되었습니다.`,
          link: `/ops/projects/${projectId}`,
        });
      }

      await createAuditLog({
        actorUserId: user.id,
        action: auditAction,
        targetType: 'interview',
        targetId: projectId,
        meta: {
          track: 'ROADMAP',
          schema_version: 'v2_camelCase',
          auto_save: Boolean(options?.autoSave),
        },
      });

      if (!options?.autoSave) {
        const logContent =
          auditAction === 'INTERVIEW_CREATE'
            ? '인터뷰가 저장되었습니다.'
            : '인터뷰가 수정되었습니다.';
        await insertSystemActivityLog(projectId, user.id, logContent);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[saveRoadmapInterviewV2 Error]', error);
    return { success: false, error: '인터뷰 저장 중 오류가 발생했습니다.' };
  }
}

/**
 * 로드맵 인터뷰 제출 — camelCase 스키마 + strict 검증 (NCS XOR 포함).
 * `saveRoadmapInterviewV2(projectId, data, { autoSave: false })` 의 얇은 wrapper.
 */
export async function submitRoadmapInterviewV2(
  projectId: string,
  data: unknown,
): Promise<SimpleActionResult> {
  return saveRoadmapInterviewV2(projectId, data, { autoSave: false });
}

/**
 * 로드맵 인터뷰 조회 — DB snake_case row → camelCase Partial 반환.
 *
 * 컨설턴트 배정 프로젝트만 조회 가능. 조회 실패/미존재 시 null.
 */
export async function fetchRoadmapInterviewV2(
  projectId: string,
): Promise<Partial<RoadmapInterviewStrict> | null> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용. 실패 시 null (UI 조회는 조용히 실패).
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return null;

    // (2-추가) track 가드
    const projectData = await fetchProjectMetaForInterview(projectId);
    if ('error' in projectData) return null;
    if (projectData.track !== 'ROADMAP') return null;

    // interview_date 는 DB 기본값(CURRENT_DATE) 으로만 기록되며 camelCase 스키마
    // 에는 해당 필드가 없으므로(`performanceActivities[].date` 에 포함) select 제외.
    const supabase = createAdminClient();
    const { data: interview } = await supabase
      .from('interviews')
      .select('company_details, job_tasks, improvement_goals, stt_insights')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!interview) return {};
    return mapDbToRoadmapInterview(interview);
  } catch {
    return null;
  }
}

/**
 * PBL 인터뷰 저장 — camelCase 신규 스키마 (Task 2.2).
 *
 * DB 는 기존과 동일하게 `interviews.pbl_data` JSONB 에 통째로 저장하되,
 * 신규 camelCase 구조를 그대로 보존한다 (기존 snake_case pbl_data 와 키 충돌 없음).
 */
export async function savePBLInterviewV2(
  projectId: string,
  data: unknown,
  options?: { autoSave?: boolean },
): Promise<SimpleActionResult> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { user } = access;

    // (2-추가) track/status/company_name/is_test_mode 조회
    const projectData = await fetchProjectMetaForInterview(projectId);
    if ('error' in projectData) {
      return { success: false, error: projectData.error };
    }
    if (projectData.track !== 'PBL') {
      return {
        success: false,
        error: '로드맵 트랙 프로젝트는 로드맵 인터뷰 화면을 사용해야 합니다.',
      };
    }

    const schema = options?.autoSave
      ? PBLInterviewAutoSaveSchema
      : PBLInterviewStrictSchema;
    const validation = schema.safeParse(data);
    if (!validation.success) {
      // #001 — 모든 zod 에러를 join 해 사용자가 비어있는 필드를 한 번에 파악할 수 있게 한다.
      // 클라이언트 측 RoadmapInterviewClient.tsx 의 동일 패턴과 일관성 유지.
      const messages = validation.error.errors
        .map((e) => e.message)
        .filter((m) => Boolean(m?.trim()))
        .slice(0, 5);
      return {
        success: false,
        error: messages.length > 0 ? messages.join('\n') : '필수 입력 항목을 확인해주세요.',
      };
    }
    const validated = validation.data as Partial<PBLInterviewStrict>;

    const adminSupabase = createAdminClient();

    // (#4) 부분 머지를 위해 pbl_data 컬럼도 함께 fetch.
    const { data: existing, error: fetchError } = await adminSupabase
      .from('interviews')
      .select('id, pbl_data')
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('[savePBLInterviewV2] Fetch:', fetchError.message);
      return { success: false, error: '기존 인터뷰 확인에 실패했습니다.' };
    }

    // (#4) 기존 row 가 있으면 camelCase 로 변환 후 부분 patch 와 깊이 머지.
    const merged: Partial<PBLInterviewStrict> = existing
      ? deepMerge(mapDbToPBLInterview(existing), validated)
      : validated;
    const dbPayload = mapPBLInterviewToDb(merged);

    if (existing) {
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(dbPayload)
        .eq('id', existing.id);
      if (updateError) {
        console.error('[savePBLInterviewV2] Update:', updateError.message);
        return { success: false, error: 'PBL 인터뷰 수정에 실패했습니다.' };
      }
    } else {
      // interview_date NOT NULL 제약 호환 — camelCase V2 스키마엔 필드가 없으므로
      // 오늘 날짜(YYYY-MM-DD) 기본값 주입. Roadmap V2 Action 과 동일 패턴.
      const { error: insertError } = await adminSupabase.from('interviews').insert({
        project_id: projectId,
        interviewer_id: user.id,
        interview_date: new Date().toISOString().slice(0, 10),
        ...dbPayload,
      });
      if (insertError) {
        console.error('[savePBLInterviewV2] Insert:', insertError.message);
        return { success: false, error: 'PBL 인터뷰 저장에 실패했습니다.' };
      }
    }

    let statusTransitioned = false;
    if (!options?.autoSave && validateStatusTransition(projectData.status, 'INTERVIEWED')) {
      await adminSupabase
        .from('projects')
        .update({ status: 'INTERVIEWED' })
        .eq('id', projectId);
      statusTransitioned = true;
    }

    after(async () => {
      if (statusTransitioned && !projectData.is_test_mode) {
        await createNotificationForAdmins({
          type: 'interview_complete',
          title: 'PBL 인터뷰 완료',
          message: `${projectData.company_name || '(알 수 없는 기업)'} PBL 프로젝트 인터뷰가 완료되었습니다.`,
          link: `/ops/projects/${projectId}`,
        });
      }

      await createAuditLog({
        actorUserId: user.id,
        action: 'PBL_INTERVIEW_SAVED',
        targetType: 'interview',
        targetId: projectId,
        meta: {
          track: 'PBL',
          schema_version: 'v2_camelCase',
          auto_save: Boolean(options?.autoSave),
        },
      });

      if (!options?.autoSave) {
        await insertSystemActivityLog(
          projectId,
          user.id,
          'PBL 인터뷰가 저장되었습니다.',
        );
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[savePBLInterviewV2 Error]', error);
    return { success: false, error: 'PBL 인터뷰 저장 중 오류가 발생했습니다.' };
  }
}

/**
 * PBL 인터뷰 제출 — camelCase + strict 검증 (hrdReportPdf=null 일 때 courseNecessity 필수).
 */
export async function submitPBLInterviewV2(
  projectId: string,
  data: unknown,
): Promise<SimpleActionResult> {
  return savePBLInterviewV2(projectId, data, { autoSave: false });
}

/**
 * PBL 인터뷰 조회 — DB pbl_data JSONB → camelCase Partial 반환.
 */
export async function fetchPBLInterviewV2(
  projectId: string,
): Promise<Partial<PBLInterviewStrict> | null> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return null;

    // (2-추가) track 가드
    const projectData = await fetchProjectMetaForInterview(projectId);
    if ('error' in projectData) return null;
    if (projectData.track !== 'PBL') return null;

    const supabase = createAdminClient();
    const { data: interview } = await supabase
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!interview) return {};
    return mapDbToPBLInterview(interview as { pbl_data: Record<string, unknown> | null });
  } catch {
    return null;
  }
}
