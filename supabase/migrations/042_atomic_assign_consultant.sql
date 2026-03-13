-- 042_atomic_assign_consultant.sql
-- 목적: 컨설턴트 배정을 원자적으로 수행 (기존 해제 + 새 배정 + 상태 업데이트)
-- finalize_roadmap 패턴 참고

CREATE OR REPLACE FUNCTION public.assign_consultant(
  p_project_id UUID,
  p_consultant_id UUID,
  p_assigned_by UUID,
  p_assignment_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- 1. 프로젝트 상태 확인 (FOR UPDATE로 동시 요청 직렬화)
  SELECT status INTO v_current_status
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  -- DIAGNOSED, MATCH_RECOMMENDED, ASSIGNED만 배정 가능
  IF v_current_status NOT IN ('DIAGNOSED', 'MATCH_RECOMMENDED', 'ASSIGNED') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '현재 프로젝트 상태(' || v_current_status || ')에서는 컨설턴트를 배정할 수 없습니다.'
    );
  END IF;

  -- 2. 기존 활성 배정 해제
  UPDATE public.project_assignments
  SET is_current = FALSE,
      unassigned_at = NOW(),
      unassignment_reason = '새 배정으로 인한 변경'
  WHERE project_id = p_project_id
    AND is_current = TRUE;

  -- 3. 새 배정 생성
  INSERT INTO public.project_assignments (project_id, consultant_id, assigned_by, assignment_reason, is_current)
  VALUES (p_project_id, p_consultant_id, p_assigned_by, p_assignment_reason, TRUE);

  -- 4. 프로젝트 상태 및 배정 컨설턴트 업데이트
  UPDATE public.projects
  SET status = 'ASSIGNED',
      assigned_consultant_id = p_consultant_id
  WHERE id = p_project_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

COMMENT ON FUNCTION public.assign_consultant IS
  '원자적 컨설턴트 배정. 기존 배정 해제 + 새 배정 생성 + 프로젝트 상태 업데이트를 단일 트랜잭션으로 실행합니다.';
