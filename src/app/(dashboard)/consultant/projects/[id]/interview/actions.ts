'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthWithRole, requireConsultantProjectAccess } from '@/lib/actions/auth-helpers';
import {
  RoadmapInterviewStrictSchema,
  RoadmapInterviewAutoSaveSchema,
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
import { checkAndRecordLLMUsage } from '@/lib/services/quota';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { validateStatusTransition } from '@/lib/constants/status';
import { deepMerge } from '@/lib/utils/deep-merge';
import { joinZodMessagesForToast } from '@/lib/utils/zod-error-format';
import { after } from 'next/server';

import type { ZodTypeAny } from 'zod';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { AuditAction, ProjectStatus, ProjectTrack } from '@/types/database';

// ============================================================================
// 공통 헬퍼 함수
// ============================================================================

/**
 * 프로젝트에 배정된 컨설턴트인지 확인
 *
 * mutation 게이트웨이 — 행정 종결 프로젝트는 기본 차단한다.
 * 열람(fetch) 경로만 { allowClosed: true }로 명시적으로 허용.
 * @returns 인증된 사용자 정보 또는 에러
 */
async function verifyProjectAccess(
  projectId: string,
  options?: { allowClosed?: boolean }
): Promise<{ user: { id: string } } | { error: string }> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 접근 가능합니다.',
  });
  if ('error' in auth) return auth;

  const accessCheck = await requireConsultantProjectAccess(
    auth.supabase,
    auth.user.id,
    projectId,
    '해당 프로젝트에 대한 접근 권한이 없습니다.',
    { blockClosed: !options?.allowClosed }
  );
  if (accessCheck !== true) return accessCheck;

  return { user: { id: auth.user.id } };
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
  formData: FormData
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
  storagePath: string
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
  formData: FormData
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
      { blockClosed: true }
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
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
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
  storagePath: string
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
      { blockClosed: true }
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
  storagePath: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'], {
      roleError: '첨부 파일 조회 권한이 없습니다.',
    });
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
        '해당 프로젝트의 첨부 파일 접근 권한이 없습니다.'
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

    // LLM 호출 쿼터 확인 — 확인과 동시에 사용량이 증가하므로 입력 검증 뒤에 둔다.
    const quotaCheck = await checkAndRecordLLMUsage(authResult.user.id);
    if (quotaCheck.exceeded) {
      return { success: false, error: quotaCheck.message || 'LLM 호출 한도를 초과했습니다.' };
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
  sttText: string
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

    // LLM 호출 쿼터 확인 — 확인과 동시에 사용량이 증가하므로 입력 검증 뒤에 둔다.
    const quotaCheck = await checkAndRecordLLMUsage(authResult.user.id);
    if (quotaCheck.exceeded) {
      return { success: false, error: quotaCheck.message || 'LLM 호출 한도를 초과했습니다.' };
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
// camelCase Zod 스키마 수용 Server Action (V2 — 유일한 저장/조회 경로)
// ----------------------------------------------------------------------------
// 양식 1:1 정합 camelCase 스키마를 직접 수용하고, DB 경계에서
// `src/lib/services/interview/converters.ts` 를 거쳐 snake_case JSONB 로 저장/복원한다.
// 기존 snake_case legacy Action 들(saveRoadmapInterview 등 4종)은 Client 이관
// 완료 후에도 남아 있다가 P8 정리에서 제거됐다.
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
async function fetchProjectMetaForInterview(projectId: string): Promise<
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

/** persistInterview 의 페이로드 빌더에 넘어가는 실행 컨텍스트 */
interface PersistPayloadContext {
  projectId: string;
  userId: string;
  /** 오늘 날짜 (YYYY-MM-DD) — interview_date 주입용 */
  today: string;
}

/**
 * 인터뷰 저장 공통 골격(persistInterview)의 트랙별 설정 (P8).
 * 문구·페이로드 구성은 추출 전 두 함수의 코드와 문자 단위로 동일해야 한다.
 */
interface PersistInterviewConfig<T extends object, D extends object> {
  /** 프로젝트 track 가드 + 감사로그 meta.track */
  track: ProjectTrack;
  /** track 불일치 시 사용자에게 반환할 문구 */
  trackMismatchError: string;
  /** options.autoSave 여부로 선택되는 Zod 스키마 쌍 */
  schemas: { strict: ZodTypeAny; autoSave: ZodTypeAny };
  /** (#4) 부분 머지를 위해 기존 row 에서 fetch 할 컬럼 (id 필수) */
  selectCols: string;
  /** DB row → camelCase (deepMerge 의 base) */
  mapFromDb: (row: unknown) => Partial<T>;
  /** camelCase → DB 컬럼 payload */
  mapToDb: (merged: Partial<T>) => D;
  /**
   * UPDATE 페이로드 — ⚠️ 두 트랙이 의도적으로 비대칭이다 (특성화 테스트로 고정):
   *   ROADMAP: 메타 3컬럼(project_id·interviewer_id·interview_date=오늘)을 매번
   *            재기록해 인터뷰 날짜가 "최종 수정일" 시맨틱으로 동작한다.
   *   PBL:     dbPayload(pbl_data) 단독 — 최초 입력일·작성자가 보존된다.
   * 이 차이를 통일하면 조용한 동작 변경이 된다 (P8 계획서 부록).
   */
  buildUpdatePayload: (dbPayload: D, ctx: PersistPayloadContext) => object;
  /**
   * INSERT 페이로드 — 두 트랙 모두 메타 3컬럼 포함.
   * (interview_date 는 마이그 069 이후 DB DEFAULT CURRENT_DATE 가 있어 명시
   *  주입이 필수는 아니지만, 저장 페이로드 구성을 바꾸지 않기 위해 유지한다.)
   */
  buildInsertPayload: (dbPayload: D, ctx: PersistPayloadContext) => object;
  /** 감사로그 action — ROADMAP 은 CREATE/UPDATE 분기, PBL 은 고정값 */
  resolveAuditAction: (isUpdate: boolean) => AuditAction;
  /** status 전이 성공 시 운영관리자 알림 문구 */
  notification: { title: string; buildMessage: (companyName: string) => string };
  /** 제출 시 활동로그 문구 — ROADMAP 은 저장/수정 분기, PBL 은 고정 */
  buildActivityLog: (isUpdate: boolean) => string;
  /** console.error prefix — '[saveRoadmapInterviewV2]' 형태 */
  logPrefix: string;
  /** 사용자 반환 에러 문구 */
  errorMessages: { update: string; insert: string };
}

/**
 * 인터뷰 저장 공통 골격 (P8) — saveRoadmapInterviewV2/savePBLInterviewV2 가
 * 복제하던 파이프라인을 추출한 것: 인증·배정 → track 가드 → Zod 검증 →
 * 기존 row fetch + deepMerge(#4 lost update 차단) → update/insert →
 * 상태 전이(P6 에러 검사) → after(알림·감사로그·활동로그).
 *
 * 트랙별 차이(페이로드 구성·audit action·문구)는 전부 cfg 로 주입받는다.
 * try/catch 는 두 wrapper 가 자기 문구로 감싸므로 여기서 잡지 않는다.
 */
async function persistInterview<T extends object, D extends object>(
  projectId: string,
  data: unknown,
  options: { autoSave?: boolean } | undefined,
  cfg: PersistInterviewConfig<T, D>
): Promise<SimpleActionResult> {
  // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용
  const access = await verifyProjectAccess(projectId);
  if ('error' in access) return { success: false, error: access.error };
  const { user } = access;

  // (2-추가) track/status/company_name/is_test_mode 조회
  const projectData = await fetchProjectMetaForInterview(projectId);
  if ('error' in projectData) {
    return { success: false, error: projectData.error };
  }
  if (projectData.track !== cfg.track) {
    return { success: false, error: cfg.trackMismatchError };
  }

  const schema = options?.autoSave ? cfg.schemas.autoSave : cfg.schemas.strict;
  const validation = schema.safeParse(data);
  if (!validation.success) {
    // #001 — 모든 zod 에러를 join 해 사용자가 비어있는 필드를 한 번에 파악할 수 있게 한다.
    // 클라이언트 측 RoadmapInterviewClient.tsx 의 동일 패턴과 일관성 유지.
    return { success: false, error: joinZodMessagesForToast(validation.error) };
  }
  const validated = validation.data as Partial<T>;

  const adminSupabase = createAdminClient();

  // (#4) 부분 머지를 위해 기존 jsonb 컬럼들도 함께 fetch.
  // id 만 select 하면 mapToDb(validated) 가 다른 필드를 빈 값으로 채워
  // update 시 lost update 가 발생한다.
  const { data: existing, error: fetchError } = await adminSupabase
    .from('interviews')
    .select(cfg.selectCols)
    .eq('project_id', projectId)
    .maybeSingle<{ id: string } & Record<string, unknown>>();

  if (fetchError) {
    console.error(`${cfg.logPrefix} Fetch:`, fetchError.message);
    return { success: false, error: '기존 인터뷰 확인에 실패했습니다.' };
  }

  // (#4) 기존 row 가 있으면 camelCase 로 변환 후 부분 patch 와 깊이 머지.
  // 신규 row 면 validated 만 사용 (기존과 동일).
  const merged: Partial<T> = existing ? deepMerge(cfg.mapFromDb(existing), validated) : validated;
  const dbPayload = cfg.mapToDb(merged);
  const ctx: PersistPayloadContext = {
    projectId,
    userId: user.id,
    today: new Date().toISOString().slice(0, 10),
  };

  const isUpdate = Boolean(existing);
  if (existing) {
    const { error: updateError } = await adminSupabase
      .from('interviews')
      .update(cfg.buildUpdatePayload(dbPayload, ctx))
      .eq('id', existing.id);
    if (updateError) {
      console.error(`${cfg.logPrefix} Update:`, updateError.message);
      return { success: false, error: cfg.errorMessages.update };
    }
  } else {
    const { error: insertError } = await adminSupabase
      .from('interviews')
      .insert(cfg.buildInsertPayload(dbPayload, ctx));
    if (insertError) {
      console.error(`${cfg.logPrefix} Insert:`, insertError.message);
      return { success: false, error: cfg.errorMessages.insert };
    }
  }
  const auditAction = cfg.resolveAuditAction(isUpdate);

  // 전이 실패 시 statusTransitioned 를 세우지 않는다 — 이 플래그가 아래
  // "인터뷰 완료" 알림의 조건이라, 상태는 그대로인데 알림만 나가면
  // 운영자가 목록에서 '배정됨'을 보고 모순을 겪는다.
  let statusTransitioned = false;
  if (!options?.autoSave && validateStatusTransition(projectData.status, 'INTERVIEWED')) {
    const { error: statusError } = await adminSupabase
      .from('projects')
      .update({ status: 'INTERVIEWED' })
      .eq('id', projectId);
    if (statusError) {
      console.error(
        `${cfg.logPrefix} status 전이 실패(${projectData.status}→INTERVIEWED) project=${projectId}:`,
        statusError.message
      );
    } else {
      statusTransitioned = true;
    }
  }

  after(async () => {
    if (statusTransitioned && !projectData.is_test_mode) {
      await createNotificationForAdmins({
        type: 'interview_complete',
        title: cfg.notification.title,
        message: cfg.notification.buildMessage(projectData.company_name || '(알 수 없는 기업)'),
        link: `/ops/projects/${projectId}`,
      });
    }

    await createAuditLog({
      actorUserId: user.id,
      action: auditAction,
      targetType: 'interview',
      targetId: projectId,
      meta: {
        track: cfg.track,
        schema_version: 'v2_camelCase',
        auto_save: Boolean(options?.autoSave),
      },
    });

    if (!options?.autoSave) {
      await insertSystemActivityLog(projectId, user.id, cfg.buildActivityLog(isUpdate));
    }
  });

  return { success: true };
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
  options?: { autoSave?: boolean }
): Promise<SimpleActionResult> {
  try {
    return await persistInterview(projectId, data, options, {
      track: 'ROADMAP',
      trackMismatchError: 'PBL 트랙 프로젝트는 PBL 인터뷰 화면을 사용해야 합니다.',
      schemas: {
        strict: RoadmapInterviewStrictSchema,
        autoSave: RoadmapInterviewAutoSaveSchema,
      },
      selectCols: 'id, company_details, job_tasks, improvement_goals',
      mapFromDb: (row) =>
        mapDbToRoadmapInterview(row as Parameters<typeof mapDbToRoadmapInterview>[0]),
      mapToDb: mapRoadmapInterviewToDb,
      // 기존 로드맵 저장 Action 과 동일하게 interviewer_id 는 항상 기록하고,
      // update 에도 interview_date(오늘)를 재기록한다 — 특성화 테스트로 고정.
      buildUpdatePayload: (dbPayload, ctx) => ({
        project_id: ctx.projectId,
        interviewer_id: ctx.userId,
        interview_date: ctx.today,
        ...dbPayload,
      }),
      buildInsertPayload: (dbPayload, ctx) => ({
        project_id: ctx.projectId,
        interviewer_id: ctx.userId,
        interview_date: ctx.today,
        ...dbPayload,
      }),
      resolveAuditAction: (isUpdate) => (isUpdate ? 'INTERVIEW_UPDATE' : 'INTERVIEW_CREATE'),
      notification: {
        title: '인터뷰 완료',
        buildMessage: (companyName) => `${companyName} 프로젝트 인터뷰가 완료되었습니다.`,
      },
      buildActivityLog: (isUpdate) =>
        isUpdate ? '인터뷰가 수정되었습니다.' : '인터뷰가 저장되었습니다.',
      logPrefix: '[saveRoadmapInterviewV2]',
      errorMessages: {
        update: '인터뷰 수정에 실패했습니다.',
        insert: '인터뷰 저장에 실패했습니다.',
      },
    });
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
  data: unknown
): Promise<SimpleActionResult> {
  return saveRoadmapInterviewV2(projectId, data, { autoSave: false });
}

/**
 * 로드맵 인터뷰 조회 — DB snake_case row → camelCase Partial 반환.
 *
 * 컨설턴트 배정 프로젝트만 조회 가능. 조회 실패/미존재 시 null.
 */
export async function fetchRoadmapInterviewV2(
  projectId: string
): Promise<Partial<RoadmapInterviewStrict> | null> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용. 실패 시 null (UI 조회는 조용히 실패).
    // 열람 경로 — 종결 프로젝트도 조회 허용.
    const access = await verifyProjectAccess(projectId, { allowClosed: true });
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
  options?: { autoSave?: boolean }
): Promise<SimpleActionResult> {
  try {
    return await persistInterview(projectId, data, options, {
      track: 'PBL',
      trackMismatchError: '로드맵 트랙 프로젝트는 로드맵 인터뷰 화면을 사용해야 합니다.',
      schemas: {
        strict: PBLInterviewStrictSchema,
        autoSave: PBLInterviewAutoSaveSchema,
      },
      selectCols: 'id, pbl_data',
      mapFromDb: (row) => mapDbToPBLInterview(row as Parameters<typeof mapDbToPBLInterview>[0]),
      mapToDb: mapPBLInterviewToDb,
      // PBL update 는 pbl_data 단독 — interview_date(최초 입력일)·interviewer_id
      // 를 보존한다. ROADMAP 과 의도적 비대칭 (특성화 테스트로 고정).
      buildUpdatePayload: (dbPayload) => dbPayload,
      // interview_date NOT NULL 제약 호환 — camelCase V2 스키마엔 필드가 없으므로
      // 오늘 날짜(YYYY-MM-DD) 기본값 주입. Roadmap V2 Action 과 동일 패턴.
      buildInsertPayload: (dbPayload, ctx) => ({
        project_id: ctx.projectId,
        interviewer_id: ctx.userId,
        interview_date: ctx.today,
        ...dbPayload,
      }),
      resolveAuditAction: () => 'PBL_INTERVIEW_SAVED',
      notification: {
        title: 'PBL 인터뷰 완료',
        buildMessage: (companyName) => `${companyName} PBL 프로젝트 인터뷰가 완료되었습니다.`,
      },
      buildActivityLog: () => 'PBL 인터뷰가 저장되었습니다.',
      logPrefix: '[savePBLInterviewV2]',
      errorMessages: {
        update: 'PBL 인터뷰 수정에 실패했습니다.',
        insert: 'PBL 인터뷰 저장에 실패했습니다.',
      },
    });
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
  data: unknown
): Promise<SimpleActionResult> {
  return savePBLInterviewV2(projectId, data, { autoSave: false });
}

/**
 * PBL 인터뷰 조회 — DB pbl_data JSONB → camelCase Partial 반환.
 */
export async function fetchPBLInterviewV2(
  projectId: string
): Promise<Partial<PBLInterviewStrict> | null> {
  try {
    // (1)+(2) 역할 + 배정 검증 — 공통 헬퍼 재사용. 열람 경로 — 종결 프로젝트도 조회 허용.
    const access = await verifyProjectAccess(projectId, { allowClosed: true });
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
