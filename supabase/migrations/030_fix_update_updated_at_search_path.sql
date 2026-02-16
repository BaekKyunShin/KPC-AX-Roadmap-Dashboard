-- ============================================================================
-- 030: update_updated_at() 트리거 함수에 search_path 설정
-- 감사 이슈 #30: SECURITY INVOKER이므로 위험도는 낮지만, 9개 테이블 트리거에서
-- 사용 중이며 Supabase advisor function_search_path_mutable WARN 해소 목적.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
