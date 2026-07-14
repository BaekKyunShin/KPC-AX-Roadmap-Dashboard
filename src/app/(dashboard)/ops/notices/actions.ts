'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import {
  noticeInputSchema,
  noticeUpdateSchema,
  attachmentInputSchema,
  MAX_ATTACHMENT_BYTES,
  ATTACHMENT_TOO_LARGE_MESSAGE,
} from '@/lib/schemas/notice';
import {
  createNotice,
  updateNotice,
  deleteNotice,
  uploadAttachment,
  deleteAttachment,
  buildStoragePath,
  createNoticeAttachmentUploadUrl,
  registerNoticeAttachment,
} from '@/lib/services/notice';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { NoticeAttachment } from '@/types/database';

// ============================================================================
// 공지 생성
// ============================================================================

export async function createNoticeAction(
  formData: FormData
): Promise<ActionResult<{ noticeId: string }>> {
  // 본 흐름의 unknown throw 가 Server Action 응답 직렬화를 손상시켜
  // 클라이언트에 "An unexpected response was received from the server"
  // (Next.js E394) 가 발생하지 않도록 outer try-catch 로 모든 throw 를
  // ActionResult 로 변환한다. (이슈 1-C 재발 차단)
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
      authError: '로그인이 필요합니다.',
      roleError: '공지 작성 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const raw = {
      title: String(formData.get('title') ?? ''),
      body: String(formData.get('body') ?? ''),
      is_pinned: formData.get('is_pinned') === 'on' || formData.get('is_pinned') === 'true',
    };

    const validation = noticeInputSchema.safeParse(raw);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminClient = createAdminClient();
    const result = await createNotice(validation.data, user.id, adminClient);

    if (!result) {
      return { success: false, error: '공지 작성에 실패했습니다.' };
    }

    // 감사로그·캐시 무효화는 부수 작업 — 실패해도 본 흐름을 차단하지 않음.
    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'NOTICE_CREATED',
        targetType: 'notice',
        targetId: result.id,
        meta: { title: validation.data.title },
      });
    } catch (e) {
      console.error('[createNoticeAction] 감사로그 실패:', e);
    }

    try {
      revalidatePath('/ops/notices');
      revalidatePath('/notices');
    } catch (e) {
      console.error('[createNoticeAction] 캐시 무효화 실패:', e);
    }

    return { success: true, data: { noticeId: result.id } };
  } catch (e) {
    console.error('[createNoticeAction] unknown throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `공지 작성 중 예기치 못한 오류가 발생했습니다. (${msg})`,
    };
  }
}

// ============================================================================
// 공지 수정
// ============================================================================

export async function updateNoticeAction(
  id: string,
  formData: FormData
): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '로그인이 필요합니다.',
    roleError: '공지 수정 권한이 없습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  if (!id || typeof id !== 'string') {
    return { success: false, error: '공지 ID가 유효하지 않습니다.' };
  }

  const raw = {
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
    is_pinned: formData.get('is_pinned') === 'on' || formData.get('is_pinned') === 'true',
  };

  const validation = noticeUpdateSchema.safeParse(raw);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const adminClient = createAdminClient();
  const ok = await updateNotice(id, validation.data, adminClient);
  if (!ok) return { success: false, error: '공지 수정에 실패했습니다.' };

  await createAuditLog({
    actorUserId: user.id,
    action: 'NOTICE_UPDATED',
    targetType: 'notice',
    targetId: id,
    meta: { title: validation.data.title },
  });

  revalidatePath('/ops/notices');
  revalidatePath(`/ops/notices/${id}/edit`);
  revalidatePath('/notices');
  revalidatePath(`/notices/${id}`);
  return { success: true };
}

// ============================================================================
// 공지 삭제
// ============================================================================

export async function deleteNoticeAction(id: string): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '로그인이 필요합니다.',
    roleError: '공지 삭제 권한이 없습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  if (!id || typeof id !== 'string') {
    return { success: false, error: '공지 ID가 유효하지 않습니다.' };
  }

  const adminClient = createAdminClient();
  const ok = await deleteNotice(id, adminClient);
  if (!ok) return { success: false, error: '공지 삭제에 실패했습니다.' };

  await createAuditLog({
    actorUserId: user.id,
    action: 'NOTICE_DELETED',
    targetType: 'notice',
    targetId: id,
    meta: {},
  });

  revalidatePath('/ops/notices');
  revalidatePath('/notices');
  return { success: true };
}

