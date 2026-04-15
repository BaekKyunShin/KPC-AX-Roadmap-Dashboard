-- ============================================================
-- 064_add_project_status_pbl.sql
-- 목적: project_status ENUM에 PBL_DRAFTED 값 추가
-- OFA 개편 Step 2 — PBL 트랙은 ROADMAP_DRAFTED 대신 PBL_DRAFTED를 거쳐 FINALIZED로 이동
-- ============================================================

-- 주의: ALTER TYPE ADD VALUE는 PostgreSQL 12+에서 트랜잭션 내 실행 가능하나,
--       같은 마이그 안에서 새 값을 즉시 사용하면 실패한다(같은 트랜잭션 내 가시성 문제).
--       본 마이그는 ADD VALUE만 하고 즉시 사용하지 않으므로 안전.
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'PBL_DRAFTED' AFTER 'ROADMAP_DRAFTED';

COMMENT ON TYPE project_status IS 'PBL 트랙은 PBL_DRAFTED를 거쳐 FINALIZED로 이동한다.';
