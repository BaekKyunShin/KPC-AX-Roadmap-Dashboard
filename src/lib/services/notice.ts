import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NoticeInput,
  NoticeUpdate,
  NoticeSearch,
  AttachmentInput,
} from '@/lib/schemas/notice';
import type { Notice, NoticeAttachment } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface NoticeWithMeta extends Notice {
  author?: { name: string | null } | null;
  attachment_count?: number;
}

export interface NoticeDetail extends Notice {
  author?: { name: string | null } | null;
  notice_attachments: NoticeAttachment[];
}

export interface NoticeListResult {
  items: NoticeWithMeta[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Supabase 클라이언트 타입.
 * 서비스 함수는 server client / admin client 둘 다 받아야 하므로 any로 완화한다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupaClient = SupabaseClient<any, any, any>;

// ============================================================================
// 목록 조회
// ============================================================================

/**
 * 공지 목록 조회.
 * - `is_pinned desc, created_at desc` 정렬 (상단 고정 우선)
 * - filter_by=title 시 title ILIKE, filter_by=author 시 작성자 이름 ILIKE (FK join)
 *
 * RLS로 접근 제어가 되므로 server client를 받는다.
 */
export async function listNotices(
  search: NoticeSearch,
  client: SupaClient,
): Promise<NoticeListResult> {
  const { q, filter_by, page, per_page } = search;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = client
    .from('notices')
    .select(
      'id, title, body, author_id, is_pinned, view_count, created_at, updated_at, author:author_id(name), notice_attachments(count)',
      { count: 'exact' },
    );

  if (q && q.trim().length > 0) {
    if (filter_by === 'title') {
      query = query.ilike('title', `%${q.trim()}%`);
    } else {
      // filter_by === 'author' — inner join 후 author.name ILIKE
      query = client
        .from('notices')
        .select(
          'id, title, body, author_id, is_pinned, view_count, created_at, updated_at, author:author_id!inner(name), notice_attachments(count)',
          { count: 'exact' },
        )
        .ilike('author.name', `%${q.trim()}%`);
    }
  }

  const { data, error, count } = await query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[listNotices] Supabase error:', error.message);
    return { items: [], total: 0, page, perPage: per_page, totalPages: 0 };
  }

  const items: NoticeWithMeta[] = (data ?? []).map((row) => {
    // notice_attachments(count)는 [{ count: n }] 배열로 반환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRow = row as any;
    const attachmentsArr = rawRow.notice_attachments;
    const attachment_count = Array.isArray(attachmentsArr)
      ? (attachmentsArr[0]?.count ?? 0)
      : 0;
    // PostgREST FK join은 단수(1:1) 관계여도 배열로 반환될 수 있다.
    const authorRaw = rawRow.author;
    const authorField = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw;
    return {
      ...(rawRow as Notice),
      author: authorField ?? null,
      attachment_count,
    };
  });

  const total = count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / per_page) : 0;

  return { items, total, page, perPage: per_page, totalPages };
}

// ============================================================================
// 단건 조회 + 조회수 증가
// ============================================================================

/**
 * 공지 상세 조회.
 * - 존재하지 않으면 null 반환
 * - 조회수 증가는 호출부에서 별도로 `incrementNoticeViewCount`로 수행
 */
export async function getNotice(
  id: string,
  client: SupaClient,
): Promise<NoticeDetail | null> {
  const { data, error } = await client
    .from('notices')
    .select(
      'id, title, body, author_id, is_pinned, view_count, created_at, updated_at, author:author_id(name), notice_attachments(*)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[getNotice] Supabase error:', error.message);
    return null;
  }

  return data as unknown as NoticeDetail;
}

/**
 * 조회수 증가 RPC 호출 (security definer)
 * - 마이그 062의 `increment_notice_view_count` 호출
 */
export async function incrementNoticeViewCount(
  id: string,
  client: SupaClient,
): Promise<void> {
  const { error } = await client.rpc('increment_notice_view_count', {
    p_notice_id: id,
  });
  if (error) {
    console.error('[incrementNoticeViewCount] RPC error:', error.message);
  }
}

// ============================================================================
// 생성 / 수정 / 삭제
// ============================================================================

/**
 * 공지 생성 (첨부는 별도 업로드).
 * - 성공 시 생성된 notice id 반환
 */
export async function createNotice(
  input: NoticeInput,
  authorId: string,
  client: SupaClient,
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('notices')
    .insert({
      title: input.title,
      body: input.body,
      is_pinned: input.is_pinned ?? false,
      author_id: authorId,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error) console.error('[createNotice] Supabase error:', error.message);
    return null;
  }

  return { id: data.id as string };
}

/**
 * 공지 수정 (partial).
 */
export async function updateNotice(
  id: string,
  patch: NoticeUpdate,
  client: SupaClient,
): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.body !== undefined) payload.body = patch.body;
  if (patch.is_pinned !== undefined) payload.is_pinned = patch.is_pinned;
  payload.updated_at = new Date().toISOString();

  const { error } = await client.from('notices').update(payload).eq('id', id);

  if (error) {
    console.error('[updateNotice] Supabase error:', error.message);
    return false;
  }
  return true;
}

