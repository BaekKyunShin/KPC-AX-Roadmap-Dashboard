-- 053: is_approved_consultant() 최적화 (P1-DB-03)
-- 기존: get_user_role() + get_user_status() → users 2회 접근
-- 변경: 단일 EXISTS → users 1회 접근
-- get_user_role(), get_user_status()는 다른 곳에서 독립 사용되므로 유지

CREATE OR REPLACE FUNCTION public.is_approved_consultant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role = 'CONSULTANT_APPROVED'
      AND status = 'ACTIVE'
  );
$$;

COMMENT ON FUNCTION public.is_approved_consultant IS
  'users 단일 조회로 승인된 컨설턴트 여부 확인 (P1-DB-03 최적화)';
