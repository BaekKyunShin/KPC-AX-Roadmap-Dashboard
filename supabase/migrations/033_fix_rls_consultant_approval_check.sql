-- ============================================================================
-- 033: RLS 정책에 is_approved_consultant() 체크 추가
-- 목적: 정지된(SUSPENDED) 컨설턴트가 테스트 인터뷰 조회 및 인터뷰 가이드
--       수정/삭제를 할 수 없도록 승인 상태 확인 조건 추가
-- 감사 이슈: #34, #35
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. interviews 테이블: interviews_select_test 정책 (#34)
--    기존: EXISTS 서브쿼리로 test_created_by 확인만 수행
--    변경: is_approved_consultant() AND 조건 추가
-- ============================================================================

DROP POLICY IF EXISTS "interviews_select_test" ON public.interviews;
CREATE POLICY "interviews_select_test" ON public.interviews
  FOR SELECT USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 2. interview_guides 테이블: INSERT/UPDATE/DELETE 정책 (#35)
--    기존: is_assigned_to_project()만 확인
--    변경: is_approved_consultant() AND 조건 추가
-- ============================================================================

-- INSERT
DROP POLICY IF EXISTS "interview_guides_insert" ON public.interview_guides;
CREATE POLICY "interview_guides_insert" ON public.interview_guides
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

-- UPDATE
DROP POLICY IF EXISTS "interview_guides_update" ON public.interview_guides;
CREATE POLICY "interview_guides_update" ON public.interview_guides
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  )
  WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

-- DELETE
DROP POLICY IF EXISTS "interview_guides_delete" ON public.interview_guides;
CREATE POLICY "interview_guides_delete" ON public.interview_guides
  FOR DELETE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

COMMIT;
