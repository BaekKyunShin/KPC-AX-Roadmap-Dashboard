-- 040_add_assessment_tokens.sql
-- 토큰 기반 공개 자가진단 링크 기능을 위한 마이그레이션
-- assessment_tokens 테이블 생성, self_assessments 확장, audit_logs 확장

-- 1. assessment_tokens 테이블
CREATE TABLE assessment_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assessment_tokens IS '공개 자가진단 링크 토큰 관리';

CREATE INDEX idx_assessment_tokens_token ON assessment_tokens(token);
CREATE INDEX idx_assessment_tokens_project_id ON assessment_tokens(project_id);

ALTER TABLE assessment_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: OPS_ADMIN 이상만 토큰 관리 가능 (공개 접근은 admin client로 우회)
CREATE POLICY "ops_select_tokens" ON assessment_tokens
  FOR SELECT USING (is_ops_admin_or_higher());

CREATE POLICY "ops_insert_tokens" ON assessment_tokens
  FOR INSERT WITH CHECK (is_ops_admin_or_higher());

CREATE POLICY "ops_update_tokens" ON assessment_tokens
  FOR UPDATE USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- 2. self_assessments 확장 (공개 제출자 정보)
-- created_by를 nullable로 변경 (공개 제출 시 NULL)
ALTER TABLE self_assessments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE self_assessments ADD COLUMN submitted_by_name TEXT;
ALTER TABLE self_assessments ADD COLUMN submitted_by_title TEXT;
ALTER TABLE self_assessments ADD COLUMN submitted_by_email TEXT;
ALTER TABLE self_assessments ADD COLUMN assessment_token_id UUID REFERENCES assessment_tokens(id);

-- 3. audit_logs 확장 (공개 사용자 감사로그 - actor가 없을 수 있음)
-- actor_user_id를 nullable로 변경하고, FK 제약도 DROP NOT NULL에 맞게 수정
ALTER TABLE audit_logs ALTER COLUMN actor_user_id DROP NOT NULL;

-- 4. ENUM 값 추가
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ASSESSMENT_TOKEN_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PUBLIC_SELF_ASSESSMENT_CREATE';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assessment_submitted';
