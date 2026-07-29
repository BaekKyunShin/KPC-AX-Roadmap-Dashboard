-- ============================================
-- 076: 운영관리자 프로젝트 행정 종결 (Administrative Closure)
-- 배경: 일부 훈련코치가 대시보드를 배정 수령 용도로만 사용해 작업이 끝나도
--   확정되지 않은 프로젝트가 미완료로 남음. 운영관리자가 초안 유무와 무관하게
--   임의 종결할 수 있도록 한다.
-- 설계: 새 status enum 값 없이 status=FINALIZED + 종결 메타 4컬럼
--   (기존 필터·통계 재사용). 잠금 판정은 status가 아니라 closed_at IS NOT NULL —
--   정식 확정(FINALIZED + 메타 NULL) 프로젝트의 기존 동작은 불변.
--   로드맵/PBL 버전 데이터는 건드리지 않는다 (DRAFT 승격 금지).
-- 구성: 컬럼 4 + 부분 인덱스 + audit_action 2값 (본 파일 내 미사용이라
--   단일 트랜잭션 안전 — 064 주석 규칙 참고) + RPC 2개
--   (042 패턴: SECURITY INVOKER + search_path='' + FOR UPDATE + jsonb 반환.
--   호출은 admin client(service_role) 전용 → RLS 변경 불필요)
-- ============================================

-- ------------------------------------------------------------
-- 1. projects 종결 메타 컬럼 4개
-- ------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_from_status public.project_status;

COMMENT ON COLUMN public.projects.closed_at IS
  '행정 종결 시각. NOT NULL이면 행정 종결 상태 (컨설턴트 mutation 잠금 기준). 정식 확정과 무관.';
COMMENT ON COLUMN public.projects.closed_by IS
  '행정 종결을 수행한 운영관리자 user id.';
COMMENT ON COLUMN public.projects.closure_reason IS
  '행정 종결 사유 (10~500자, 앱 레이어에서 검증).';
COMMENT ON COLUMN public.projects.closed_from_status IS
  '종결 직전 status. 종결 해제 시 이 값으로 복원.';

-- 종결 프로젝트 조회용 부분 인덱스 (075의 부분 인덱스 패턴)
CREATE INDEX IF NOT EXISTS idx_projects_closed_at
  ON public.projects (closed_at) WHERE closed_at IS NOT NULL;

-- ------------------------------------------------------------
-- 2. audit_action enum 확장 (070 패턴)
--    본 파일 내에서 사용하지 않으므로 같은 트랜잭션 내 안전.
-- ------------------------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ADMIN_CLOSED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_REOPENED';

-- ------------------------------------------------------------
-- 3. 행정 종결 RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_project_administratively(
  p_project_id UUID,
  p_closed_by UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_status public.project_status;
  v_closed_at TIMESTAMPTZ;
  v_consultant_id UUID;
BEGIN
  -- 1. 프로젝트 조회 (FOR UPDATE로 동시 요청 직렬화)
  SELECT status, closed_at, assigned_consultant_id
    INTO v_status, v_closed_at, v_consultant_id
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  -- 2. 이미 종결된 프로젝트 거부
  IF v_closed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '이미 종결된 프로젝트입니다.');
  END IF;

  -- 3. 정식 확정(FINALIZED + 메타 NULL) 프로젝트 거부
  IF v_status = 'FINALIZED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '이미 최종 확정된 프로젝트는 종결할 수 없습니다.');
  END IF;

  -- 4. 종결 처리: status→FINALIZED + 메타 4필드 기록 (버전 데이터는 무변경)
  UPDATE public.projects
  SET status = 'FINALIZED',
      closed_by = p_closed_by,
      closed_at = NOW(),
      closure_reason = p_reason,
      closed_from_status = v_status
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_status', v_status,
    'assigned_consultant_id', v_consultant_id
  );
END;
$$;

COMMENT ON FUNCTION public.close_project_administratively IS
  '행정 종결: status→FINALIZED + 종결 메타 4필드 기록. 로드맵/PBL 버전 데이터는 건드리지 않는다 (DRAFT 승격 금지).';

-- ------------------------------------------------------------
-- 4. 종결 해제 RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reopen_project(
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_closed_at TIMESTAMPTZ;
  v_from_status public.project_status;
  v_consultant_id UUID;
BEGIN
  -- 1. 프로젝트 조회 (FOR UPDATE로 동시 요청 직렬화)
  SELECT closed_at, closed_from_status, assigned_consultant_id
    INTO v_closed_at, v_from_status, v_consultant_id
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  -- 2. 정식 확정 보호: closed_at이 NULL인 FINALIZED는 해제 불가
  IF v_closed_at IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '행정 종결된 프로젝트가 아닙니다.');
  END IF;

  IF v_from_status IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '종결 이전 상태 정보가 없어 해제할 수 없습니다.');
  END IF;

  -- 3. 종결 해제: 이전 상태 복원 + 메타 4필드 초기화
  UPDATE public.projects
  SET status = v_from_status,
      closed_by = NULL,
      closed_at = NULL,
      closure_reason = NULL,
      closed_from_status = NULL
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'restored_status', v_from_status,
    'assigned_consultant_id', v_consultant_id
  );
END;
$$;

COMMENT ON FUNCTION public.reopen_project IS
  '행정 종결 해제: closed_from_status로 status 복원 + 종결 메타 4필드 NULL 초기화. 정식 확정 프로젝트는 대상 아님.';
