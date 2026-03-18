-- 052: audit_logs (action, created_at DESC) 복합 인덱스 추가 (P1-DB-01)
-- fetchAuditLogs()에서 action 필터 + created_at 정렬 조합이 주요 패턴
-- 기존 단일 인덱스(idx_audit_logs_action, idx_audit_logs_created_at)는 bitmap AND 유발

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON public.audit_logs (action, created_at DESC);

COMMENT ON INDEX idx_audit_logs_action_created_at IS
  'action 필터 + created_at DESC 정렬 복합 쿼리 최적화 (P1-DB-01)';
