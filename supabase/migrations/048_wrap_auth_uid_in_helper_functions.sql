-- ============================================================================
-- 048: RLS 헬퍼 함수 내부 auth.uid() → (SELECT auth.uid()) 래핑
-- P2-DB-01: SECURITY DEFINER 함수 내부에서도 initplan 최적화 적용
-- Supabase 공식 권장 패턴: (SELECT auth.uid())로 래핑 시 한 번만 평가
-- 대상: get_user_role, get_user_status, is_assigned_to_project,
--        is_conversation_member (4개 함수)
-- ============================================================================

-- 1. get_user_role() — 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid());
$$;

-- 2. get_user_status() — 현재 사용자 상태 조회
CREATE OR REPLACE FUNCTION public.get_user_status()
RETURNS user_status
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT status FROM public.users WHERE id = (SELECT auth.uid());
$$;

-- 3. is_assigned_to_project() — 프로젝트 배정 여부 확인
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
      AND assigned_consultant_id = (SELECT auth.uid())
  );
$$;

-- 4. is_conversation_member() — 대화 참여자 여부 확인
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = (SELECT auth.uid())
  );
$$;
