-- ============================================
-- Migration 003: 로드맵 파일 스토리지 지원
-- ============================================

-- 로드맵 버전 테이블에 스토리지 경로 컬럼 추가
ALTER TABLE roadmap_versions
ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
ADD COLUMN IF NOT EXISTS storage_path_xlsx TEXT;

-- 스토리지 정책 인덱스 (FINAL 버전 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_final
ON roadmap_versions(case_id, status)
WHERE status = 'FINAL';

-- 스토리지 버킷 생성은 Supabase 대시보드 또는 코드에서 처리
-- 버킷 이름: roadmap-exports
-- 권한: 인증된 사용자만 접근 가능

COMMENT ON COLUMN roadmap_versions.storage_path_pdf IS 'FINAL 버전의 PDF 파일 경로 (Supabase Storage)';
COMMENT ON COLUMN roadmap_versions.storage_path_xlsx IS 'FINAL 버전의 XLSX 파일 경로 (Supabase Storage)';
