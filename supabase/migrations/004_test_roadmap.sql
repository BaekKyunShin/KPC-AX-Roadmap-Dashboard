-- ============================================
-- KPC AI 훈련 로드맵 대시보드 - 테스트 모드 지원
-- ============================================

-- ============================================
-- cases 테이블에 테스트 모드 컬럼 추가
-- ============================================

-- 테스트 모드 플래그 (컨설턴트 연습용 프로젝트 구분)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN NOT NULL DEFAULT false;

-- 테스트 프로젝트 생성자 (승인된 컨설턴트)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS test_created_by UUID REFERENCES users(id);

-- 인덱스 추가 (테스트 프로젝트 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_cases_test_mode ON cases(is_test_mode) WHERE is_test_mode = true;
CREATE INDEX IF NOT EXISTS idx_cases_test_created_by ON cases(test_created_by) WHERE test_created_by IS NOT NULL;

-- ============================================
-- 테스트 프로젝트용 RLS 정책
-- ============================================

-- 테스트 프로젝트 생성: 승인된 컨설턴트만 가능
CREATE POLICY "cases_insert_test_consultant" ON cases
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 조회: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "cases_select_test_own" ON cases
  FOR SELECT USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 수정: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "cases_update_test_own" ON cases
  FOR UPDATE USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- 테스트 프로젝트 삭제: 본인이 생성한 테스트 프로젝트만
CREATE POLICY "cases_delete_test_own" ON cases
  FOR DELETE USING (
    is_test_mode = true AND
    test_created_by = auth.uid()
  );

-- ============================================
-- 테스트 프로젝트용 인터뷰 RLS 정책
-- ============================================

-- 테스트 프로젝트 인터뷰 생성: 본인이 생성한 테스트 프로젝트의 인터뷰
CREATE POLICY "interviews_insert_test" ON interviews
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    ) AND
    interviewer_id = auth.uid()
  );

-- 테스트 프로젝트 인터뷰 조회
CREATE POLICY "interviews_select_test" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    )
  );

-- 테스트 프로젝트 인터뷰 수정
CREATE POLICY "interviews_update_test" ON interviews
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    ) AND
    interviewer_id = auth.uid()
  );

-- ============================================
-- 테스트 프로젝트용 로드맵 RLS 정책
-- ============================================

-- 테스트 프로젝트 로드맵 생성
CREATE POLICY "roadmaps_insert_test" ON roadmap_versions
  FOR INSERT WITH CHECK (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- 테스트 프로젝트 로드맵 조회
CREATE POLICY "roadmaps_select_test" ON roadmap_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    )
  );

-- 테스트 프로젝트 로드맵 수정
CREATE POLICY "roadmaps_update_test" ON roadmap_versions
  FOR UPDATE USING (
    is_approved_consultant() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_id
      AND cases.is_test_mode = true
      AND cases.test_created_by = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- ============================================
-- 감사 로그 액션 추가 (참고용 코멘트)
-- ============================================
-- 새로운 감사 액션:
-- - TEST_CASE_CREATE: 테스트 프로젝트 생성
-- - TEST_ROADMAP_CREATE: 테스트 로드맵 생성
-- - TEST_CASE_DELETE: 테스트 프로젝트 삭제
-- (audit_action enum에 추가 필요시 별도 마이그레이션)
