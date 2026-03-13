-- 041_assignment_unique_constraint.sql
-- 목적: 프로젝트당 현재 배정(is_current=true)이 1개만 존재하도록 제한
-- 관련 이슈: TOCTOU 경합으로 is_current=true 중복 가능

CREATE UNIQUE INDEX uq_project_assignments_current
  ON public.project_assignments (project_id)
  WHERE is_current = true;

COMMENT ON INDEX uq_project_assignments_current IS
  '프로젝트당 현재 활성 배정은 최대 1개로 제한합니다.';
