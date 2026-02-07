-- ============================================
-- 014: self_assessments.summary_text 컬럼 삭제
-- ============================================
-- 목적: 사용되지 않는 summary_text 컬럼 제거
-- 사유: 입력 UI 없음, 조회 UI 없음, customer_comment/customer_requirements로 대체됨
-- 파괴적 변경: 기존 데이터(테스트 데이터만 존재)가 삭제됨

ALTER TABLE self_assessments DROP COLUMN IF EXISTS summary_text;
