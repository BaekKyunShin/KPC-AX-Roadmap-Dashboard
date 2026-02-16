-- ============================================
-- 인덱스 없는 외래 키에 인덱스 추가
-- ============================================
-- Supabase advisor: unindexed_foreign_keys INFO 6건
-- FK에 인덱스가 없으면 CASCADE 체크나 JOIN 시 seq scan 발생
-- ============================================

-- 1. project_assignments.assigned_by → users(id)
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by
  ON project_assignments (assigned_by);

-- 2. roadmap_versions.created_by → users(id)
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_created_by
  ON roadmap_versions (created_by);

-- 3. roadmap_versions.finalized_by → users(id)
CREATE INDEX IF NOT EXISTS idx_roadmap_versions_finalized_by
  ON roadmap_versions (finalized_by);

-- 4. self_assessment_templates.created_by → users(id)
CREATE INDEX IF NOT EXISTS idx_self_assessment_templates_created_by
  ON self_assessment_templates (created_by);

-- 5. self_assessments.created_by → users(id)
CREATE INDEX IF NOT EXISTS idx_self_assessments_created_by
  ON self_assessments (created_by);

-- 6. self_assessments.template_id → self_assessment_templates(id)
-- CASCADE 체크에 사용되므로 우선순위 높음
CREATE INDEX IF NOT EXISTS idx_self_assessments_template_id
  ON self_assessments (template_id);
