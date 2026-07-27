-- ============================================================
-- 075_add_roadmap_project_link.sql
-- (원 074 → 075 리네임: main 의 074_raise_notice_attachment_size_100mb 와 파일
--  prefix 충돌로 CI seed 스크립트가 schema_migrations 074 중복 INSERT 실패.
--  운영 DB 는 timestamp version 이라 무관 — 이미 적용됨. IF NOT EXISTS 로 멱등화.)
-- 목적: PBL 프로젝트가 선행 로드맵 프로젝트를 참조하는 자기참조 FK 신설
-- 배경:
--   docs/plans/2026-07-13-hwpx-v2-template-migration.md — 신규 PBL 양식이
--   Ⅱ장(로드맵 수립·요구분석)·Ⅲ-3(과업 목록)을 "선행 로드맵 보고서에서
--   자동 연계"하도록 요구. 업무규칙상 로드맵(FINAL) 실시 기업만 PBL이
--   가능하나, 현재 projects 는 company_name 텍스트만 갖는 비정규화 구조라
--   두 트랙을 잇는 연결 고리가 없음.
-- 정책:
--   · nullable — 기존/미연결 PBL 은 값이 없으며 Ⅱ장을 빈 양식으로 폴백.
--   · track='PBL' 행만 값을 가진다(애플리케이션 레벨 검증). 대상은 FINAL
--     로드맵을 보유한 track='ROADMAP' 프로젝트.
--   · ON DELETE SET NULL — 선행 로드맵 프로젝트 삭제 시 PBL 은 유지하고
--     링크만 해제(빈 양식 폴백).
--   · 신규 테이블 아님(기존 projects 의 RLS 정책이 그대로 적용) → RLS 변경 없음.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS roadmap_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN projects.roadmap_project_id IS
  'PBL이 참조하는 선행 로드맵 프로젝트(자기참조). track=PBL 행만 설정, 대상은 FINAL 로드맵 보유 track=ROADMAP. NULL이면 Ⅱ장 빈 양식 폴백.';

-- 부분 인덱스: 값이 있는 PBL 행만 인덱싱 (역참조 조회·FK 무결성 검사 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_roadmap_project_id
  ON projects (roadmap_project_id)
  WHERE roadmap_project_id IS NOT NULL;
