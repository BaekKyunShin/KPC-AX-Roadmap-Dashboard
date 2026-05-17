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
  /** 컨설턴트 세션에서 users RLS로 FK join이 null일 때 adminClient로 해결된 이름 */
  author_name?: string | null;
  attachment_count?: number;
}

export interface NoticeDetail extends Notice {
  author?: { name: string | null } | null;
  author_name?: string | null;
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
 * author_id 배열 → `{ id: name }` 맵 해결.
 * 컨설턴트 세션은 users 테이블 RLS로 OPS 작성자 row를 읽지 못하므로,
 * adminClient로 별도 조회해 UI에 이름을 노출할 때 사용한다.
 */
export async function resolveAuthorNames(
  authorIds: ReadonlyArray<string>,
  adminClient: SupaClient,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(authorIds.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await adminClient
    .from('users')
    .select('id, name')
    .in('id', unique);
  if (error) {
    console.error('[resolveAuthorNames] error:', error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const u of data ?? []) {
    const row = u as { id: string; name: string | null };
    if (row.id && row.name) out[row.id] = row.name;
  }
  return out;
}

/**
 * 공지 목록 조회.
 * - `is_pinned desc, created_at desc` 정렬 (상단 고정 우선)
 * - filter_by=title 시 title ILIKE.
 * - filter_by=author: adminClient가 주어지면 users에서 이름 ILIKE로 ids를 먼저 구해
 *   notices.author_id IN (...)로 필터한다. adminClient가 없으면 FK inner join으로 폴백.
 * - adminClient 제공 시 각 item에 `author_name`을 주입해 컨설턴트 세션에서도 노출 가능.
 */
export async function listNotices(
  search: NoticeSearch,
  client: SupaClient,
  adminClient?: SupaClient,
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
    const trimmed = q.trim();
    if (filter_by === 'title') {
      query = query.ilike('title', `%${trimmed}%`);
    } else if (adminClient) {
      // adminClient로 users 이름 ILIKE → ids → notices IN 필터
      const { data: matched } = await adminClient
        .from('users')
        .select('id')
        .ilike('name', `%${trimmed}%`);
      const ids = (matched ?? []).map(
        (u) => (u as { id: string }).id,
      );
      if (ids.length === 0) {
        return { items: [], total: 0, page, perPage: per_page, totalPages: 0 };
      }
      query = query.in('author_id', ids);
    } else {
      // adminClient 없을 때(테스트 등) — 기존 FK inner join 폴백
      query = client
        .from('notices')
        .select(
          'id, title, body, author_id, is_pinned, view_count, created_at, updated_at, author:author_id!inner(name), notice_attachments(count)',
          { count: 'exact' },
        )
        .ilike('author.name', `%${trimmed}%`);
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

  const rawItems: NoticeWithMeta[] = (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRow = row as any;
    const attachmentsArr = rawRow.notice_attachments;
    const attachment_count = Array.isArray(attachmentsArr)
      ? (attachmentsArr[0]?.count ?? 0)
      : 0;
    const authorRaw = rawRow.author;
    const authorField = Array.isArray(authorRaw) ? authorRaw[0] : authorRaw;
    return {
      ...(rawRow as Notice),
      author: authorField ?? null,
      attachment_count,
    };
  });

  // adminClient 제공 시 author_name 주입 (컨설턴트 세션 RLS 우회)
  if (adminClient && rawItems.length > 0) {
    const authorIds = rawItems
      .map((it) => it.author_id)
      .filter((id): id is string => !!id);
    const nameMap = await resolveAuthorNames(authorIds, adminClient);
    for (const it of rawItems) {
      const id = it.author_id ?? '';
      it.author_name = nameMap[id] ?? it.author?.name ?? null;
    }
  } else {
    for (const it of rawItems) {
      it.author_name = it.author?.name ?? null;
    }
  }

  const total = count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / per_page) : 0;

  return { items: rawItems, total, page, perPage: per_page, totalPages };
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
  adminClient?: SupaClient,
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

  const detail = data as unknown as NoticeDetail;
  // adminClient 있으면 users RLS 우회하여 author_name 해결
  if (adminClient && detail.author_id) {
    const map = await resolveAuthorNames([detail.author_id], adminClient);
    detail.author_name = map[detail.author_id] ?? detail.author?.name ?? null;
  } else {
    detail.author_name = detail.author?.name ?? null;
  }
  return detail;
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
 * Storage 키용 ASCII-only 파일명 안전화.
 *
 * Supabase Storage 의 isValidKey 정규식이 ASCII 만 허용하므로
 * (한글·CJK 모두 InvalidKey 400 으로 거부), base 부분의 비-ASCII 와
 * 특수문자를 `_` 로 치환한다. 원본 한글 파일명은
 * notice_attachments.file_name 컬럼에 보존되며 다운로드 시
 * Content-Disposition 헤더로 사용자에게 그대로 노출되므로 UX 영향 없다.
 *
 * buildStoragePath 가 UUID prefix 를 붙이므로 같은 fallback 결과가
 * 여러 번 만들어져도 키 충돌은 발생하지 않는다.
 */
export function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';

  const safeBase = base
    .replace(/[^A-Za-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const safeExt = ext.replace(/[^A-Za-z0-9.]/g, '');

  return (safeBase || 'file') + safeExt;
}

/**
 * 확장자 → MIME 타입 매핑.
 * 마이그 062의 버킷 `notice-attachments` `allowed_mime_types`와 1:1 일치.
 * 브라우저가 MIME을 올바르게 감지하지 못하는 경우(.hwp 등)에도
 * 버킷 정책에 맞는 contentType으로 업로드할 수 있도록 확장자 기준으로 보정한다.
 */
const EXT_TO_MIME: Record<string, string> = {
  '.hwpx': 'application/vnd.hancom.hwpx',
  '.hwp': 'application/x-hwp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function getMimeTypeByExtension(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  const idx = lower.lastIndexOf('.');
  if (idx < 0) return null;
  const ext = lower.slice(idx);
  return EXT_TO_MIME[ext] ?? null;
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

  // 파일 바이트 변환 — File.arrayBuffer() 는 abort/취소 등으로 throw 가능.
  // Server Action 응답 직렬화를 손상시키지 않도록 try-catch 로 격리한다.
  let body: Uint8Array;
  try {
    const arrayBuffer = await file.arrayBuffer();
    body = new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('[uploadAttachment] arrayBuffer error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `파일을 읽지 못했습니다. (${msg})` };
  }

  // 브라우저 MIME 감지 실패(.hwp 등) 대비: 확장자 기반 매핑을 우선 사용.
  // 버킷 `notice-attachments`는 allowed_mime_types로 contentType을 검사하므로
  // application/octet-stream은 거부된다.
  const resolvedMime =
    getMimeTypeByExtension(file.name) ??
    (file.type && file.type.length > 0 ? file.type : 'application/octet-stream');

  // 1) Storage 업로드 — supabase-js 내부 fetch 가 네트워크 에러로 throw 가능.
  let uploadError: { message: string } | null = null;
  try {
    const res = await adminClient.storage
      .from('notice-attachments')
      .upload(storagePath, body, {
        contentType: resolvedMime,
        upsert: false,
      });
    uploadError = (res.error as { message: string } | null) ?? null;
  } catch (e) {
    console.error('[uploadAttachment] Storage upload throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `파일 업로드에 실패했습니다. (${msg})` };
  }

  if (uploadError) {
    console.error('[uploadAttachment] Storage upload error:', uploadError);
    return {
      error: `파일 업로드에 실패했습니다. (${uploadError.message})`,
    };
  }

  // 2) DB row insert — mime_type도 확장자 기반 보정 값 사용. fetch throw 도 보호.
  const attachmentInput: AttachmentInput = {
    file_name: file.name,
    mime_type: resolvedMime,
    file_size: file.size,
    storage_path: storagePath,
  };

  let insertData: unknown = null;
  let insertError: { message: string } | null = null;
  try {
    const { data, error } = await adminClient
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
    insertData = data;
    insertError = (error as { message: string } | null) ?? null;
  } catch (e) {
    console.error('[uploadAttachment] Insert throw:', e);
    // 롤백: Storage에 올린 파일 제거 (best-effort, 롤백 throw 는 무시)
    try {
      await adminClient.storage
        .from('notice-attachments')
        .remove([storagePath]);
    } catch (rollbackErr) {
      console.error('[uploadAttachment] Rollback throw:', rollbackErr);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `첨부 정보 저장에 실패했습니다. (${msg})` };
  }

  if (insertError || !insertData) {
    if (insertError) {
      console.error('[uploadAttachment] Insert error:', insertError);
    }
    // 롤백: Storage에 올린 파일 제거
    await adminClient.storage.from('notice-attachments').remove([storagePath]);
    return {
      error: insertError
        ? `첨부 정보 저장에 실패했습니다. (${insertError.message})`
        : '첨부 정보 저장에 실패했습니다.',
    };
  }

  return { attachment: insertData as NoticeAttachment };
}

// ============================================================================
// Storage 직접 업로드 패턴 (signed upload URL)
// ============================================================================

export interface NoticeAttachmentUploadUrl {
  signedUrl: string;
  token: string;
  storagePath: string;
  resolvedMime: string;
}

/**
 * 공지 첨부 직접 업로드용 signed URL 발급.
 * - 클라이언트가 브라우저에서 직접 Supabase Storage 에 PUT 으로 업로드할 수
 *   있도록 admin client 가 signed URL 과 token 을 발급한다.
 * - Server Action 의 multipart body 한도(Vercel platform 제약)를 우회한다.
 * - 발급 후 클라이언트는 `uploadToSignedUrl(storagePath, token, file)` 또는
 *   fetch PUT 으로 업로드한다. 업로드 성공 후 별도로 `registerNoticeAttachment`
 *   를 호출해 DB row 를 등록해야 한다.
 */
export async function createNoticeAttachmentUploadUrl(
  noticeId: string,
  fileName: string,
  mimeType: string,
  _fileSize: number,
  adminClient: SupaClient,
): Promise<NoticeAttachmentUploadUrl | { error: string }> {
  const storagePath = buildStoragePath(noticeId, fileName);
  // 브라우저 MIME 감지 실패(.hwp 등) 대비: 확장자 기반 매핑을 우선 사용.
  const resolvedMime =
    getMimeTypeByExtension(fileName) ??
    (mimeType && mimeType.length > 0 ? mimeType : 'application/octet-stream');

  try {
    const { data, error } = await adminClient.storage
      .from('notice-attachments')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      const msg = error?.message ?? '알 수 없는 오류';
      console.error('[createNoticeAttachmentUploadUrl] error:', error);
      return { error: `업로드 URL 발급 실패: ${msg}` };
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
      resolvedMime,
    };
  } catch (e) {
    console.error('[createNoticeAttachmentUploadUrl] throw:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `업로드 URL 발급 실패: ${msg}` };
  }
}

/**
 * 첨부 업로드(Storage 직접 PUT) 성공 후 DB row 등록.
 * - 등록 실패 시 Storage 파일 best-effort 제거 (orphan 방지).
 */
export async function registerNoticeAttachment(
  noticeId: string,
  metadata: AttachmentInput,
  adminClient: SupaClient,
): Promise<UploadAttachmentResult | { error: string }> {
  let insertData: unknown = null;
  let insertError: { message: string } | null = null;
  try {
    const { data, error } = await adminClient
      .from('notice_attachments')
      .insert({
        notice_id: noticeId,
        file_name: metadata.file_name,
        mime_type: metadata.mime_type,
        file_size: metadata.file_size,
        storage_path: metadata.storage_path,
      })
      .select('*')
      .single();
    insertData = data;
    insertError = (error as { message: string } | null) ?? null;
  } catch (e) {
    console.error('[registerNoticeAttachment] insert throw:', e);
    try {
      await adminClient.storage
        .from('notice-attachments')
        .remove([metadata.storage_path]);
    } catch (rollbackErr) {
      console.error('[registerNoticeAttachment] rollback throw:', rollbackErr);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `첨부 정보 저장에 실패했습니다. (${msg})` };
  }

  if (insertError || !insertData) {
    if (insertError) {
      console.error('[registerNoticeAttachment] insert error:', insertError);
    }
    await adminClient.storage
      .from('notice-attachments')
      .remove([metadata.storage_path]);
    return {
      error: insertError
        ? `첨부 정보 저장에 실패했습니다. (${insertError.message})`
        : '첨부 정보 저장에 실패했습니다.',
    };
  }

  return { attachment: insertData as NoticeAttachment };
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
 * - fileName 지정 시 createSignedUrl({ download }) 옵션으로 Content-Disposition
 *   헤더에 원본 파일명을 박아 한글 파일명도 RFC 5987 로 자동 인코딩되어 다운로드됨.
 */
export async function createAttachmentSignedUrl(
  storagePath: string,
  client: SupaClient,
  expiresInSeconds = 60,
  fileName?: string,
): Promise<string | null> {
  const options = fileName ? { download: fileName } : undefined;
  const { data, error } = await client.storage
    .from('notice-attachments')
    .createSignedUrl(storagePath, expiresInSeconds, options);

  if (error || !data) {
    if (error)
      console.error('[createAttachmentSignedUrl] error:', error.message);
    return null;
  }
  return data.signedUrl;
}
