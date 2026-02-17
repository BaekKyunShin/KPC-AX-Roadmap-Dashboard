-- 038_fix_quota_for_update_aggregate.sql
-- 목적: FOR UPDATE + 집계 함수(SUM) 동시 사용 불가 오류 수정
-- 원인: PostgreSQL은 FOR UPDATE를 집계 함수와 함께 사용할 수 없음
--       → "FOR UPDATE is not allowed with aggregate functions" 에러 발생
-- 영향: check_and_increment_llm_usage 호출 시 항상 실패 (사전 분석 등 LLM 기능 전체 장애)
-- 수정: 행 잠금(FOR UPDATE)과 집계(SUM)를 별도 쿼리로 분리

CREATE OR REPLACE FUNCTION public.check_and_increment_llm_usage(
  p_user_id UUID,
  p_date DATE,
  p_month TEXT,
  p_tokens_in INT DEFAULT 0,
  p_tokens_out INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_daily_limit INT;
  v_monthly_limit INT;
  v_daily_calls INT;
  v_monthly_calls INT;
BEGIN
  -- 1. 사용자 쿼터 조회 (없으면 기본값 사용)
  SELECT daily_limit, monthly_limit
  INTO v_daily_limit, v_monthly_limit
  FROM public.user_quotas
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_daily_limit := 50;
    v_monthly_limit := 500;
  END IF;

  -- 2. 일별 행 확보: 없으면 생성 (UNIQUE(user_id, date) 활용)
  INSERT INTO public.usage_metrics (user_id, date, month, llm_calls, tokens_in, tokens_out)
  VALUES (p_user_id, p_date, p_month, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  -- 3. 해당 월의 모든 사용량 행 잠금 (FOR UPDATE로 동시 요청 직렬화)
  --    집계 함수와 FOR UPDATE를 함께 사용할 수 없으므로 잠금과 집계를 분리
  PERFORM 1
  FROM public.usage_metrics
  WHERE user_id = p_user_id AND month = p_month
  FOR UPDATE;

  -- 4. 잠금된 상태에서 월간 사용량 집계
  SELECT COALESCE(SUM(llm_calls), 0)
  INTO v_monthly_calls
  FROM public.usage_metrics
  WHERE user_id = p_user_id AND month = p_month;

  -- 5. 일일 사용량 조회 (이미 잠금된 행에서 읽으므로 안전)
  SELECT llm_calls
  INTO v_daily_calls
  FROM public.usage_metrics
  WHERE user_id = p_user_id AND date = p_date;

  -- 6. 일일 한도 먼저 확인 (사용자에게 더 구체적이고 실행 가능한 안내)
  IF v_daily_calls >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'exceeded', TRUE,
      'reason', 'daily',
      'message', format('일일 사용량 한도(%s회)에 도달했습니다. 내일 다시 시도해주세요.', v_daily_limit)
    );
  END IF;

  -- 7. 월간 한도 확인
  IF v_monthly_calls >= v_monthly_limit THEN
    RETURN jsonb_build_object(
      'exceeded', TRUE,
      'reason', 'monthly',
      'message', format('월간 사용량 한도(%s회)에 도달했습니다. 관리자에게 문의하세요.', v_monthly_limit)
    );
  END IF;

  -- 8. 사용량 증가 (FOR UPDATE 잠금 상태이므로 동시성 안전)
  UPDATE public.usage_metrics
  SET llm_calls = llm_calls + 1,
      tokens_in = tokens_in + p_tokens_in,
      tokens_out = tokens_out + p_tokens_out
  WHERE user_id = p_user_id
    AND date = p_date;

  RETURN jsonb_build_object('exceeded', FALSE);
END;
$$;

COMMENT ON FUNCTION public.check_and_increment_llm_usage IS
  '원자적 LLM 쿼터 확인 + 사용량 증가. 동시 요청 시 한도 우회를 방지합니다.';
