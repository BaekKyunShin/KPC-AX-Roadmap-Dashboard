-- ============================================
-- KPC AI 훈련 로드맵 대시보드 - RLS 정책
-- ============================================

-- ============================================
-- RLS 활성화
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 헬퍼 함수
-- ============================================

-- 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자 상태 조회
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS user_status AS $$
  SELECT status FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 사용자가 특정 프로젝트에 배정되었는지 확인
CREATE OR REPLACE FUNCTION is_assigned_to_case(p_case_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM cases
    WHERE id = p_case_id
    AND assigned_consultant_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 사용자가 OPS_ADMIN 이상인지 확인
CREATE OR REPLACE FUNCTION is_ops_admin_or_higher()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('OPS_ADMIN', 'SYSTEM_ADMIN');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 사용자가 승인된 컨설턴트인지 확인
CREATE OR REPLACE FUNCTION is_approved_consultant()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'CONSULTANT_APPROVED' AND get_user_status() = 'ACTIVE';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- users 테이블 RLS 정책
-- ============================================

-- 모든 인증된 사용자는 자신의 정보 조회 가능
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

-- OPS_ADMIN 이상은 모든 사용자 조회 가능
CREATE POLICY "users_select_ops" ON users
  FOR SELECT USING (is_ops_admin_or_higher());

-- 사용자는 자신의 정보 수정 가능 (role, status 제외)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    status = (SELECT status FROM users WHERE id = auth.uid())
  );

-- OPS_ADMIN 이상은 사용자 정보 수정 가능 (승인/정지 등)
CREATE POLICY "users_update_ops" ON users
  FOR UPDATE USING (is_ops_admin_or_higher());

-- 신규 사용자 생성은 트리거/함수로 처리 (서비스 역할 키 사용)

-- ============================================
-- consultant_profiles 테이블 RLS 정책
-- ============================================

-- 모든 인증된 사용자는 자신의 프로필 조회 가능
CREATE POLICY "profiles_select_own" ON consultant_profiles
  FOR SELECT USING (user_id = auth.uid());

-- OPS_ADMIN 이상은 모든 프로필 조회 가능 (매칭용)
CREATE POLICY "profiles_select_ops" ON consultant_profiles
  FOR SELECT USING (is_ops_admin_or_higher());

-- 사용자는 자신의 프로필 생성 가능
CREATE POLICY "profiles_insert_own" ON consultant_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 사용자는 자신의 프로필 수정 가능
CREATE POLICY "profiles_update_own" ON consultant_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- cases 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상은 모든 프로젝트 조회 가능
CREATE POLICY "cases_select_ops" ON cases
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 프로젝트만 조회 가능
CREATE POLICY "cases_select_consultant" ON cases
  FOR SELECT USING (
    is_approved_consultant() AND
    assigned_consultant_id = auth.uid()
  );

-- OPS_ADMIN만 프로젝트 생성 가능
CREATE POLICY "cases_insert_ops" ON cases
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- OPS_ADMIN만 프로젝트 수정 가능
CREATE POLICY "cases_update_ops" ON cases
  FOR UPDATE USING (is_ops_admin_or_higher());

-- ============================================
-- self_assessment_templates 테이블 RLS 정책
-- ============================================

-- 모든 인증된 사용자는 활성 템플릿 조회 가능
CREATE POLICY "templates_select_active" ON self_assessment_templates
  FOR SELECT USING (is_active = true);

-- OPS_ADMIN 이상은 모든 템플릿 조회 가능
CREATE POLICY "templates_select_ops" ON self_assessment_templates
  FOR SELECT USING (is_ops_admin_or_higher());

-- OPS_ADMIN만 템플릿 생성/수정 가능
CREATE POLICY "templates_insert_ops" ON self_assessment_templates
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

CREATE POLICY "templates_update_ops" ON self_assessment_templates
  FOR UPDATE USING (is_ops_admin_or_higher());

-- ============================================
-- self_assessments 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상은 모든 자가진단 조회 가능
CREATE POLICY "assessments_select_ops" ON self_assessments
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 프로젝트 자가진단만 조회 가능
CREATE POLICY "assessments_select_consultant" ON self_assessments
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_case(case_id)
  );

