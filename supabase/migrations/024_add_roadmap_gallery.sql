-- ============================================================
-- Migration 024: 로드맵 갤러리 기능
-- ============================================================
-- 변경 내용:
-- 1. roadmap_versions에 is_shared 컬럼 추가
-- 2. roadmap_likes 테이블 생성
-- 3. RLS 정책 추가
-- ============================================================

-- 1. roadmap_versions에 is_shared 컬럼 추가
ALTER TABLE roadmap_versions
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN roadmap_versions.is_shared
IS '갤러리 공유 여부. FINAL 버전만 공유 가능';

-- is_shared 인덱스 (갤러리 조회 시 사용)
CREATE INDEX idx_roadmap_versions_shared ON roadmap_versions(is_shared)
WHERE is_shared = TRUE AND status = 'FINAL';

-- 2. roadmap_likes 테이블 생성
CREATE TABLE roadmap_likes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_version_id UUID NOT NULL REFERENCES roadmap_versions(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, roadmap_version_id)
);

COMMENT ON TABLE roadmap_likes IS '로드맵 갤러리 좋아요';

ALTER TABLE roadmap_likes ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_roadmap_likes_version ON roadmap_likes(roadmap_version_id);
CREATE INDEX idx_roadmap_likes_user    ON roadmap_likes(user_id);

-- 3. 감사 로그 액션 추가
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROADMAP_COPY';

-- 4. RLS 정책 — roadmap_likes
-- 조회: 로그인 사용자 전체
CREATE POLICY "roadmap_likes_select_authenticated"
  ON roadmap_likes FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 추가: 본인 좋아요만
CREATE POLICY "roadmap_likes_insert_own"
  ON roadmap_likes FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 삭제: 본인 좋아요만
CREATE POLICY "roadmap_likes_delete_own"
  ON roadmap_likes FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 5. RLS 정책 — roadmap_versions (갤러리 공유)
-- 공유된 FINAL 로드맵은 모든 인증된 사용자가 열람 가능
CREATE POLICY "roadmaps_select_shared_gallery"
  ON roadmap_versions FOR SELECT
  USING (is_shared = TRUE AND status = 'FINAL' AND (SELECT auth.uid()) IS NOT NULL);
