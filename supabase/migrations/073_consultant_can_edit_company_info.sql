-- ============================================
-- 마이그 073: 컨설턴트가 배정 프로젝트의 기업 정보 편집 가능
--
-- 목적
--   1) projects.consultant_internal_note (TEXT) 컬럼 신설 — 컨설턴트 내부 메모.
--   2) 배정된 컨설턴트가 자기 프로젝트만 UPDATE 가능한 RLS 정책 추가.
--   3) 컨설턴트 UPDATE 시 시스템 필드 (status, assigned_consultant_id, is_test_mode,
--      test_created_by, track, created_by, created_at) 변경 차단 트리거.
--
-- 회귀 영향
--   - 기존 projects_update_ops, projects_update_test_own, projects_select_*
--     정책은 그대로 유지 → OPS·테스트 모드 동작 무영향.
--   - ADD COLUMN ... TEXT (DEFAULT 없음) → 기존 row 무영향, NULL로 채워짐.
-- ============================================

-- ============================================
-- Part 1: consultant_internal_note 컬럼 추가
-- ============================================
ALTER TABLE projects
  ADD COLUMN consultant_internal_note TEXT;

COMMENT ON COLUMN projects.consultant_internal_note IS
  '컨설턴트 내부 메모 (customer_comment와 분리). 컨설턴트가 본인 인터뷰·코칭 중 발견한 사항을 기록.';

-- ============================================
-- Part 2: RLS UPDATE 정책 — 배정된 컨설턴트, 실서비스 한정
--
-- USING: 변경 전 row 가 자기 담당이고 실서비스(is_test_mode=false) 여야 함.
-- WITH CHECK: 변경 후 row 가 여전히 자기 담당 (배정 변경 차단의 1차 가드).
-- 시스템 필드 불변 가드는 Part 3 트리거에서 추가 검증.
-- ============================================
CREATE POLICY "projects_update_consultant_assigned" ON projects
  FOR UPDATE
  USING (
    is_approved_consultant()
    AND assigned_consultant_id = (SELECT auth.uid())
    AND is_test_mode = false
  )
  WITH CHECK (
    is_approved_consultant()
    AND assigned_consultant_id = (SELECT auth.uid())
    AND is_test_mode = false
  );

-- ============================================
-- Part 3: 시스템 필드 불변 트리거 (컨설턴트 한정 가드)
--
-- 컨설턴트가 status 등 워크플로 핵심 필드를 우회 변경하지 못하도록
-- BEFORE UPDATE 트리거에서 차단. OPS_ADMIN 이상은 영향 없음.
-- ============================================
CREATE OR REPLACE FUNCTION public.projects_consultant_immutable_fields_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- OPS_ADMIN 이상은 검사 패스
  IF public.is_ops_admin_or_higher() THEN
    RETURN NEW;
  END IF;

  -- 컨설턴트 한정: 시스템 필드 변경 차단
  IF public.is_approved_consultant() THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.assigned_consultant_id IS DISTINCT FROM OLD.assigned_consultant_id
       OR NEW.is_test_mode IS DISTINCT FROM OLD.is_test_mode
       OR NEW.test_created_by IS DISTINCT FROM OLD.test_created_by
       OR NEW.track IS DISTINCT FROM OLD.track
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION '컨설턴트는 시스템 필드(status/assigned_consultant_id/is_test_mode/test_created_by/track/created_by/created_at)를 변경할 수 없습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_consultant_immutable ON projects;
CREATE TRIGGER trg_projects_consultant_immutable
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.projects_consultant_immutable_fields_check();
