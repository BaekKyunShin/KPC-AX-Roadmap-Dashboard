-- ============================================
-- Migration 015: 컨설턴트 활동 일지 테이블 추가
-- ============================================
-- 목적: 컨설턴트가 프로젝트별로 활동 기록(사전조사, 현장메모,
--       후속조치, 기업피드백)을 남기고, 시스템이 자동 기록을
--       삽입하는 타임라인 기능 지원
-- ============================================

-- ============================================
-- 1. activity_log_type ENUM 생성
-- ============================================

CREATE TYPE activity_log_type AS ENUM (
  'pre_research',
  'field_note',
  'follow_up',
  'client_feedback',
  'system_auto'
);

COMMENT ON TYPE activity_log_type IS '활동 일지 유형: 사전조사, 현장메모, 후속조치, 기업피드백, 시스템자동';

-- ============================================
-- 2. consultant_activity_logs 테이블 생성
-- ============================================

CREATE TABLE consultant_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type activity_log_type NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultant_activity_logs IS '컨설턴트 프로젝트별 활동 일지 (수동 기록 + 시스템 자동 기록)';

-- ============================================
-- 3. 인덱스
-- ============================================

-- 프로젝트별 + 시간순 조회 (메인 쿼리)
CREATE INDEX idx_activity_logs_project_created
  ON consultant_activity_logs (project_id, created_at DESC);

-- 컨설턴트별 조회 (대시보드 최근 활동용)
CREATE INDEX idx_activity_logs_consultant_created
  ON consultant_activity_logs (consultant_id, created_at DESC);

-- 유형 필터 조회
CREATE INDEX idx_activity_logs_project_type
  ON consultant_activity_logs (project_id, type);

-- ============================================
-- 4. updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_activity_log_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_log_updated_at
  BEFORE UPDATE ON public.consultant_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_log_updated_at();

-- ============================================
-- 5. RLS 활성화 및 정책
-- ============================================

ALTER TABLE consultant_activity_logs ENABLE ROW LEVEL SECURITY;

-- 컨설턴트: 자신이 작성한 로그만 조회
CREATE POLICY "activity_logs_select_consultant"
  ON consultant_activity_logs
  FOR SELECT
  USING (
    consultant_id = (SELECT auth.uid())
    AND is_assigned_to_project(project_id)
  );

-- 컨설턴트: 자신의 프로젝트에 수동 로그만 삽입 (system_auto는 서비스 역할 키로만 삽입)
CREATE POLICY "activity_logs_insert_consultant"
  ON consultant_activity_logs
  FOR INSERT
  WITH CHECK (
    consultant_id = (SELECT auth.uid())
    AND is_approved_consultant()
    AND is_assigned_to_project(project_id)
    AND type != 'system_auto'
  );

-- 컨설턴트: 자신의 수동 기록만 수정 (시스템 자동 기록 수정 불가)
CREATE POLICY "activity_logs_update_consultant"
  ON consultant_activity_logs
  FOR UPDATE
  USING (
    consultant_id = (SELECT auth.uid())
    AND type != 'system_auto'
  )
  WITH CHECK (
    consultant_id = (SELECT auth.uid())
    AND type != 'system_auto'
  );

-- 컨설턴트: 자신의 수동 기록만 삭제 (시스템 자동 기록 삭제 불가)
CREATE POLICY "activity_logs_delete_consultant"
  ON consultant_activity_logs
  FOR DELETE
  USING (
    consultant_id = (SELECT auth.uid())
    AND type != 'system_auto'
  );

-- OPS_ADMIN 이상: 모든 로그 조회
CREATE POLICY "activity_logs_select_ops"
  ON consultant_activity_logs
  FOR SELECT
  USING (is_ops_admin_or_higher());
