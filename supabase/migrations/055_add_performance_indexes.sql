-- ============================================================================
-- 055: 성능 최적화 복합 인덱스 추가
-- 코드베이스 전수 감사 결과, 자주 사용되는 쿼리 패턴에 복합 인덱스 추가
-- SELECT 성능 향상, INSERT/UPDATE 오버헤드 미미
-- ============================================================================

-- 1. 컨설턴트 담당 프로젝트 목록 (consultant/projects/actions.ts)
-- 쿼리: assigned_consultant_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_projects_consultant_status_created
  ON public.projects (assigned_consultant_id, status, created_at DESC);

-- 2. 갤러리 로드맵 조회 (gallery/actions/queries.ts)
-- 쿼리: status = ? AND is_shared = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_status_shared
  ON public.roadmap_versions (status, is_shared, created_at DESC);

-- 3. 메시지 커서 페이지네이션 (messages/actions.ts)
-- 쿼리: conversation_id = ? ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

-- 4. 대화 참여자 복합 조회 (messages/actions.ts)
-- 쿼리: conversation_id IN (...) AND user_id != ?
-- 기존 idx_conv_participants_user (user_id only) → 복합으로 보완
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_user
  ON public.conversation_participants (conversation_id, user_id);
