-- ============================================
-- Migration 031: 초기 테이블 코멘트 추가 + activity_logs FK 수정
-- ============================================
-- 목적:
--   1) 001_initial_schema.sql에서 생성한 12개 테이블 중
--      COMMENT ON TABLE이 누락된 10개 테이블에 코멘트 일괄 추가
--      (projects, project_assignments는 005에서 이미 추가됨)
--   2) consultant_activity_logs.consultant_id FK를
--      auth.users(id) → public.users(id)로 변경 (프로젝트 내 일관성)
-- ============================================

-- ============================================
-- 1. 초기 테이블 COMMENT ON TABLE 추가 (이슈 #31)
-- ============================================

COMMENT ON TABLE users IS '사용자 프로필 (Supabase Auth 확장, 역할·상태 관리)';
COMMENT ON TABLE consultant_profiles IS '컨설턴트 전문 프로필 (역량, 경력, 포트폴리오)';
COMMENT ON TABLE self_assessment_templates IS '기업 자가진단 설문 템플릿 (버전별 문항 관리)';
COMMENT ON TABLE self_assessments IS '기업 자가진단 응답 및 점수 (프로젝트당 1건)';
COMMENT ON TABLE matching_recommendations IS '컨설턴트 매칭 추천 결과 (점수, 근거, 순위)';
COMMENT ON TABLE interviews IS '현장 인터뷰 기록 (업무, 페인포인트, 개선목표)';
COMMENT ON TABLE roadmap_versions IS 'AI 훈련 로드맵 버전 (DRAFT → FINAL → ARCHIVED)';
COMMENT ON TABLE audit_logs IS '감사 로그 (사용자 행위 추적, 서비스 역할 키 전용 INSERT)';
COMMENT ON TABLE usage_metrics IS 'LLM 사용량 메트릭 (일별·월별 호출·토큰 집계)';
COMMENT ON TABLE user_quotas IS '사용자별 LLM 호출 쿼터 (일별·월별 한도)';

-- ============================================
-- 2. consultant_activity_logs FK 수정 (이슈 #32)
-- ============================================
-- 변경: consultant_id REFERENCES auth.users(id) → public.users(id)
-- 사유: 프로젝트 내 모든 FK는 public.users(id)를 참조하나
--       이 테이블만 auth.users(id) 직접 참조하여 일관성 부족

ALTER TABLE consultant_activity_logs
  DROP CONSTRAINT consultant_activity_logs_consultant_id_fkey;

ALTER TABLE consultant_activity_logs
  ADD CONSTRAINT consultant_activity_logs_consultant_id_fkey
  FOREIGN KEY (consultant_id) REFERENCES public.users(id) ON DELETE CASCADE;
