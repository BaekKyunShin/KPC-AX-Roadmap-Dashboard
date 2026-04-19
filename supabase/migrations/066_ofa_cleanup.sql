-- ============================================
-- 066: OFA-12 최종 정리 — advisor 보안 경고 해결
-- 목적:
--   (1) audit_logs_archive 테이블 RLS 활성화 + 정책 추가 (supabase-advisor ERROR rls_disabled_in_public)
--   (2) 3개 함수(archive_old_audit_logs, increment_like_count, decrement_like_count)
--       에 SET search_path 지정 (supabase-advisor WARN function_search_path_mutable)
--
-- 비고:
--   - 계획서 §4 Step 12 Task 2 의 roadmap_versions.pbl_course DROP 은 철회.
--     `pbl_course` 는 Step 6.5 에서 확장된 활성 JSONB 컬럼으로 로드맵 핵심 데이터를 담고 있다.
--     상세 근거: docs/2026-04-19-ofa-12-pbl-course-decision.md
-- ============================================

-- ────────────────────────────────────────────
-- 1. audit_logs_archive RLS 활성화
-- ────────────────────────────────────────────
ALTER TABLE public.audit_logs_archive ENABLE ROW LEVEL SECURITY;

-- 감사 아카이브는 시스템 수준 데이터이므로 운영관리자 이상만 조회 가능.
-- 쓰기는 SECURITY DEFINER 함수(archive_old_audit_logs)를 통해서만 발생하므로 정책 불필요.
DROP POLICY IF EXISTS "audit_logs_archive_select_ops" ON public.audit_logs_archive;
CREATE POLICY "audit_logs_archive_select_ops"
  ON public.audit_logs_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('OPS_ADMIN', 'SYSTEM_ADMIN')
    )
  );

COMMENT ON POLICY "audit_logs_archive_select_ops" ON public.audit_logs_archive IS
  'OPS_ADMIN/SYSTEM_ADMIN 만 아카이브 감사로그 조회. INSERT 는 SECURITY DEFINER 함수를 통해서만 발생하므로 정책 없음.';

-- ────────────────────────────────────────────
-- 2. archive_old_audit_logs — search_path 고정
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(retention_days INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING *
  )
  INSERT INTO audit_logs_archive (
    id, actor_user_id, action, target_type, target_id,
    meta, success, error_message, created_at
  )
  SELECT
    id, actor_user_id, action, target_type, target_id,
    meta, success, error_message, created_at
  FROM deleted;

  GET DIAGNOSTICS moved_count = ROW_COUNT;
  RETURN moved_count;
END;
$$;

-- ────────────────────────────────────────────
-- 3. increment_like_count / decrement_like_count — search_path 고정
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.roadmap_versions
  SET like_count = like_count + 1
  WHERE id = NEW.roadmap_version_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.roadmap_versions
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.roadmap_version_id;
  RETURN OLD;
END;
$$;