-- OPS_ADMIN만 자가진단 입력 가능
CREATE POLICY "assessments_insert_ops" ON self_assessments
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- OPS_ADMIN만 자가진단 수정 가능
CREATE POLICY "assessments_update_ops" ON self_assessments
  FOR UPDATE USING (is_ops_admin_or_higher());

-- ============================================
-- matching_recommendations 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상만 매칭 추천 조회 가능
CREATE POLICY "matching_select_ops" ON matching_recommendations
  FOR SELECT USING (is_ops_admin_or_higher());

-- OPS_ADMIN만 매칭 추천 생성 가능 (시스템에서 생성)
CREATE POLICY "matching_insert_ops" ON matching_recommendations
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- 매칭 추천 삭제 (재계산 시)
CREATE POLICY "matching_delete_ops" ON matching_recommendations
  FOR DELETE USING (is_ops_admin_or_higher());

-- ============================================
-- case_assignments 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상은 모든 배정 이력 조회 가능
CREATE POLICY "assignments_select_ops" ON case_assignments
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 배정 이력만 조회 가능
CREATE POLICY "assignments_select_consultant" ON case_assignments
  FOR SELECT USING (
    is_approved_consultant() AND
    consultant_id = auth.uid()
  );

-- OPS_ADMIN만 배정 생성 가능
CREATE POLICY "assignments_insert_ops" ON case_assignments
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- OPS_ADMIN만 배정 수정 가능 (is_current 변경 등)
CREATE POLICY "assignments_update_ops" ON case_assignments
  FOR UPDATE USING (is_ops_admin_or_higher());

-- ============================================
-- interviews 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상은 모든 인터뷰 조회 가능
CREATE POLICY "interviews_select_ops" ON interviews
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 프로젝트 인터뷰만 조회/입력/수정 가능
CREATE POLICY "interviews_select_consultant" ON interviews
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_case(case_id)
  );

CREATE POLICY "interviews_insert_consultant" ON interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_case(case_id) AND
    interviewer_id = auth.uid()
  );

CREATE POLICY "interviews_update_consultant" ON interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_case(case_id) AND
    interviewer_id = auth.uid()
  );

-- ============================================
-- roadmap_versions 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상은 모든 로드맵 조회 가능 (읽기 전용)
CREATE POLICY "roadmaps_select_ops" ON roadmap_versions
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 프로젝트 로드맵만 조회/생성/수정 가능
CREATE POLICY "roadmaps_select_consultant" ON roadmap_versions
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_case(case_id)
  );

CREATE POLICY "roadmaps_insert_consultant" ON roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_case(case_id) AND
    created_by = auth.uid()
  );

-- DRAFT 상태만 수정 가능, FINAL 확정은 배정된 컨설턴트만
CREATE POLICY "roadmaps_update_consultant" ON roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_case(case_id) AND
    (
      status = 'DRAFT' OR
      (status = 'FINAL' AND finalized_by = auth.uid())
    )
  );

-- ============================================
-- audit_logs 테이블 RLS 정책
-- ============================================

-- OPS_ADMIN 이상만 감사 로그 조회 가능
CREATE POLICY "audit_logs_select_ops" ON audit_logs
  FOR SELECT USING (is_ops_admin_or_higher());

-- 감사 로그는 서비스 역할 키로만 삽입 (서버에서만)
-- 클라이언트에서 직접 삽입 불가

-- ============================================
-- usage_metrics 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 사용량만 조회 가능
CREATE POLICY "metrics_select_own" ON usage_metrics
  FOR SELECT USING (user_id = auth.uid());

-- OPS_ADMIN 이상은 모든 사용량 조회 가능
CREATE POLICY "metrics_select_ops" ON usage_metrics
  FOR SELECT USING (is_ops_admin_or_higher());

-- 사용량은 서비스 역할 키로만 업데이트 (서버에서만)

-- ============================================
-- user_quotas 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 쿼터만 조회 가능
CREATE POLICY "quotas_select_own" ON user_quotas
  FOR SELECT USING (user_id = auth.uid());

-- OPS_ADMIN 이상은 모든 쿼터 조회/수정 가능
CREATE POLICY "quotas_select_ops" ON user_quotas
  FOR SELECT USING (is_ops_admin_or_higher());

CREATE POLICY "quotas_update_ops" ON user_quotas
  FOR UPDATE USING (is_ops_admin_or_higher());

CREATE POLICY "quotas_insert_ops" ON user_quotas
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());
