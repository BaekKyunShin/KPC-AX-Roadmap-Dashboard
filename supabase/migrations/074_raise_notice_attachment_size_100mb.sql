-- ============================================================
-- 074_raise_notice_attachment_size_100mb.sql
-- 목적: notice_attachments.file_size CHECK 제약 30MB → 100MB
--       storage bucket notice-attachments file_size_limit 30MB → 100MB
-- 멱등 패치: DROP IF EXISTS + 재생성 (재실행 안전)
-- 사유: 운영자가 대용량 교육 자료·매뉴얼을 공지에 첨부할 때 30MB(마이그 072)
--       한도가 부족했음. 100MB 로 상향.
--
-- ⚠️ 전제 조건 (SQL 로 해결 불가):
--   Supabase 프로젝트 전역 Storage "Upload file size limit"(대시보드
--   Project Settings > Storage) 이 100MB 이상이어야 실제 업로드가 성공한다.
--   전역값과 버킷값 중 "작은 쪽"이 실제 한도로 적용되며, 전역값은 SQL 이나
--   마이그레이션으로 변경할 수 없다 (Management API/대시보드 전용).
--   Free 플랜은 전역 최대 50MB, Pro 플랜은 최대 50GB — 본 프로젝트는 Pro.
--
-- 코드 상수(MAX_ATTACHMENT_BYTES)와의 동기화는 `npm run check:storage-limits`
-- 로 검증한다 (마이그 072 가 운영에 누락돼 21MB 첨부가 413 으로 막혔던 전례).
-- ============================================================

ALTER TABLE notice_attachments DROP CONSTRAINT IF EXISTS notice_attachments_file_size_check;
ALTER TABLE notice_attachments
  ADD CONSTRAINT notice_attachments_file_size_check
  CHECK (file_size > 0 AND file_size <= 104857600); -- 100MB = 100 * 1024 * 1024

UPDATE storage.buckets
SET file_size_limit = 104857600 -- 100MB
WHERE id = 'notice-attachments';
