-- ============================================================
-- 062_add_notices.sql
-- 목적: 공지 게시판 + 첨부 파일 + Storage 버킷 + RLS + 조회수 RPC
-- OFA 개편 Step 2
-- ============================================================

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 50000),
  -- 작성자 탈퇴 시 공지는 보존되어야 하므로 NOT NULL 제거 + ON DELETE SET NULL 유지.
  -- NOT NULL 유지 시 사용자 삭제 시점에 FK 제약 실패로 삭제가 차단된다.
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notices_pinned_created ON notices (is_pinned DESC, created_at DESC);
CREATE INDEX idx_notices_author ON notices (author_id);

CREATE TABLE notice_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE, -- Supabase Storage 경로
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 20971520), -- 20MB
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notice_attachments_notice ON notice_attachments (notice_id);

-- ------------------------------------------------------------
-- RLS
-- 참고: is_ops_admin_or_higher()는 OPS_ADMIN + SYSTEM_ADMIN 두 역할을 모두 포괄한다.
--       별도의 is_system_admin() 함수는 프로젝트에 존재하지 않는다.
-- ------------------------------------------------------------
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_attachments ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 컨설턴트·운영자·시스템관리자 조회 가능
CREATE POLICY notices_select ON notices
  FOR SELECT USING (
    is_approved_consultant()
    OR is_ops_admin_or_higher()
  );

-- 작성/수정/삭제는 OPS_ADMIN + SYSTEM_ADMIN만 (is_ops_admin_or_higher가 포괄)
CREATE POLICY notices_mutate_ops_sys ON notices
  FOR ALL USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- 첨부 파일 RLS — notice와 동일한 접근 규칙
CREATE POLICY notice_attachments_select ON notice_attachments
  FOR SELECT USING (
    is_approved_consultant()
    OR is_ops_admin_or_higher()
  );

CREATE POLICY notice_attachments_mutate_ops_sys ON notice_attachments
  FOR ALL USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- ------------------------------------------------------------
-- 조회수 증가 전용 RPC (RLS 우회를 위한 security definer)
-- 마이그 026 패턴 준수: SECURITY DEFINER + SET search_path = '' + 모든 객체 fully-qualified
-- 방어: SECURITY DEFINER는 RLS를 우회하므로 인증된 사용자만 호출 가능하도록 auth.uid() 확인.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_notice_view_count(p_notice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  UPDATE public.notices SET view_count = view_count + 1 WHERE id = p_notice_id;
END;
$$;

COMMENT ON TABLE notices IS '운영자가 양식 파일·공지를 올리는 게시판.';

-- ============================================================
-- Supabase Storage 버킷 생성 + RLS
-- 대시보드 수동 작업 대신 SQL로 코드 관리 (재현성·감사성 확보)
-- 재실행 주의: ON CONFLICT DO UPDATE는 기존 버킷의 public/file_size_limit/allowed_mime_types를
-- 본 마이그의 값으로 덮어쓴다. 운영 중 버킷 정책을 수동으로 조정한 상태라면 재실행 전 현재 값을 백업.
-- 본 프로젝트에서는 버킷 설정을 항상 마이그레이션 SQL에서만 관리한다.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notice-attachments',
  'notice-attachments',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'application/vnd.hancom.hwpx',
    'application/x-hwp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 업로드/조회는 notices 테이블 RLS와 동일 규칙 (storage.objects RLS)
-- Supabase 일부 환경에서는 storage.objects 정책 생성을 Dashboard에서만 허용한다.
-- 자동 SQL이 실패하면 Dashboard로 폴백하되, 동일 규칙을 재현한다.
CREATE POLICY "notice_attachments_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'notice-attachments'
    AND (is_approved_consultant() OR is_ops_admin_or_higher())
  );

CREATE POLICY "notice_attachments_storage_mutate_ops_sys" ON storage.objects
  FOR ALL USING (
    bucket_id = 'notice-attachments'
    AND is_ops_admin_or_higher()
  )
  WITH CHECK (
    bucket_id = 'notice-attachments'
    AND is_ops_admin_or_higher()
  );
