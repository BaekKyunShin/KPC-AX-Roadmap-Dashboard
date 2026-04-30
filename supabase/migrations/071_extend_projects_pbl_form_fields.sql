-- ============================================================
-- 071_extend_projects_pbl_form_fields.sql
-- 목적: PBL 양식 Ⅰ. 훈련과정 개요 신청서 자동표출 7필드 중
--       Project 테이블에 부재한 5컬럼 추가
-- 배경:
--   docs/plans/2026-04-29-pbl-form-matrix.md §2.1 — PBL-자체-01.
--   양식상 "신청서 기준으로 자동 불러옴 처리되며 내용 수정이 불가" 영역.
--   기존 Project 테이블에는 company_name·industry·company_address·contact_*
--   만 있어 사업장관리번호/업종코드/훈련실시주소/관할지부/담당자 직위 부재 →
--   결과 페이지·HWPX P-02 18키 매핑 정합성 갭.
-- 정책: 모든 컬럼 NULL 허용 (기존 row 호환). 운영관리자 측 ProjectForm
--       에서 선택 입력. PBL 결과 페이지·HWPX 출력 시 빈 값은 '—' 또는
--       빈 문자열로 표시.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN business_reg_no TEXT,        -- 사업장관리번호
  ADD COLUMN industry_code TEXT,          -- 업종 코드
  ADD COLUMN training_address TEXT,       -- 훈련 실시 주소
  ADD COLUMN jurisdiction_branch TEXT,    -- 관할 지부·지사
  ADD COLUMN contact_position TEXT;       -- 담당자 직위

COMMENT ON COLUMN projects.business_reg_no IS '사업장관리번호 (PBL 양식 Ⅰ. 신청서 자동표출).';
COMMENT ON COLUMN projects.industry_code IS '업종 코드 (PBL 양식 Ⅰ. 신청서 자동표출).';
COMMENT ON COLUMN projects.training_address IS '훈련 실시 주소 (PBL 양식 Ⅰ. 신청서 자동표출).';
COMMENT ON COLUMN projects.jurisdiction_branch IS '관할 지부·지사 (PBL 양식 Ⅰ. 신청서 자동표출).';
COMMENT ON COLUMN projects.contact_position IS '담당자 직위 (PBL 양식 Ⅰ. 신청서 자동표출).';
