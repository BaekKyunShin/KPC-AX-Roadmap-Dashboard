-- =============================================================================
-- 017: DM 메시징 테이블 + RLS 정책
-- 시스템관리자, 운영관리자, 컨설턴트 간 1:1 메시지 교환 기능
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 대화방 테이블
-- -----------------------------------------------------------------------------
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversations IS '1:1 DM 대화방';

-- -----------------------------------------------------------------------------
-- 2. 대화 참여자 테이블
-- -----------------------------------------------------------------------------
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

COMMENT ON TABLE conversation_participants IS '대화 참여자 (참여자별 읽음 시점 관리)';

-- -----------------------------------------------------------------------------
-- 3. 메시지 테이블
-- -----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'DM 메시지 (텍스트만, 최대 2000자)';

-- -----------------------------------------------------------------------------
-- 4. 인덱스
-- -----------------------------------------------------------------------------

-- 대화 목록 최신순 정렬
CREATE INDEX idx_conversations_last_message
  ON conversations (last_message_at DESC);

-- 참여자별 대화 조회
CREATE INDEX idx_conv_participants_user
  ON conversation_participants (user_id, conversation_id);

-- 대화별 참여자 조회 (RLS 서브쿼리용)
CREATE INDEX idx_conv_participants_conv
  ON conversation_participants (conversation_id, user_id);

-- 대화별 메시지 시간순 조회
CREATE INDEX idx_messages_conversation
  ON messages (conversation_id, created_at ASC);

-- 메시지 발신자 조회
CREATE INDEX idx_messages_sender
  ON messages (sender_id);

-- -----------------------------------------------------------------------------
-- 5. RLS 활성화
-- -----------------------------------------------------------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. RLS 정책 — conversations
-- -----------------------------------------------------------------------------

-- SELECT: 참여한 대화만 조회
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: 서비스 역할 전용 (Server Action에서 admin 클라이언트로 생성)
CREATE POLICY "Service role can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (TRUE);

-- UPDATE: 참여한 대화만 (last_message_at 갱신용)
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 7. RLS 정책 — conversation_participants
-- -----------------------------------------------------------------------------

-- SELECT: 참여한 대화의 참여자 정보만 조회
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: 서비스 역할 전용
CREATE POLICY "Service role can insert participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (TRUE);

-- UPDATE: 본인의 last_read_at만 갱신
CREATE POLICY "Users can update own read status"
  ON conversation_participants FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. RLS 정책 — messages
-- -----------------------------------------------------------------------------

-- SELECT: 참여한 대화의 메시지만 조회
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: 본인이 참여한 대화에만 메시지 전송 (sender_id = 본인)
CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );
