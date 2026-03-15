-- ============================================
-- 044: audit_logs 아카이빙 정책
-- 목적: 오래된 감사 로그를 아카이브 테이블로 이동하여 원본 테이블 성능 유지
-- ============================================

-- 1. 아카이브 테이블 생성 (원본과 동일 스키마, FK 제약 없음)
CREATE TABLE audit_logs_archive (
  id UUID PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  action audit_action NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 아카이브 테이블 인덱스
CREATE INDEX idx_audit_logs_archive_created_at
  ON audit_logs_archive (created_at DESC);

CREATE INDEX idx_audit_logs_archive_actor_user_id
  ON audit_logs_archive (actor_user_id);

-- 3. 아카이빙 RPC 함수 — 원자적 DELETE → INSERT (단일 CTE)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention_days INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 4. 사용법 문서화
COMMENT ON TABLE audit_logs_archive IS
  '감사 로그 아카이브 테이블. archive_old_audit_logs() 함수로 기본 90일 이상 된 로그를 이동합니다.';

COMMENT ON FUNCTION archive_old_audit_logs(INT) IS
  '지정된 보존 기간(기본 90일)보다 오래된 audit_logs 레코드를 audit_logs_archive로 원자적 이동합니다. '
  '이동된 행 수를 반환합니다. '
  'Supabase에서는 pg_cron을 사용할 수 없으므로, 외부 스케줄러(GitHub Actions cron, Supabase Edge Function + pg_net 등)에서 '
  'SELECT archive_old_audit_logs(90); 을 주기적으로 호출하세요.';
