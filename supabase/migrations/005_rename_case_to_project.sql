-- ============================================
-- Migration 005: cases → projects 리네이밍
-- ============================================
-- 변경 내용:
-- 1. case_status ENUM → project_status
-- 2. cases 테이블 → projects
-- 3. case_assignments 테이블 → project_assignments
-- 4. 모든 case_id 컬럼 → project_id
-- 5. is_assigned_to_case 함수 → is_assigned_to_project
-- 6. 감사 액션: CASE_* → PROJECT_*
-- ============================================

-- 트랜잭션 시작
BEGIN;

-- ============================================
-- 1단계: 기존 RLS 정책 삭제
-- ============================================

-- cases 테이블 정책
DROP POLICY IF EXISTS "cases_select_ops" ON cases;
DROP POLICY IF EXISTS "cases_select_consultant" ON cases;
DROP POLICY IF EXISTS "cases_insert_ops" ON cases;
DROP POLICY IF EXISTS "cases_update_ops" ON cases;
DROP POLICY IF EXISTS "cases_insert_test_consultant" ON cases;
DROP POLICY IF EXISTS "cases_select_test_own" ON cases;
DROP POLICY IF EXISTS "cases_update_test_own" ON cases;
DROP POLICY IF EXISTS "cases_delete_test_own" ON cases;

-- case_assignments 테이블 정책
DROP POLICY IF EXISTS "assignments_select_ops" ON case_assignments;
DROP POLICY IF EXISTS "assignments_select_consultant" ON case_assignments;
DROP POLICY IF EXISTS "assignments_insert_ops" ON case_assignments;
DROP POLICY IF EXISTS "assignments_update_ops" ON case_assignments;

-- self_assessments 테이블 정책 (case_id 참조)
DROP POLICY IF EXISTS "assessments_select_consultant" ON self_assessments;

-- interviews 테이블 정책 (case_id 참조)
DROP POLICY IF EXISTS "interviews_select_consultant" ON interviews;
DROP POLICY IF EXISTS "interviews_insert_consultant" ON interviews;
DROP POLICY IF EXISTS "interviews_update_consultant" ON interviews;
DROP POLICY IF EXISTS "interviews_insert_test" ON interviews;
DROP POLICY IF EXISTS "interviews_select_test" ON interviews;
DROP POLICY IF EXISTS "interviews_update_test" ON interviews;

-- roadmap_versions 테이블 정책 (case_id 참조)
DROP POLICY IF EXISTS "roadmaps_select_consultant" ON roadmap_versions;
DROP POLICY IF EXISTS "roadmaps_insert_consultant" ON roadmap_versions;
DROP POLICY IF EXISTS "roadmaps_update_consultant" ON roadmap_versions;
DROP POLICY IF EXISTS "roadmaps_insert_test" ON roadmap_versions;
DROP POLICY IF EXISTS "roadmaps_select_test" ON roadmap_versions;
DROP POLICY IF EXISTS "roadmaps_update_test" ON roadmap_versions;

-- ============================================
-- 2단계: 헬퍼 함수 삭제
-- ============================================

DROP FUNCTION IF EXISTS is_assigned_to_case(UUID);

-- ============================================
-- 3단계: 인덱스 삭제
-- ============================================

-- cases 테이블 인덱스
DROP INDEX IF EXISTS idx_cases_status;
DROP INDEX IF EXISTS idx_cases_assigned_consultant;
DROP INDEX IF EXISTS idx_cases_created_by;
DROP INDEX IF EXISTS idx_cases_created_at;
DROP INDEX IF EXISTS idx_cases_test_mode;
DROP INDEX IF EXISTS idx_cases_test_created_by;

-- case_assignments 테이블 인덱스
DROP INDEX IF EXISTS idx_case_assignments_case_id;
DROP INDEX IF EXISTS idx_case_assignments_consultant;
DROP INDEX IF EXISTS idx_case_assignments_current;

-- case_id 관련 인덱스
DROP INDEX IF EXISTS idx_self_assessments_case_id;
DROP INDEX IF EXISTS idx_matching_recommendations_case_id;
DROP INDEX IF EXISTS idx_interviews_case_id;
DROP INDEX IF EXISTS idx_roadmap_versions_case_id;
DROP INDEX IF EXISTS idx_roadmap_versions_final;

-- ============================================
-- 4단계: 트리거 삭제
-- ============================================

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;

-- ============================================
-- 5단계: ENUM 타입 리네이밍
-- ============================================

ALTER TYPE case_status RENAME TO project_status;

-- 감사 액션 ENUM에 새 값 추가 (CASE → PROJECT)
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_UPDATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_ASSIGN';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_REASSIGN';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEST_PROJECT_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEST_PROJECT_DELETE';

-- ============================================
-- 6단계: 테이블 리네이밍
-- ============================================

