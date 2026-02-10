-- =============================================================================
-- 016: 알림(notifications) 테이블 + RLS 정책
-- 목적: 컨설턴트/관리자에게 시스템 이벤트를 알림으로 전달
-- =============================================================================

-- 알림 타입 ENUM
CREATE TYPE notification_type AS ENUM (
  'assignment',       -- 새 프로젝트 배정
  'deadline',         -- 마감 임박
  'status_change',    -- 프로젝트 상태 변경
  'message',          -- 운영관리자 코멘트
  'system'            -- 시스템 알림 (로드맵 생성 완료 등)
);

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS '사용자별 인앱 알림 (배정, 마감, 상태변경, 메시지, 시스템)';

-- 인덱스: 사용자별 최신 알림 조회
CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- 인덱스: 안읽음 카운트 조회 최적화 (부분 인덱스)
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id)
  WHERE is_read = FALSE;

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- UPDATE: 본인 알림만 읽음 처리 가능
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- INSERT: 서비스 역할 키로만 생성 (서버 사이드)
-- Supabase admin 클라이언트(service_role)는 RLS를 우회하므로
-- 일반 사용자의 INSERT는 차단됨 (별도 INSERT 정책 없음)