// ============================================================================
// 상단 고정 토글
// ============================================================================

export async function togglePinAction(id: string, pinned: boolean): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '로그인이 필요합니다.',
    roleError: '상단 고정 권한이 없습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  if (!id || typeof id !== 'string' || typeof pinned !== 'boolean') {
    return { success: false, error: '입력값이 유효하지 않습니다.' };
  }

  const adminClient = createAdminClient();
  const ok = await updateNotice(id, { is_pinned: pinned }, adminClient);
  if (!ok) return { success: false, error: '상단 고정 변경에 실패했습니다.' };

  await createAuditLog({
    actorUserId: user.id,
    action: 'NOTICE_UPDATED',
    targetType: 'notice',
    targetId: id,
    meta: { pinned, kind: 'toggle_pin' },
  });

  revalidatePath('/ops/notices');
  revalidatePath('/notices');
  return { success: true };
}

// ============================================================================
// 첨부 업로드
// ============================================================================

export async function uploadAttachmentAction(
  noticeId: string,
  formData: FormData
): Promise<ActionResult<{ attachment: NoticeAttachment }>> {
  // 본 흐름의 unknown throw 가 Server Action 응답 직렬화를 손상시켜
  // 클라이언트에 "An unexpected response was received from the server"
  // (Next.js E394) 가 발생하지 않도록 outer try-catch 로 모든 throw 를
  // ActionResult 로 변환한다. (이슈 1-C 재발 차단)
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
      authError: '로그인이 필요합니다.',
      roleError: '첨부 업로드 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    if (!noticeId || typeof noticeId !== 'string') {
      return { success: false, error: '공지 ID가 유효하지 않습니다.' };
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { success: false, error: '파일을 선택해 주세요.' };
    }
    if (file.size === 0) {
      return { success: false, error: '빈 파일은 업로드할 수 없습니다.' };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { success: false, error: ATTACHMENT_TOO_LARGE_MESSAGE };
    }

    // 서버 측 Zod 검증 — storage_path는 실제 업로드 성공 후 확정되므로
    // 사전 검증은 파일명/크기/확장자만 수행한다.
    const preCheckPath = buildStoragePath(noticeId, file.name);
    const preCheck = attachmentInputSchema.safeParse({
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: preCheckPath,
    });
    if (!preCheck.success) {
      return { success: false, error: preCheck.error.errors[0].message };
    }

    const adminClient = createAdminClient();
    const result = await uploadAttachment(file, noticeId, adminClient);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // 감사로그·캐시 무효화는 부수 작업 — 실패해도 첨부 업로드 성공을 그대로 반환.
    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'NOTICE_UPDATED',
        targetType: 'notice_attachment',
        targetId: result.attachment.id,
        meta: {
          notice_id: noticeId,
          file_name: file.name,
          file_size: file.size,
          kind: 'attachment_upload',
        },
      });
    } catch (e) {
      console.error('[uploadAttachmentAction] 감사로그 실패:', e);
    }

    try {
      revalidatePath(`/ops/notices/${noticeId}/edit`);
      revalidatePath(`/notices/${noticeId}`);
    } catch (e) {
      console.error('[uploadAttachmentAction] 캐시 무효화 실패:', e);
    }

    return { success: true, data: { attachment: result.attachment } };
  } catch (e) {
    console.error('[uploadAttachmentAction] unknown throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `첨부 업로드 중 예기치 못한 오류가 발생했습니다. (${msg})`,
    };
  }
}

// ============================================================================
// 첨부 직접 업로드용 signed URL 발급 (Storage 직접 업로드 패턴)
// ============================================================================

export interface CreateUploadUrlResult {
  signedUrl: string;
  token: string;
  storagePath: string;
  resolvedMime: string;
}

/**
 * 공지 첨부를 클라이언트에서 Supabase Storage 로 직접 PUT 업로드하기 위한
 * signed URL 을 발급한다. Server Action 의 multipart body 한도(Vercel
 * Functions platform 제약)를 우회하는 표준 패턴.
 *
 * 발급 후 클라이언트는 signedUrl 로 PUT 요청을 보내고, 업로드 성공 후
 * registerAttachmentAction 으로 DB row 를 등록해야 한다.
 */
