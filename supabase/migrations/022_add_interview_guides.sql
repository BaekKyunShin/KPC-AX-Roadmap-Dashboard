-- ============================================================================
-- 022: 인터뷰 사전 분석 가이드 테이블 추가
-- 목적: 컨설턴트가 AI를 활용하여 인터뷰 사전 분석 가이드를 생성/관리
-- ============================================================================

-- 테이블 생성
CREATE TABLE public.interview_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guide_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id)  -- 프로젝트당 1개
);

COMMENT ON TABLE public.interview_guides IS '인터뷰 사전 분석 가이드 (프로젝트당 1개, AI 생성)';

-- RLS 활성화
ALTER TABLE public.interview_guides ENABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_interview_guides_project_id ON public.interview_guides(project_id);

-- ============================================================================
-- RLS 정책: 배정된 컨설턴트만 자신의 프로젝트 가이드 접근
-- ============================================================================

-- SELECT: 배정된 컨설턴트 또는 운영관리자 이상
CREATE POLICY "interview_guides_select"
  ON public.interview_guides
  FOR SELECT
  USING (
    is_assigned_to_project(project_id)
    OR is_ops_admin_or_higher()
  );

-- INSERT: 배정된 컨설턴트만
CREATE POLICY "interview_guides_insert"
  ON public.interview_guides
  FOR INSERT
  WITH CHECK (
    is_assigned_to_project(project_id)
  );

-- UPDATE: 배정된 컨설턴트만
CREATE POLICY "interview_guides_update"
  ON public.interview_guides
  FOR UPDATE
  USING (
    is_assigned_to_project(project_id)
  )
  WITH CHECK (
    is_assigned_to_project(project_id)
  );

-- DELETE: 배정된 컨설턴트만
CREATE POLICY "interview_guides_delete"
  ON public.interview_guides
  FOR DELETE
  USING (
    is_assigned_to_project(project_id)
  );

-- ============================================================================
-- updated_at 자동 갱신 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_interview_guides_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_interview_guides_updated_at
  BEFORE UPDATE ON public.interview_guides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_interview_guides_updated_at();
