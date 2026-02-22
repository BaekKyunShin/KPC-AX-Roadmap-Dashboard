-- 안읽음 대화 수를 한 번의 쿼리로 반환하는 RPC 함수
-- N+1 루프(대화별 messages 조회)를 단일 집계 쿼리로 대체합니다.

CREATE OR REPLACE FUNCTION get_unread_conversation_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(COUNT(DISTINCT cp.conversation_id), 0)::INTEGER
  FROM public.conversation_participants cp
  JOIN public.messages m ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
$$;

COMMENT ON FUNCTION get_unread_conversation_count IS '사용자의 안읽음 대화 수를 반환 (네비게이션 뱃지용)';
