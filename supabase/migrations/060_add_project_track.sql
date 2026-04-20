-- ============================================================
-- 060_add_project_track.sql
-- 목적: projects 테이블에 track 컬럼 추가 (ROADMAP / PBL 구분)
-- OFA(산인공 공식 양식 정렬) 개편 Step 2
-- ============================================================

-- 프로젝트 트랙 ENUM: ROADMAP(기존 AI 훈련로드맵) / PBL(문제해결형 AI+직무 훈련과정)
CREATE TYPE project_track AS ENUM ('ROADMAP', 'PBL');

-- projects 테이블에 track 컬럼 추가 (기본값 ROADMAP — 기존 데이터 호환)
ALTER TABLE projects
  ADD COLUMN track project_track NOT NULL DEFAULT 'ROADMAP';

-- 트랙 기반 필터 인덱스 (대시보드·갤러리에서 트랙별 조회 빈번)
-- 주의: projects 테이블에는 company_id가 없고 company_name 텍스트만 있음(마이그 001 비정규화).
--       회사+트랙 조합 조회는 보통 (company_name, track) 또는 단순 track 단독 인덱스로 충분.
CREATE INDEX idx_projects_track ON projects (track);

COMMENT ON COLUMN projects.track IS '프로젝트 트랙 (ROADMAP/PBL). 한 기업은 트랙별 별도 프로젝트를 가진다(중복 방지는 애플리케이션 레이어에서).';