export async function createUploadUrlAction(
  noticeId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<ActionResult<CreateUploadUrlResult>> {
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
      authError: '로그인이 필요합니다.',
      roleError: '첨부 업로드 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };

    if (!noticeId || typeof noticeId !== 'string') {
      return { success: false, error: '공지 ID가 유효하지 않습니다.' };
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return { success: false, error: '파일 크기가 올바르지 않습니다.' };
    }
    if (fileSize > MAX_ATTACHMENT_BYTES) {
      return { success: false, error: ATTACHMENT_TOO_LARGE_MESSAGE };
    }

    // Zod 사전 검증 — storage_path 는 service 에서 buildStoragePath 로 생성되므로
    // 형식만 임시값으로 통과시키고 file_name·mime_type·file_size 만 실질 검증.
    const preCheckPath = buildStoragePath(noticeId, fileName);
    const preCheck = attachmentInputSchema.safeParse({
      file_name: fileName,
      mime_type: mimeType || 'application/octet-stream',
      file_size: fileSize,
      storage_path: preCheckPath,
    });
    if (!preCheck.success) {
      return { success: false, error: preCheck.error.errors[0].message };
    }

    const adminClient = createAdminClient();
    const result = await createNoticeAttachmentUploadUrl(
      noticeId,
      fileName,
      mimeType,
      fileSize,
      adminClient
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        signedUrl: result.signedUrl,
        token: result.token,
        storagePath: result.storagePath,
        resolvedMime: result.resolvedMime,
      },
    };
  } catch (e) {
    console.error('[createUploadUrlAction] unknown throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `업로드 URL 발급 중 예기치 못한 오류가 발생했습니다. (${msg})`,
    };
  }
}

// ============================================================================
// 첨부 직접 업로드 성공 후 DB row 등록
// ============================================================================

export async function registerAttachmentAction(
  noticeId: string,
  metadata: {
    file_name: string;
    mime_type: string;
    file_size: number;
    storage_path: string;
  }
): Promise<ActionResult<{ attachment: NoticeAttachment }>> {
  try {
    const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
      authError: '로그인이 필요합니다.',
      roleError: '첨부 등록 권한이 없습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    if (!noticeId || typeof noticeId !== 'string') {
      return { success: false, error: '공지 ID가 유효하지 않습니다.' };
    }

    const validation = attachmentInputSchema.safeParse(metadata);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminClient = createAdminClient();
    const result = await registerNoticeAttachment(noticeId, validation.data, adminClient);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // 부수 작업 — 실패해도 본 흐름 차단하지 않음
    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'NOTICE_UPDATED',
        targetType: 'notice_attachment',
        targetId: result.attachment.id,
        meta: {
          notice_id: noticeId,
          file_name: validation.data.file_name,
          file_size: validation.data.file_size,
          kind: 'attachment_upload',
        },
      });
    } catch (e) {
      console.error('[registerAttachmentAction] 감사로그 실패:', e);
    }

    try {
      revalidatePath(`/ops/notices/${noticeId}/edit`);
      revalidatePath(`/notices/${noticeId}`);
    } catch (e) {
      console.error('[registerAttachmentAction] 캐시 무효화 실패:', e);
    }

    return { success: true, data: { attachment: result.attachment } };
  } catch (e) {
    console.error('[registerAttachmentAction] unknown throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `첨부 등록 중 예기치 못한 오류가 발생했습니다. (${msg})`,
    };
  }
}

// ============================================================================
// 첨부 삭제
// ============================================================================

export async function deleteAttachmentAction(attachmentId: string): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES, {
    authError: '로그인이 필요합니다.',
    roleError: '첨부 삭제 권한이 없습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  if (!attachmentId || typeof attachmentId !== 'string') {
    return { success: false, error: '첨부 ID가 유효하지 않습니다.' };
  }

  const adminClient = createAdminClient();
  const ok = await deleteAttachment(attachmentId, adminClient);
  if (!ok) return { success: false, error: '첨부 삭제에 실패했습니다.' };

  await createAuditLog({
    actorUserId: user.id,
    action: 'NOTICE_UPDATED',
    targetType: 'notice_attachment',
    targetId: attachmentId,
    meta: { kind: 'attachment_delete' },
  });

  revalidatePath('/ops/notices');
  return { success: true };
}
