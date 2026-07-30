-- =============================================================================
-- 077: 알림 목록 type 필터 복합 인덱스 추가 (버그 감사 #016)
--
-- 배경: 운영관리자의 알림 벨·알림 페이지는 탭으로 `type` 을 필터한다
--   (`OPS_NOTIFICATION_TABS` → `fetchNotifications(page, type)`).
-- 기존 인덱스는 `016_add_notifications.sql` 의 두 개뿐이다:
--   idx_notifications_user_created  (user_id, created_at DESC)
--   idx_notifications_user_unread   (user_id, is_read)
-- 그래서 type 을 함께 거는 조회는 user_id 로만 좁힌 뒤 나머지를 훑고 정렬한다.
-- 알림이 수백~수천 건 누적된 계정에서 목록 응답이 눈에 띄게 느려진다.
--
-- 정렬 방향까지 인덱스에 담아(created_at DESC) 필터 + 최신순을 한 번에 처리한다.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);

COMMENT ON INDEX public.idx_notifications_user_type_created IS
  '알림 탭(type) 필터 + 최신순 정렬용 복합 인덱스 — 버그 감사 #016';
