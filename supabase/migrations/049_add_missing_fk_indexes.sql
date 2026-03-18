-- ============================================================================
-- 049: 외래키 인덱스 누락 보완 (P2-DB-03)
-- 감사에서 5건 누락 보고, 코드베이스 전수 확인 결과 실제 누락 2건:
--   - assessment_tokens.created_by (040에서 FK 추가, 인덱스 누락)
--   - self_assessments.assessment_token_id (040에서 FK 추가, 인덱스 누락)
-- 나머지 3건은 기존 인덱스로 커버 확인 완료:
--   - projects.created_by → idx_projects_created_by (005)
--   - consultant_activity_logs.consultant_id → idx_activity_logs_consultant_created (015)
--   - conversation_participants.user_id → idx_conv_participants_user (017)
-- ============================================================================

-- 1. assessment_tokens.created_by → users(id)
-- 토큰 생성자별 조회 및 CASCADE 체크용
CREATE INDEX IF NOT EXISTS idx_assessment_tokens_created_by
  ON public.assessment_tokens (created_by);

-- 2. self_assessments.assessment_token_id → assessment_tokens(id)
-- 공개 자가진단 링크 기반 조인 및 CASCADE 체크용
CREATE INDEX IF NOT EXISTS idx_self_assessments_assessment_token_id
  ON public.self_assessments (assessment_token_id);
