-- ============================================
-- 068: 마이그 066 회귀 수정
-- 배경: 066 에서 increment_like_count / decrement_like_count 를
--       CREATE OR REPLACE 재정의할 때 SECURITY DEFINER 가 누락되어
--       SECURITY INVOKER (기본값) 로 변경됨. 두 함수는 트리거 함수이며
--       호출자(일반 사용자)는 roadmap_versions.like_count 를 UPDATE 할
--       RLS 권한이 없어 좋아요 토글이 런타임 실패 가능.
--
--       또한 archive_old_audit_logs 의 SET search_path = public 을
--       공식 패턴 SET search_path = '' + 완전 한정명 (public.*) 으로 복원.
--
-- 참고: docs/2026-04-19-session11-security-audit.md H-1, M-3
-- ============================================

-- 1. 트리거 함수 SECURITY DEFINER 복원 (+ 공식 search_path 패턴)
CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.roadmap_versions
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = OLD.roadmap_version_id;
  RETURN OLD;
END;
$$;

-- 2. archive_old_audit_logs 공식 search_path 패턴으로 재작성
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs(retention_days INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  moved_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING *
  )
  INSERT INTO public.audit_logs_archive (
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
