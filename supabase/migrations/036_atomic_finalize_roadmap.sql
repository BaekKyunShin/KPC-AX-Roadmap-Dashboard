-- 036_atomic_finalize_roadmap.sql
-- 목적: finalizeRoadmap의 3개 별도 쿼리를 단일 트랜잭션으로 원자화
-- 기존 FINAL→ARCHIVED + 현재→FINAL + 프로젝트 FINALIZED를 원자적으로 실행
-- 중간 실패 시 확정본 없는 상태 방지
-- 관련 이슈: 감사 #42 (별도 쿼리로 정합성 깨짐 가능)

CREATE OR REPLACE FUNCTION public.finalize_roadmap(
  p_roadmap_id UUID,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_project_id UUID;
  v_version_number INT;
  v_assigned_consultant_id UUID;
  v_roadmap_status TEXT;
BEGIN
  -- 1. 로드맵 + 프로젝트 조회 (FOR UPDATE로 동시 요청 직렬화)
  SELECT rv.project_id, rv.version_number, p.assigned_consultant_id, rv.status
  INTO v_project_id, v_version_number, v_assigned_consultant_id, v_roadmap_status
  FROM public.roadmap_versions rv
  INNER JOIN public.projects p ON p.id = rv.project_id
  WHERE rv.id = p_roadmap_id
  FOR UPDATE OF rv;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '로드맵을 찾을 수 없습니다.'
    );
  END IF;

  -- 2. DRAFT 상태만 확정 가능
  IF v_roadmap_status != 'DRAFT' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'DRAFT 상태의 로드맵만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 3. 배정된 컨설턴트 확인
  IF v_assigned_consultant_id != p_actor_user_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '배정된 컨설턴트만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 4. 기존 FINAL → ARCHIVED (같은 트랜잭션 내)
  UPDATE public.roadmap_versions
  SET status = 'ARCHIVED'
  WHERE project_id = v_project_id
    AND status = 'FINAL';

  -- 5. 현재 로드맵 → FINAL
  UPDATE public.roadmap_versions
  SET status = 'FINAL',
      finalized_by = p_actor_user_id,
      finalized_at = NOW()
  WHERE id = p_roadmap_id;

  -- 6. 프로젝트 상태 → FINALIZED (이미 FINALIZED면 불필요한 UPDATE 방지)
  UPDATE public.projects
  SET status = 'FINALIZED'
  WHERE id = v_project_id
    AND status != 'FINALIZED';

  RETURN jsonb_build_object(
    'success', TRUE,
    'project_id', v_project_id,
    'version_number', v_version_number
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_roadmap IS
  '원자적 로드맵 확정. 기존 FINAL→ARCHIVED + 현재→FINAL + 프로젝트 FINALIZED를 단일 트랜잭션으로 실행합니다.';
