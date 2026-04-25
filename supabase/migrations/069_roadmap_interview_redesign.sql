-- ============================================================================
-- 069_roadmap_interview_redesign.sql
-- 목적: PR #2 로드맵 인터뷰 재설계 (Task 2.7-a)
--
-- 배경:
-- - PR #2 에서 로드맵 인터뷰 화면 (7스텝) 이 camelCase 신규 스키마
--   (RoadmapInterviewSchema — src/lib/schemas/interview-roadmap.ts) 로 재설계된다.
-- - 사용자 결정: "기본정보" (interview_date / interview_round / time / method /
--   participants) 를 별도 Step 에서 입력받지 않고 Ⅰ-2 "주요 활동 표"
--   (performanceActivities[] 차수별 배열) 에 흡수한다.
-- - 신규 Server Action (Task 2.7-b) 은 interview_date 등을 Zod 에서 받지 않으므로
--   INSERT 시점에 해당 컬럼에 값을 지정하지 않을 수 있다.
--
-- 변경 내용:
-- 1. interviews.interview_date 에 DEFAULT CURRENT_DATE 지정
--    - NOT NULL 제약은 유지 (기존 33행 모두 값 존재, 데이터 안전)
--    - 신규 Server Action 이 컬럼을 생략해도 DEFAULT 로 채워져 INSERT 통과
--    - 하위 호환: 기존 코드가 interview_date 를 명시해도 그대로 저장됨
--
-- 비고 (마이그 불필요 항목):
-- - Ⅰ-2 "주요 활동" 은 company_details.roadmap_overview.performance_activities
--   JSONB 키로 저장 (JSONB 확장이므로 DDL 불필요)
-- - Ⅲ-1 역량 모델링 / NCS 활용은 이미 company_details.roadmap_competency_models
--   + roadmap_ncs_usage JSONB 키로 저장되고 있음 (legacy 호환)
-- - interview_round (DEFAULT 1), interview_time (NULLABLE),
--   participants (NULLABLE, DEFAULT '[]'::jsonb) 는 이미 적절한 기본값 보유
-- - interview_attachments 는 Storage bucket 이며 DB 테이블 아님 (migration 065)
--
-- 멱등성: ALTER COLUMN ... SET DEFAULT 는 재실행 안전
-- ============================================================================

ALTER TABLE public.interviews
  ALTER COLUMN interview_date SET DEFAULT CURRENT_DATE;

COMMENT ON COLUMN public.interviews.interview_date IS
  '인터뷰 날짜 (legacy). 신규 camelCase 스키마는 Ⅰ-2 performanceActivities[*].date 에 차수별로 저장한다. 이 컬럼은 DEFAULT CURRENT_DATE 로 자동 채워지는 호환성 목적의 snapshot.';
