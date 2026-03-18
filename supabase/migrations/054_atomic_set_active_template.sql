-- 054: setActiveTemplate 원자적 처리 (P1-DB-05)
-- 기존: 2단계 순차 UPDATE (비활성화 → 활성화) — 원자성 미보장
-- 변경: 단일 트랜잭션 RPC + FOR UPDATE 경합 방지

CREATE OR REPLACE FUNCTION public.set_active_template(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_template_name TEXT;
  v_template_version INT;
BEGIN
  -- 1. 대상 템플릿 존재 확인 + 동시 요청 직렬화
  SELECT name, version
  INTO v_template_name, v_template_version
  FROM public.self_assessment_templates
  WHERE id = p_template_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '템플릿을 찾을 수 없습니다.');
  END IF;

  -- 2. 기존 활성 비활성화 (대상 제외)
  UPDATE public.self_assessment_templates
  SET is_active = FALSE
  WHERE is_active = TRUE AND id != p_template_id;

  -- 3. 대상 활성화
  UPDATE public.self_assessment_templates
  SET is_active = TRUE, updated_at = NOW()
  WHERE id = p_template_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'name', v_template_name,
    'version', v_template_version
  );
END;
$$;

COMMENT ON FUNCTION public.set_active_template IS
  '원자적 활성 템플릿 변경. 비활성화 + 활성화를 단일 트랜잭션으로 실행. (P1-DB-05)';
