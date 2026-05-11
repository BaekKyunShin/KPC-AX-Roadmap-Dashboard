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

/** 30MB 업로드 상한 (마이그 072 file_size_limit와 일치) */
export const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

export const noticeInputSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력하세요.')
    .max(200, '제목은 200자 이하로 입력하세요.'),
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
      '허용되지 않는 파일 형식입니다.',
    ),
  mime_type: z.string().min(1),
  file_size: z
    .number()
    .int()
    .positive('파일 크기가 올바르지 않습니다.')
    .max(MAX_ATTACHMENT_BYTES, '파일은 30MB 이하여야 합니다.'),
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
