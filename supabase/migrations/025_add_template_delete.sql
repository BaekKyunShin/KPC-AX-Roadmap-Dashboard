-- 025: 자가진단 템플릿 삭제 기능 추가
-- RLS DELETE 정책 + 감사 로그 액션 ENUM 추가

-- 1. RLS DELETE 정책: OPS_ADMIN 이상만 삭제 가능
CREATE POLICY "templates_delete_ops" ON self_assessment_templates
  FOR DELETE USING (is_ops_admin_or_higher());

-- 2. 감사 로그 액션 추가
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEMPLATE_DELETE';
