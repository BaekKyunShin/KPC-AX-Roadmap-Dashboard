-- ============================================================================
-- 034: 테스트 모드 정책에 is_approved_consultant() 체크 추가
-- 목적: 정지된(SUSPENDED) 컨설턴트가 테스트 프로젝트/로드맵을 조회·수정·삭제할
--       수 없도록 승인 상태 확인 조건 추가. INSERT 정책에는 이미 적용되어 있으나
--       SELECT/UPDATE/DELETE에는 누락된 상태를 해소.
-- 코드 리뷰에서 발견 (033과 동일 패턴)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. projects 테이블: SELECT/UPDATE/DELETE 테스트 정책
-- ============================================================================

-- SELECT
DROP POLICY IF EXISTS "projects_select_test_own" ON public.projects;
CREATE POLICY "projects_select_test_own" ON public.projects
  FOR SELECT USING (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

-- UPDATE
DROP POLICY IF EXISTS "projects_update_test_own" ON public.projects;
CREATE POLICY "projects_update_test_own" ON public.projects
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

-- DELETE
DROP POLICY IF EXISTS "projects_delete_test_own" ON public.projects;
CREATE POLICY "projects_delete_test_own" ON public.projects
  FOR DELETE USING (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

-- ============================================================================
-- 2. roadmap_versions 테이블: SELECT 테스트 정책
-- ============================================================================

DROP POLICY IF EXISTS "roadmaps_select_test" ON public.roadmap_versions;
CREATE POLICY "roadmaps_select_test" ON public.roadmap_versions
  FOR SELECT USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    )
  );

COMMIT;
