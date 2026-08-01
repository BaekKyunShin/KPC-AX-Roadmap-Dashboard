-- 080: 인덱스 위생 정리 — 중복 인덱스 제거 + FK 커버링 인덱스 추가 (성능 감사 2026-07-31)
--
-- (a) conversation_participants 중복 인덱스 2건 제거
--     같은 컬럼·순서 (conversation_id, user_id) 를 가리키는 인덱스가 3개 존재했다:
--       - conversation_participants_conversation_id_user_id_key  UNIQUE  -- 017:26 UNIQUE 제약이 생성, 유지
--       - idx_conv_participants_conv                             btree   -- 017:57
--       - idx_conv_participants_conv_user                        btree   -- 055:25
--     UNIQUE 인덱스가 동일 컬럼·순서를 이미 커버하므로 일반 btree 2개는 조회에 기여하지 않고
--     쓰기 비용·저장 공간만 소모한다.
--     ⚠️ idx_conv_participants_user 는 (user_id, conversation_id) 로 선두 컬럼이 달라 별개다 — 유지.
--
-- (b) FK 커버링 인덱스 3건 추가
--     외래키 컬럼을 선두로 하는 인덱스가 없으면 참조 무결성 검사(부모 행 UPDATE/DELETE 시)와
--     해당 컬럼 조회가 순차 스캔이 된다. pg_constraint 실측으로 누락 3건을 확인했다.

DROP INDEX IF EXISTS public.idx_conv_participants_conv_user;
DROP INDEX IF EXISTS public.idx_conv_participants_conv;

CREATE INDEX IF NOT EXISTS idx_pbl_reports_created_by
  ON public.pbl_reports (created_by);

COMMENT ON INDEX idx_pbl_reports_created_by IS
  'FK pbl_reports_created_by_fkey 커버링 (성능 감사 2026-07-31)';

CREATE INDEX IF NOT EXISTS idx_pbl_reports_finalized_by
  ON public.pbl_reports (finalized_by);

COMMENT ON INDEX idx_pbl_reports_finalized_by IS
  'FK pbl_reports_finalized_by_fkey 커버링 (성능 감사 2026-07-31)';

CREATE INDEX IF NOT EXISTS idx_projects_closed_by
  ON public.projects (closed_by);

COMMENT ON INDEX idx_projects_closed_by IS
  'FK projects_closed_by_fkey 커버링 (성능 감사 2026-07-31)';
