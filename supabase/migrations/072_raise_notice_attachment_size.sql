-- ============================================================
-- 072_raise_notice_attachment_size.sql
-- 목적: notice_attachments.file_size CHECK 제약 20MB → 30MB
--       storage bucket notice-attachments file_size_limit 20MB → 30MB
-- 멱등 패치: DROP IF EXISTS + 재생성 (재실행 안전)
-- 사유: 운영자가 PDF 등 대용량 양식·매뉴얼 첨부 시 20MB 한도가
--       빈번히 부족했음. 30MB로 상향.
-- ============================================================

ALTER TABLE notice_attachments DROP CONSTRAINT IF EXISTS notice_attachments_file_size_check;
ALTER TABLE notice_attachments
  ADD CONSTRAINT notice_attachments_file_size_check
  CHECK (file_size > 0 AND file_size <= 31457280); -- 30MB = 30 * 1024 * 1024

UPDATE storage.buckets
SET file_size_limit = 31457280 -- 30MB
WHERE id = 'notice-attachments';
