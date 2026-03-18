-- ============================================================================
-- 051: 소프트 삭제 도입 (P2-DB-02)
-- 감사 추적이 필요한 2개 테이블에 deleted_at 컬럼 추가
-- 대상: self_assessment_templates, consultant_activity_logs
-- 제외: roadmap_likes (좋아요 토글), matching_recommendations (재계산 전체 교체)
-- ============================================================================

-- ======== 1. self_assessment_templates ========

ALTER TABLE public.self_assessment_templates
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.self_assessment_templates.deleted_at
  IS '소프트 삭제 시점. NULL이면 활성 레코드.';

-- 부분 인덱스: 삭제되지 않은 레코드 빠른 필터링
CREATE INDEX idx_templates_not_deleted
  ON public.self_assessment_templates (id) WHERE deleted_at IS NULL;

-- 일반 사용자 활성 템플릿 조회: deleted_at IS NULL 조건 추가
DROP POLICY IF EXISTS "templates_select_active" ON public.self_assessment_templates;
CREATE POLICY "templates_select_active" ON public.self_assessment_templates
  FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);

-- DELETE 정책 제거 (소프트 삭제는 UPDATE로 처리, templates_update_ops 정책 활용)
DROP POLICY IF EXISTS "templates_delete_ops" ON public.self_assessment_templates;

-- templates_select_ops 유지 — OPS_ADMIN은 삭제된 것도 감사 목적으로 열람 가능

-- ======== 2. consultant_activity_logs ========

ALTER TABLE public.consultant_activity_logs
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.consultant_activity_logs.deleted_at
  IS '소프트 삭제 시점. NULL이면 활성 레코드.';

-- 부분 인덱스: 삭제되지 않은 레코드 빠른 필터링
CREATE INDEX idx_activity_logs_not_deleted
  ON public.consultant_activity_logs (id) WHERE deleted_at IS NULL;

-- 컨설턴트 조회: deleted_at IS NULL 조건 추가
DROP POLICY IF EXISTS "activity_logs_select_consultant" ON public.consultant_activity_logs;
CREATE POLICY "activity_logs_select_consultant"
  ON public.consultant_activity_logs
  FOR SELECT USING (
    consultant_id = (SELECT auth.uid())
    AND is_assigned_to_project(project_id)
    AND deleted_at IS NULL
  );

-- DELETE 정책 제거 (소프트 삭제는 UPDATE로 처리, activity_logs_update_consultant 정책 활용)
DROP POLICY IF EXISTS "activity_logs_delete_consultant" ON public.consultant_activity_logs;

-- activity_logs_select_ops 유지 — OPS_ADMIN은 삭제된 것도 감사 목적으로 열람 가능
