-- 079: audit_logs 액터·대상 필터 복합 인덱스 추가 (버그 감사 #017)
-- fetchAuditLogs() 는 actor_user_id / target_type 필터를 항상 created_at DESC 정렬 +
-- 페이지네이션과 함께 쓴다. 기존 인덱스는 정렬 컬럼을 포함하지 않아 필터 후 별도 정렬이 필요했다:
--   - idx_audit_logs_actor        (actor_user_id)            -- 001, 정렬 미포함
--   - idx_audit_logs_target       (target_type, target_id)   -- 001, 두 번째 키가 created_at 이 아님
--   - idx_audit_logs_created_at   (created_at DESC)          -- 001, 필터 미포함
-- 052 가 action 에 적용한 (필터, created_at DESC) 패턴을 나머지 두 필터에도 동일하게 적용한다.
-- 기존 단일 인덱스는 target_id 단독 조회 등 다른 경로가 쓰므로 삭제하지 않는다.

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at
  ON public.audit_logs (actor_user_id, created_at DESC);

COMMENT ON INDEX idx_audit_logs_actor_created_at IS
  'actor_user_id 필터 + created_at DESC 정렬 복합 쿼리 최적화 (버그 감사 #017)';

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_created_at
  ON public.audit_logs (target_type, created_at DESC);

COMMENT ON INDEX idx_audit_logs_target_type_created_at IS
  'target_type 필터 + created_at DESC 정렬 복합 쿼리 최적화 (버그 감사 #017)';