/**
 * 공지 삭제.
 * - DB row 삭제 시 CASCADE로 notice_attachments도 자동 삭제
 * - Storage 파일은 prefix(`${noticeId}/`) 기반으로 별도 제거 필요 (admin client)
 */
export async function deleteNotice(
  id: string,
  adminClient: SupaClient,
): Promise<boolean> {
  // 1. 첨부 storage_path 목록을 먼저 조회 (row 삭제 전)
  const { data: attachments } = await adminClient
    .from('notice_attachments')
    .select('storage_path')
    .eq('notice_id', id);

  // 2. 공지 row 삭제 (CASCADE로 attachments row도 제거)
  const { error } = await adminClient.from('notices').delete().eq('id', id);
  if (error) {
    console.error('[deleteNotice] Supabase error:', error.message);
    return false;
  }

  // 3. Storage 파일 제거 (best-effort)
  if (attachments && attachments.length > 0) {
    const paths = attachments.map((a: { storage_path: string }) => a.storage_path);
    const { error: storageError } = await adminClient.storage
      .from('notice-attachments')
      .remove(paths);
    if (storageError) {
      console.error('[deleteNotice] Storage remove error:', storageError.message);
      // row는 이미 지워졌으므로 실패해도 true 반환
    }
  }

  return true;
}

// ============================================================================
// 첨부 업로드 / 삭제
// ============================================================================

/**
 * 첨부 파일명 안전화.
 * 공백·특수문자 → _, 한글·영숫자·점·하이픈만 유지
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-가-힣]/g, '_');
}

/**
 * storage_path 생성 규칙.
 * `${noticeId}/${uuid}-${safeName}`
 */
export function buildStoragePath(noticeId: string, originalName: string): string {
  const safeName = sanitizeFileName(originalName);
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${noticeId}/${uuid}-${safeName}`;
}

export interface UploadAttachmentResult {
  attachment: NoticeAttachment;
}

/**
 * 공지 첨부 업로드 — Storage 업로드 + DB row insert.
 * - adminClient 필수 (storage.objects RLS를 우회하여 OPS 권한으로만 수행)
 * - 실패 시 생성된 리소스 정리 시도
 */
export async function uploadAttachment(
  file: File,
  noticeId: string,
  adminClient: SupaClient,
): Promise<UploadAttachmentResult | { error: string }> {
  const storagePath = buildStoragePath(noticeId, file.name);
  const arrayBuffer = await file.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  // 1) Storage 업로드
  const { error: uploadError } = await adminClient.storage
    .from('notice-attachments')
    .upload(storagePath, body, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    console.error('[uploadAttachment] Storage upload error:', uploadError.message);
    return { error: '파일 업로드에 실패했습니다.' };
  }

  // 2) DB row insert
  const attachmentInput: AttachmentInput = {
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    storage_path: storagePath,
  };

  const { data, error: insertError } = await adminClient
    .from('notice_attachments')
    .insert({
      notice_id: noticeId,
      file_name: attachmentInput.file_name,
      mime_type: attachmentInput.mime_type,
      file_size: attachmentInput.file_size,
      storage_path: attachmentInput.storage_path,
    })
    .select('*')
    .single();

  if (insertError || !data) {
    if (insertError)
      console.error('[uploadAttachment] Insert error:', insertError.message);
    // 롤백: Storage에 올린 파일 제거
    await adminClient.storage.from('notice-attachments').remove([storagePath]);
    return { error: '첨부 정보 저장에 실패했습니다.' };
  }

  return { attachment: data as unknown as NoticeAttachment };
}

/**
 * 첨부 삭제 — DB row + Storage 파일 제거.
 */
export async function deleteAttachment(
  attachmentId: string,
  adminClient: SupaClient,
): Promise<boolean> {
  // 1) storage_path 조회
  const { data: att, error: fetchError } = await adminClient
    .from('notice_attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .single();

  if (fetchError || !att) {
    if (fetchError)
      console.error('[deleteAttachment] Fetch error:', fetchError.message);
    return false;
  }

  // 2) row 삭제
  const { error: deleteError } = await adminClient
    .from('notice_attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteError) {
    console.error('[deleteAttachment] Delete error:', deleteError.message);
    return false;
  }

  // 3) Storage 파일 제거 (best-effort)
  const { error: storageError } = await adminClient.storage
    .from('notice-attachments')
    .remove([att.storage_path as string]);

  if (storageError) {
    console.error('[deleteAttachment] Storage error:', storageError.message);
  }

  return true;
}

/**
 * 첨부 다운로드용 서명 URL 생성 (비공개 버킷).
 * - 기본 만료 60초 (한 번 다운로드 용도)
 */
export async function createAttachmentSignedUrl(
  storagePath: string,
  client: SupaClient,
  expiresInSeconds = 60,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from('notice-attachments')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    if (error)
      console.error('[createAttachmentSignedUrl] error:', error.message);
    return null;
  }
  return data.signedUrl;
}