ALTER TABLE cases RENAME TO projects;
ALTER TABLE case_assignments RENAME TO project_assignments;

-- ============================================
-- 7단계: 컬럼 리네이밍 (case_id → project_id)
-- ============================================

-- self_assessments
ALTER TABLE self_assessments RENAME COLUMN case_id TO project_id;

-- matching_recommendations
ALTER TABLE matching_recommendations RENAME COLUMN case_id TO project_id;

-- project_assignments (구 case_assignments)
ALTER TABLE project_assignments RENAME COLUMN case_id TO project_id;

-- interviews
ALTER TABLE interviews RENAME COLUMN case_id TO project_id;

-- roadmap_versions
ALTER TABLE roadmap_versions RENAME COLUMN case_id TO project_id;

-- ============================================
-- 7.5단계: 외래 키 제약조건 리네이밍
-- ============================================

-- projects 테이블
ALTER TABLE projects RENAME CONSTRAINT cases_assigned_consultant_id_fkey TO projects_assigned_consultant_id_fkey;
ALTER TABLE projects RENAME CONSTRAINT cases_created_by_fkey TO projects_created_by_fkey;
ALTER TABLE projects RENAME CONSTRAINT cases_test_created_by_fkey TO projects_test_created_by_fkey;

-- project_assignments 테이블
ALTER TABLE project_assignments RENAME CONSTRAINT case_assignments_project_id_fkey TO project_assignments_project_id_fkey;
ALTER TABLE project_assignments RENAME CONSTRAINT case_assignments_consultant_id_fkey TO project_assignments_consultant_id_fkey;
ALTER TABLE project_assignments RENAME CONSTRAINT case_assignments_assigned_by_fkey TO project_assignments_assigned_by_fkey;

-- self_assessments 테이블
ALTER TABLE self_assessments RENAME CONSTRAINT self_assessments_case_id_fkey TO self_assessments_project_id_fkey;

-- matching_recommendations 테이블
ALTER TABLE matching_recommendations RENAME CONSTRAINT matching_recommendations_case_id_fkey TO matching_recommendations_project_id_fkey;

-- interviews 테이블
ALTER TABLE interviews RENAME CONSTRAINT interviews_case_id_fkey TO interviews_project_id_fkey;

-- roadmap_versions 테이블
ALTER TABLE roadmap_versions RENAME CONSTRAINT roadmap_versions_case_id_fkey TO roadmap_versions_project_id_fkey;

-- ============================================
-- 8단계: UNIQUE 제약조건 리네이밍
-- ============================================

-- matching_recommendations의 unique 제약조건
ALTER TABLE matching_recommendations
  DROP CONSTRAINT IF EXISTS matching_recommendations_case_id_candidate_user_id_key;
ALTER TABLE matching_recommendations
  ADD CONSTRAINT matching_recommendations_project_id_candidate_user_id_key
  UNIQUE (project_id, candidate_user_id);

-- roadmap_versions의 unique 제약조건
ALTER TABLE roadmap_versions
  DROP CONSTRAINT IF EXISTS roadmap_versions_case_id_version_number_key;
ALTER TABLE roadmap_versions
  ADD CONSTRAINT roadmap_versions_project_id_version_number_key
  UNIQUE (project_id, version_number);

-- ============================================
-- 9단계: 인덱스 재생성
-- ============================================

