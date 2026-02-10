-- =============================================================================
-- 020: 메시징 테이블 INSERT 정책 보안 강화
-- conversations, conversation_participants의 INSERT 정책이 WITH CHECK (TRUE)로
-- 모든 인증 사용자에게 열려 있었음.
-- 실제로는 createAdminClient()가 RLS를 우회하므로 INSERT 정책이 불필요.
-- 보안을 위해 일반 사용자의 INSERT를 차단.
-- =============================================================================

-- DROP: 기존 과도하게 열린 INSERT 정책 제거
DROP POLICY IF EXISTS "Service role can insert conversations"
  ON public.conversations;

DROP POLICY IF EXISTS "Service role can insert participants"
  ON public.conversation_participants;
