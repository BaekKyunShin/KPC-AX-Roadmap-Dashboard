import { z } from 'zod';

/**
 * 공지 첨부 허용 확장자
 * 마이그 062의 notice-attachments 버킷 allowed_mime_types와 짝을 이룬다.
 */
export const ALLOWED_ATTACHMENT_EXT = [
  '.hwpx',
  '.hwp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.txt',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
] as const;

/**
 * 첨부 업로드 상한 (마이그 074 file_size_limit·notice_attachments CHECK 와 일치).
 *
 * ⚠️ 이 값을 바꿀 때 함께 올려야 하는 3곳:
 *   1. supabase/migrations — 버킷 file_size_limit + file_size CHECK 제약
 *   2. Supabase 프로젝트 전역 Storage "Upload file size limit" (대시보드 설정,
 *      SQL 로 변경 불가. 전역값과 버킷값 중 작은 쪽이 실제 한도가 된다)
 *   3. supabase/config.toml [storage] file_size_limit (로컬 스택)
 * 운영 버킷과의 동기화는 `npm run check:storage-limits` 로 검증한다.
 */
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

/** 사용자 노출용 상한 라벨 — 안내문·에러 메시지의 단일 출처 ("100MB") */
export const MAX_ATTACHMENT_LABEL = `${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB`;

/** 크기 초과 표준 메시지 — 스키마·Server Action·업로더가 모두 이 값을 쓴다 */
export const ATTACHMENT_TOO_LARGE_MESSAGE = `파일은 ${MAX_ATTACHMENT_LABEL} 이하여야 합니다.`;

export const noticeInputSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하로 입력하세요.'),
  body: z.string().max(50000, '본문은 50,000자 이하로 입력하세요.'),
  is_pinned: z.boolean().default(false),
});

export const noticeUpdateSchema = noticeInputSchema.partial();

export const attachmentInputSchema = z.object({
  file_name: z
    .string()
    .min(1, '파일명이 비어 있습니다.')
    .refine(
      (name) => ALLOWED_ATTACHMENT_EXT.some((ext) => name.toLowerCase().endsWith(ext)),
      '허용되지 않는 파일 형식입니다.'
    ),
  mime_type: z.string().min(1),
  file_size: z
    .number()
    .int()
    .positive('파일 크기가 올바르지 않습니다.')
    .max(MAX_ATTACHMENT_BYTES, ATTACHMENT_TOO_LARGE_MESSAGE),
  storage_path: z.string().min(1, 'storage_path는 비어 있을 수 없습니다.'),
});

export const noticeSearchSchema = z.object({
  q: z.string().optional(),
  filter_by: z.enum(['title', 'author']).default('title'),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(10),
});

export type NoticeInput = z.infer<typeof noticeInputSchema>;
export type NoticeUpdate = z.infer<typeof noticeUpdateSchema>;
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;
export type NoticeSearch = z.infer<typeof noticeSearchSchema>;