-- projects 테이블 인덱스
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned_consultant ON projects(assigned_consultant_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_test_mode ON projects(is_test_mode) WHERE is_test_mode = true;
CREATE INDEX idx_projects_test_created_by ON projects(test_created_by) WHERE test_created_by IS NOT NULL;

-- project_assignments 테이블 인덱스
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_consultant ON project_assignments(consultant_id);
CREATE INDEX idx_project_assignments_current ON project_assignments(is_current) WHERE is_current = true;

-- project_id 관련 인덱스
CREATE INDEX idx_self_assessments_project_id ON self_assessments(project_id);
CREATE INDEX idx_matching_recommendations_project_id ON matching_recommendations(project_id);
CREATE INDEX idx_interviews_project_id ON interviews(project_id);
CREATE INDEX idx_roadmap_versions_project_id ON roadmap_versions(project_id);
CREATE INDEX idx_roadmap_versions_final ON roadmap_versions(project_id, status) WHERE status = 'FINAL';

-- ============================================
-- 10단계: 트리거 재생성
-- ============================================

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 11단계: 헬퍼 함수 재생성
-- ============================================

-- 사용자가 특정 프로젝트에 배정되었는지 확인
CREATE OR REPLACE FUNCTION is_assigned_to_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND assigned_consultant_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 12단계: RLS 활성화 (테이블 이름 변경으로 재설정)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13단계: RLS 정책 재생성
-- ============================================

-- == projects 테이블 정책 ==

-- OPS_ADMIN 이상은 모든 프로젝트 조회 가능
CREATE POLICY "projects_select_ops" ON projects
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 프로젝트만 조회 가능
CREATE POLICY "projects_select_consultant" ON projects
  FOR SELECT USING (
    is_approved_consultant() AND
    assigned_consultant_id = auth.uid()
  );

-- OPS_ADMIN만 프로젝트 생성 가능
CREATE POLICY "projects_insert_ops" ON projects
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- OPS_ADMIN만 프로젝트 수정 가능
CREATE POLICY "projects_update_ops" ON projects
  FOR UPDATE USING (is_ops_admin_or_higher());

-- 테스트 프로젝트 생성: 승인된 컨설턴트만 가능
CREATE POLICY "projects_insert_test_consultant" ON projects
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 조회: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "projects_select_test_own" ON projects
  FOR SELECT USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 수정: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "projects_update_test_own" ON projects
  FOR UPDATE USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 삭제: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "projects_delete_test_own" ON projects
  FOR DELETE USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- == project_assignments 테이블 정책 ==

-- OPS_ADMIN 이상은 모든 배정 이력 조회 가능
CREATE POLICY "project_assignments_select_ops" ON project_assignments
  FOR SELECT USING (is_ops_admin_or_higher());

-- 배정된 컨설턴트는 자신의 배정 이력만 조회 가능
CREATE POLICY "project_assignments_select_consultant" ON project_assignments
  FOR SELECT USING (
    is_approved_consultant() AND
    consultant_id = auth.uid()
  );

-- OPS_ADMIN만 배정 생성 가능
CREATE POLICY "project_assignments_insert_ops" ON project_assignments
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

-- OPS_ADMIN만 배정 수정 가능 (is_current 변경 등)
CREATE POLICY "project_assignments_update_ops" ON project_assignments
  FOR UPDATE USING (is_ops_admin_or_higher());

-- == self_assessments 테이블 정책 (project_id 사용) ==

-- 배정된 컨설턴트는 자신의 프로젝트 자가진단만 조회 가능
CREATE POLICY "assessments_select_consultant" ON self_assessments
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

-- == interviews 테이블 정책 (project_id 사용) ==

-- 배정된 컨설턴트는 자신의 프로젝트 인터뷰만 조회/입력/수정 가능
CREATE POLICY "interviews_select_consultant" ON interviews
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

CREATE POLICY "interviews_insert_consultant" ON interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    interviewer_id = auth.uid()
  );

CREATE POLICY "interviews_update_consultant" ON interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    interviewer_id = auth.uid()
  );

-- 테스트 프로젝트 인터뷰 생성
CREATE POLICY "interviews_insert_test" ON interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    ) AND
    interviewer_id = auth.uid()
  );

-- 테스트 프로젝트 인터뷰 조회
CREATE POLICY "interviews_select_test" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    )
  );

-- 테스트 프로젝트 인터뷰 수정
CREATE POLICY "interviews_update_test" ON interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    ) AND
    interviewer_id = auth.uid()
  );

-- == roadmap_versions 테이블 정책 (project_id 사용) ==

-- 배정된 컨설턴트는 자신의 프로젝트 로드맵만 조회/생성/수정 가능
CREATE POLICY "roadmaps_select_consultant" ON roadmap_versions
  FOR SELECT USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id)
  );

CREATE POLICY "roadmaps_insert_consultant" ON roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    created_by = auth.uid()
  );

-- DRAFT 상태만 수정 가능, FINAL 확정은 배정된 컨설턴트만
CREATE POLICY "roadmaps_update_consultant" ON roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    is_assigned_to_project(project_id) AND
    (
      status = 'DRAFT' OR
      (status = 'FINAL' AND finalized_by = auth.uid())
    )
  );

-- 테스트 프로젝트 로드맵 생성
CREATE POLICY "roadmaps_insert_test" ON roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- 테스트 프로젝트 로드맵 조회
CREATE POLICY "roadmaps_select_test" ON roadmap_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    )
  );

-- 테스트 프로젝트 로드맵 수정
CREATE POLICY "roadmaps_update_test" ON roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.is_test_mode = true
      AND projects.test_created_by = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- ============================================
-- 14단계: 코멘트 업데이트
-- ============================================

COMMENT ON TABLE projects IS '기업 프로젝트 (AI 교육 컨설팅 건)';
COMMENT ON TABLE project_assignments IS '프로젝트 배정 이력';
COMMENT ON COLUMN self_assessments.project_id IS '연결된 프로젝트 ID';
COMMENT ON COLUMN matching_recommendations.project_id IS '연결된 프로젝트 ID';
COMMENT ON COLUMN interviews.project_id IS '연결된 프로젝트 ID';
COMMENT ON COLUMN roadmap_versions.project_id IS '연결된 프로젝트 ID';
COMMENT ON COLUMN project_assignments.project_id IS '연결된 프로젝트 ID';

-- 트랜잭션 커밋
COMMIT;
