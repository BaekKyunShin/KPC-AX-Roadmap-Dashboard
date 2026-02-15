-- ============================================================================
-- 026: SECURITY DEFINER 함수 5개에 search_path 설정
-- 감사 이슈 #10: get_user_role, get_user_status, is_ops_admin_or_higher,
-- is_approved_consultant, is_assigned_to_project에 SET search_path = '' 누락.
-- Supabase security advisor function_search_path_mutable WARN 해소.
-- ============================================================================

-- 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 현재 사용자 상태 조회
CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS user_status
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT status FROM public.users WHERE id = auth.uid();
$$;

-- 사용자가 특정 프로젝트에 배정되었는지 확인
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
    AND assigned_consultant_id = auth.uid()
  );
$$;

-- 사용자가 OPS_ADMIN 이상인지 확인
CREATE OR REPLACE FUNCTION public.is_ops_admin_or_higher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('OPS_ADMIN', 'SYSTEM_ADMIN');
$$;

-- 사용자가 승인된 컨설턴트인지 확인
CREATE OR REPLACE FUNCTION public.is_approved_consultant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT public.get_user_role() = 'CONSULTANT_APPROVED' AND public.get_user_status() = 'ACTIVE';
$$;
