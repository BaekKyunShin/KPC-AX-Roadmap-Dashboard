-- =============================================================================
-- 018: 메시징 RLS 무한 재귀 수정
-- conversation_participants의 SELECT 정책이 자기 자신을 참조하여 무한 재귀 발생.
-- SECURITY DEFINER 헬퍼 함수를 만들어 재귀를 끊음.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS 헬퍼 함수: 대화 참여 여부 확인
-- SECURITY DEFINER: RLS 내부에서 호출 시 무한 재귀 방지 (RLS 우회)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_conversation_member(UUID)
  IS 'RLS 헬퍼: 현재 사용자가 해당 대화의 참여자인지 확인 (SECURITY DEFINER로 무한 재귀 방지)';

-- -----------------------------------------------------------------------------
-- 2. conversation_participants 정책 재생성
-- DROP: 자기 참조로 무한 재귀를 일으키던 기존 SELECT 정책 제거
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view participants of own conversations"
  ON public.conversation_participants;

-- SELECT: 본인이 참여한 대화의 모든 참여자 정보 조회 가능
CREATE POLICY "Users can view participants of own conversations"
  ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_member(conversation_id));

-- -----------------------------------------------------------------------------
-- 3. conversations 정책 재생성 (헬퍼 함수 통일)
-- DROP: 기존 서브쿼리 방식 정책 제거 → 헬퍼 함수 사용으로 통일
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own conversations"
  ON public.conversations;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "Users can update own conversations"
  ON public.conversations;

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (public.is_conversation_member(id));

-- -----------------------------------------------------------------------------
-- 4. messages 정책 재생성 (헬퍼 함수 통일)
-- DROP: 기존 서브쿼리 방식 정책 제거 → 헬퍼 함수 사용으로 통일
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages in own conversations"
  ON public.messages;

CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages to own conversations"
  ON public.messages;

CREATE POLICY "Users can send messages to own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id)
  );
