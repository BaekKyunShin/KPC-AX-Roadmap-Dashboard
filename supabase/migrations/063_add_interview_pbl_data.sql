-- ============================================================
-- 063_add_interview_pbl_data.sql
-- 목적: interviews 테이블에 PBL 트랙 전용 JSONB 컬럼 추가
-- OFA 개편 Step 2
--
-- 배경: interviews.project_id에 UNIQUE 제약 존재 (프로젝트 1:1) → 트랙은 projects.track으로 추적.
--       로드맵 인터뷰 데이터는 기존 컬럼(company_details/job_tasks/...)에 저장.
--       PBL 인터뷰 데이터는 이 pbl_data 컬럼 하나에 통째로 저장(산인공 양식 2번 Ⅰ~Ⅲ장 구조).
-- ============================================================

ALTER TABLE interviews
  ADD COLUMN pbl_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- JSONB 크기 제한 (기존 050 패턴 준용: octet_length(col::TEXT))
ALTER TABLE interviews
  ADD CONSTRAINT chk_pbl_data_size
    CHECK (octet_length(pbl_data::TEXT) < 524288);

COMMENT ON CONSTRAINT chk_pbl_data_size ON interviews IS 'JSONB 크기 제한: 512KB (PBL 트랙 인터뷰 JSONB 단일 컬럼)';

COMMENT ON COLUMN interviews.pbl_data IS 'PBL 트랙 인터뷰 데이터. schemas/interview-pbl.ts 스키마로 검증.';
