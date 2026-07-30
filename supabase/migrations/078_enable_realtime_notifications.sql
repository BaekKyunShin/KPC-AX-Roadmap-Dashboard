-- =============================================================================
-- 078: notifications 테이블 Realtime 활성화 (버그 감사 #008)
--
-- 배경: 헤더 종 아이콘(`NotificationBell`)은 30초 polling 만 하므로 새 알림이 최대
-- 30초 늦게 보인다. 같은 헤더의 메시지 아이콘(`MessageIcon`)은
-- `019_enable_realtime_messages.sql` 로 `messages` 를 publication 에 추가해 Realtime
-- 으로 즉시 갱신한다. `notifications` 는 publication 에서 빠져 있어, **컴포넌트에
-- 구독 코드를 붙여도 이벤트가 오지 않는다** — 그래서 이 마이그레이션이 함께 필요하다.
--
-- RLS 정책(`Users can view own notifications`: auth.uid() = user_id)이 Realtime 에도
-- 적용되므로 사용자는 **자신의 알림만** 수신한다. INSERT 이벤트만 구독하므로 기본
-- REPLICA IDENTITY(primary key)로 충분하다 — FULL 로 올리지 않는다(WAL 증가 회피).
--
-- 019 와 달리 존재 여부를 먼저 확인한다(ALTER PUBLICATION 은 중복 추가 시 에러) —
-- `supabase db reset` 재실행·수동 적용 이력이 섞여도 안전하도록 멱등으로 둔다.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
