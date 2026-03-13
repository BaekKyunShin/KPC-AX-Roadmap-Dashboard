-- 043_get_last_messages.sql
-- 목적: 대화별 마지막 메시지를 단일 쿼리로 조회 (N+1 제거)

CREATE OR REPLACE FUNCTION public.get_last_messages_for_conversations(
  p_conversation_ids UUID[]
)
RETURNS TABLE (
  conversation_id UUID,
  content TEXT,
  sender_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.content,
    m.sender_id,
    m.created_at
  FROM public.messages m
  WHERE m.conversation_id = ANY(p_conversation_ids)
  ORDER BY m.conversation_id, m.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_last_messages_for_conversations IS
  '대화 ID 배열에 대해 각 대화의 마지막 메시지를 DISTINCT ON으로 단일 쿼리 조회합니다.';
