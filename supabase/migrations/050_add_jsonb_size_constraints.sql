-- ============================================================================
-- 050: roadmap_versions JSONB 컬럼 크기 제한 (P2-DB-05)
-- 비정상적으로 큰 JSONB 데이터 삽입 방지
-- 적용 전 기존 데이터 크기 확인 필수:
--   SELECT id,
--     octet_length(roadmap_matrix::TEXT) AS matrix_size,
--     octet_length(courses::TEXT) AS courses_size,
--     octet_length(pbl_course::TEXT) AS pbl_size,
--     octet_length(consultant_profile_snapshot::TEXT) AS snapshot_size
--   FROM roadmap_versions ORDER BY matrix_size DESC LIMIT 5;
-- ============================================================================

-- 1. roadmap_matrix — 2MB 제한
ALTER TABLE public.roadmap_versions ADD CONSTRAINT chk_roadmap_matrix_size
  CHECK (octet_length(roadmap_matrix::TEXT) < 2097152);

-- 2. courses — 2MB 제한
ALTER TABLE public.roadmap_versions ADD CONSTRAINT chk_courses_size
  CHECK (octet_length(courses::TEXT) < 2097152);

-- 3. pbl_course — 1MB 제한
ALTER TABLE public.roadmap_versions ADD CONSTRAINT chk_pbl_course_size
  CHECK (octet_length(pbl_course::TEXT) < 1048576);

-- 4. consultant_profile_snapshot — 512KB 제한
ALTER TABLE public.roadmap_versions ADD CONSTRAINT chk_consultant_snapshot_size
  CHECK (octet_length(consultant_profile_snapshot::TEXT) < 524288);

COMMENT ON CONSTRAINT chk_roadmap_matrix_size ON public.roadmap_versions IS 'JSONB 크기 제한: 2MB';
COMMENT ON CONSTRAINT chk_courses_size ON public.roadmap_versions IS 'JSONB 크기 제한: 2MB';
COMMENT ON CONSTRAINT chk_pbl_course_size ON public.roadmap_versions IS 'JSONB 크기 제한: 1MB';
COMMENT ON CONSTRAINT chk_consultant_snapshot_size ON public.roadmap_versions IS 'JSONB 크기 제한: 512KB';
