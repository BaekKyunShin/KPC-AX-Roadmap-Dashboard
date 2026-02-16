-- ============================================================================
-- 032: auth.uid() → (SELECT auth.uid()) initplan 래핑
-- 감사 이슈 #33: Supabase auth_rls_initplan WARN 해소.
-- auth.uid()가 (SELECT auth.uid())로 래핑되지 않으면 정책이 행마다
-- 재평가하여 성능 저하 가능. 002, 005에서 생성된 정책을 재생성.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. users 테이블 정책 (002 원본)
-- ============================================================================

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid()) AND
    role = (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) AND
    status = (SELECT status FROM public.users WHERE id = (SELECT auth.uid()))
  );

-- ============================================================================
-- 2. consultant_profiles 테이블 정책 (002 원본)
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.consultant_profiles;
CREATE POLICY "profiles_select_own" ON public.consultant_profiles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.consultant_profiles;
CREATE POLICY "profiles_insert_own" ON public.consultant_profiles
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.consultant_profiles;
CREATE POLICY "profiles_update_own" ON public.consultant_profiles
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 3. usage_metrics 테이블 정책 (002 원본)
-- ============================================================================

DROP POLICY IF EXISTS "metrics_select_own" ON public.usage_metrics;
CREATE POLICY "metrics_select_own" ON public.usage_metrics
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. user_quotas 테이블 정책 (002 원본)
-- ============================================================================

DROP POLICY IF EXISTS "quotas_select_own" ON public.user_quotas;
CREATE POLICY "quotas_select_own" ON public.user_quotas
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. projects 테이블 정책 (005에서 생성)
-- ============================================================================

DROP POLICY IF EXISTS "projects_select_consultant" ON public.projects;
CREATE POLICY "projects_select_consultant" ON public.projects
  FOR SELECT USING (
    is_approved_consultant() AND
    assigned_consultant_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "projects_insert_test_consultant" ON public.projects;
CREATE POLICY "projects_insert_test_consultant" ON public.projects
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "projects_select_test_own" ON public.projects;
CREATE POLICY "projects_select_test_own" ON public.projects
  FOR SELECT USING (
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "projects_update_test_own" ON public.projects;
CREATE POLICY "projects_update_test_own" ON public.projects
  FOR UPDATE USING (
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "projects_delete_test_own" ON public.projects;
CREATE POLICY "projects_delete_test_own" ON public.projects
  FOR DELETE USING (
    is_test_mode = true AND
    test_created_by = (SELECT auth.uid())
  );

-- ============================================================================
-- 6. project_assignments 테이블 정책 (005에서 생성)
-- ============================================================================

DROP POLICY IF EXISTS "project_assignments_select_consultant" ON public.project_assignments;
CREATE POLICY "project_assignments_select_consultant" ON public.project_assignments
  FOR SELECT USING (
    is_approved_consultant() AND
    consultant_id = (SELECT auth.uid())
  );

-- ============================================================================
-- 7. interviews 테이블 정책 (005에서 생성)
-- ============================================================================

DROP POLICY IF EXISTS "interviews_insert_consultant" ON public.interviews;
CREATE POLICY "interviews_insert_consultant" ON public.interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    interviewer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "interviews_update_consultant" ON public.interviews;
CREATE POLICY "interviews_update_consultant" ON public.interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    interviewer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "interviews_insert_test" ON public.interviews;
CREATE POLICY "interviews_insert_test" ON public.interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    ) AND
    interviewer_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "interviews_select_test" ON public.interviews;
CREATE POLICY "interviews_select_test" ON public.interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "interviews_update_test" ON public.interviews;
CREATE POLICY "interviews_update_test" ON public.interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    ) AND
    interviewer_id = (SELECT auth.uid())
  );

-- ============================================================================
-- 8. roadmap_versions 테이블 정책 (005에서 생성)
-- ============================================================================

DROP POLICY IF EXISTS "roadmaps_insert_consultant" ON public.roadmap_versions;
CREATE POLICY "roadmaps_insert_consultant" ON public.roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "roadmaps_update_consultant" ON public.roadmap_versions;
CREATE POLICY "roadmaps_update_consultant" ON public.roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    (
      status = 'DRAFT' OR
      (status = 'FINAL' AND finalized_by = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "roadmaps_insert_test" ON public.roadmap_versions;
CREATE POLICY "roadmaps_insert_test" ON public.roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    ) AND
    created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "roadmaps_select_test" ON public.roadmap_versions;
CREATE POLICY "roadmaps_select_test" ON public.roadmap_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "roadmaps_update_test" ON public.roadmap_versions;
CREATE POLICY "roadmaps_update_test" ON public.roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = (SELECT auth.uid())
    ) AND
    created_by = (SELECT auth.uid())
  );

COMMIT;
