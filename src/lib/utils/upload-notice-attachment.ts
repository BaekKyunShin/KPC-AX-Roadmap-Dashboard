import {
  createUploadUrlAction,
  registerAttachmentAction,
} from '@/app/(dashboard)/ops/notices/actions';
import type { ActionResult } from '@/lib/types/action-result';
import type { NoticeAttachment } from '@/types/database';

/**
 * 공지 첨부 파일을 Supabase Storage 로 클라이언트에서 직접 업로드한다.
 *
 * Server Action 의 multipart body 한도(Vercel Functions platform 제약)를
 * 우회하기 위해, 3단계로 분리한다:
 *   1) createUploadUrlAction — admin 이 발급한 signed upload URL + token 수신
 *   2) fetch PUT — 브라우저가 Storage 에 파일을 직접 PUT
 *   3) registerAttachmentAction — 업로드 성공 후 DB row 등록
 *
 * 어느 단계든 실패하면 그 시점의 error 를 그대로 ActionResult 로 반환한다.
 * 보상 트랜잭션(공지 row 자동 삭제)은 호출자(NoticeForm) 가 처리한다.
 */
export async function uploadNoticeAttachmentDirect(
  noticeId: string,
  file: File,
): Promise<ActionResult<{ attachment: NoticeAttachment }>> {
  // 1) signed upload URL 발급
  const urlResult = await createUploadUrlAction(
    noticeId,
    file.name,
    file.type,
    file.size,
  );
  if (!urlResult.success) {
    return { success: false, error: urlResult.error };
  }
  const { signedUrl, storagePath, resolvedMime } = urlResult.data;

  // 2) Supabase Storage 로 직접 PUT
  try {
    const res = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': resolvedMime },
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        // 응답 본문 파싱 실패는 무시
      }
      // Supabase Storage 413 (버킷 file_size_limit 초과): outer status 400 +
      // body JSON 의 statusCode==="413"/error==="Payload too large" 형태로 응답.
      // 직접 413을 받는 경로도 함께 감지해 사용자 친화 메시지로 치환한다.
      const isPayloadTooLarge =
        res.status === 413 ||
        detail.includes('"statusCode":"413"') ||
        detail.includes('Payload too large');
      if (isPayloadTooLarge) {
        return {
          success: false,
          error: '파일이 너무 큽니다 (최대 30MB). 파일 크기를 줄여 다시 시도해 주세요.',
        };
      }
      return {
        success: false,
        error: `파일 업로드 실패 (${res.status}${detail ? `: ${detail}` : ''})`,
      };
    }
  } catch (e) {
    console.error('[uploadNoticeAttachmentDirect] fetch PUT throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `파일 업로드 실패: ${msg}` };
  }

  // 3) DB row 등록 — registerAttachmentAction 자체가 실패해도 호출자가
  //    보상 트랜잭션(deleteNoticeAction)으로 Storage prefix 까지 정리한다.
  const registerResult = await registerAttachmentAction(noticeId, {
    file_name: file.name,
    mime_type: resolvedMime,
    file_size: file.size,
    storage_path: storagePath,
  });
  if (!registerResult.success) {
    return { success: false, error: registerResult.error };
  }

  return { success: true, data: { attachment: registerResult.data.attachment } };
}
