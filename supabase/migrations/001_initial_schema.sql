-- ============================================
-- KPC AI 훈련 로드맵 대시보드 - 초기 스키마
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM 타입 정의
-- ============================================

-- 사용자 역할
CREATE TYPE user_role AS ENUM (
  'PUBLIC',
  'USER_PENDING',
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN'
);

-- 사용자 상태
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED');

-- 프로젝트 상태
CREATE TYPE case_status AS ENUM (
  'NEW',
  'DIAGNOSED',
  'MATCH_RECOMMENDED',
  'ASSIGNED',
  'INTERVIEWED',
  'ROADMAP_DRAFTED',
  'FINALIZED'
);

-- 로드맵 버전 상태
CREATE TYPE roadmap_version_status AS ENUM ('DRAFT', 'FINAL', 'ARCHIVED');

-- 교육 레벨
CREATE TYPE education_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- 코칭 방식
CREATE TYPE coaching_method AS ENUM ('PBL', 'WORKSHOP', 'MENTORING', 'LECTURE', 'HYBRID');

-- 페인포인트 심각도
CREATE TYPE severity_level AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- 제약사항 유형
CREATE TYPE constraint_type AS ENUM ('DATA', 'SYSTEM', 'SECURITY', 'PERMISSION', 'OTHER');

-- 감사로그 액션
CREATE TYPE audit_action AS ENUM (
  'USER_APPROVE',
  'USER_SUSPEND',
  'USER_REACTIVATE',
  'CASE_CREATE',
  'CASE_UPDATE',
  'SELF_ASSESSMENT_CREATE',
  'SELF_ASSESSMENT_UPDATE',
  'MATCHING_EXECUTE',
  'CASE_ASSIGN',
  'CASE_REASSIGN',
  'INTERVIEW_CREATE',
  'INTERVIEW_UPDATE',
  'ROADMAP_CREATE',
  'ROADMAP_UPDATE',
  'ROADMAP_FINALIZE',
  'ROADMAP_ARCHIVE',
  'DOWNLOAD_PDF',
  'DOWNLOAD_XLSX'
);

-- ============================================
-- 테이블 정의
-- ============================================

-- 사용자 프로필 (Supabase Auth의 users 테이블 확장)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'USER_PENDING',
  status user_status NOT NULL DEFAULT 'ACTIVE',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 컨설턴트 프로필
CREATE TABLE consultant_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- 정형 데이터
  expertise_domains TEXT[] NOT NULL DEFAULT '{}',
  available_industries TEXT[] NOT NULL DEFAULT '{}',
  teaching_levels education_level[] NOT NULL DEFAULT '{}',
  coaching_methods coaching_method[] NOT NULL DEFAULT '{}',
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  -- 서술 데이터
  representative_experience TEXT NOT NULL DEFAULT '',
  portfolio TEXT NOT NULL DEFAULT '',
  strengths_constraints TEXT NOT NULL DEFAULT '',
  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기업 프로젝트
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 기업 기본 정보
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_address TEXT,
  -- 상태 관리
  status case_status NOT NULL DEFAULT 'NEW',
  assigned_consultant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 추가 정보
  customer_comment TEXT,
  -- 메타
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 자가진단 템플릿
CREATE TABLE self_assessment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version)
);

-- 자가진단 응답
CREATE TABLE self_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES self_assessment_templates(id) ON DELETE RESTRICT,
  template_version INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  scores JSONB NOT NULL DEFAULT '{}',
  summary_text TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 매칭 추천
CREATE TABLE matching_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_score NUMERIC(5,2) NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, candidate_user_id)
);

-- 프로젝트 배정 이력
CREATE TABLE case_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assignment_reason TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  unassignment_reason TEXT
);

-- 현장 인터뷰
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  interview_date DATE NOT NULL,
  company_details JSONB NOT NULL DEFAULT '{}',
  job_tasks JSONB NOT NULL DEFAULT '[]',
  pain_points JSONB NOT NULL DEFAULT '[]',
  constraints JSONB NOT NULL DEFAULT '[]',
  improvement_goals JSONB NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  customer_requirements TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 로드맵 버전
CREATE TABLE roadmap_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status roadmap_version_status NOT NULL DEFAULT 'DRAFT',
  -- 컨설턴트 프로필 스냅샷
  consultant_profile_snapshot JSONB NOT NULL DEFAULT '{}',
  -- 로드맵 데이터
  diagnosis_summary TEXT NOT NULL DEFAULT '',
  roadmap_matrix JSONB NOT NULL DEFAULT '[]',
  pbl_course JSONB NOT NULL DEFAULT '{}',
  courses JSONB NOT NULL DEFAULT '[]',
  -- 수정 요청
  revision_prompt TEXT,
  -- 검증 상태
  free_tool_validated BOOLEAN NOT NULL DEFAULT false,
  time_limit_validated BOOLEAN NOT NULL DEFAULT false,
  -- 메타
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(case_id, version_number)
);

-- 감사 로그
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action audit_action NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용량 메트릭
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  llm_calls INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 사용자 쿼터
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  monthly_limit INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================

-- 사용자
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);

-- 컨설턴트 프로필
CREATE INDEX idx_consultant_profiles_user_id ON consultant_profiles(user_id);

-- 프로젝트
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned_consultant ON cases(assigned_consultant_id);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- 자가진단
CREATE INDEX idx_self_assessments_case_id ON self_assessments(case_id);

-- 매칭 추천
CREATE INDEX idx_matching_recommendations_case_id ON matching_recommendations(case_id);
CREATE INDEX idx_matching_recommendations_candidate ON matching_recommendations(candidate_user_id);

-- 배정 이력
CREATE INDEX idx_case_assignments_case_id ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_consultant ON case_assignments(consultant_id);
CREATE INDEX idx_case_assignments_current ON case_assignments(is_current) WHERE is_current = true;

-- 인터뷰
CREATE INDEX idx_interviews_case_id ON interviews(case_id);
CREATE INDEX idx_interviews_interviewer ON interviews(interviewer_id);

-- 로드맵 버전
CREATE INDEX idx_roadmap_versions_case_id ON roadmap_versions(case_id);
CREATE INDEX idx_roadmap_versions_status ON roadmap_versions(status);

-- 감사 로그
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 사용량 메트릭
CREATE INDEX idx_usage_metrics_user_date ON usage_metrics(user_id, date);
CREATE INDEX idx_usage_metrics_month ON usage_metrics(user_id, month);

-- ============================================
-- 트리거 함수: updated_at 자동 갱신
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_consultant_profiles_updated_at BEFORE UPDATE ON consultant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_self_assessment_templates_updated_at BEFORE UPDATE ON self_assessment_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_self_assessments_updated_at BEFORE UPDATE ON self_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_roadmap_versions_updated_at BEFORE UPDATE ON roadmap_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_usage_metrics_updated_at BEFORE UPDATE ON usage_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_quotas_updated_at BEFORE UPDATE ON user_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 기본 데이터: 자가진단 템플릿 (30문항)
-- ============================================

INSERT INTO self_assessment_templates (id, version, name, description, questions, is_active)
VALUES (
  uuid_generate_v4(),
  1,
  '기업 AI 활용 역량 진단 v1',
  '30문항으로 구성된 기업의 AI 활용 역량 및 준비도를 진단하는 템플릿입니다.',
  '[
    {"id": "q1", "order": 1, "dimension": "데이터 활용", "question_text": "우리 회사는 업무에 필요한 데이터를 체계적으로 수집하고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q2", "order": 2, "dimension": "데이터 활용", "question_text": "수집된 데이터는 분석 가능한 형태로 정리되어 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q3", "order": 3, "dimension": "데이터 활용", "question_text": "데이터 기반 의사결정이 일상적으로 이루어진다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q4", "order": 4, "dimension": "데이터 활용", "question_text": "데이터 품질 관리 체계가 갖추어져 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q5", "order": 5, "dimension": "데이터 활용", "question_text": "데이터 접근 권한이 적절히 관리되고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q6", "order": 6, "dimension": "업무 프로세스", "question_text": "반복적인 업무 프로세스가 명확히 정의되어 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q7", "order": 7, "dimension": "업무 프로세스", "question_text": "업무 프로세스의 병목 구간을 파악하고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q8", "order": 8, "dimension": "업무 프로세스", "question_text": "업무 자동화에 대한 니즈가 명확하다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q9", "order": 9, "dimension": "업무 프로세스", "question_text": "프로세스 개선을 위한 KPI가 설정되어 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q10", "order": 10, "dimension": "업무 프로세스", "question_text": "표준화된 업무 양식/템플릿을 사용하고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q11", "order": 11, "dimension": "조직 역량", "question_text": "AI/디지털 도구에 대한 직원들의 관심도가 높다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q12", "order": 12, "dimension": "조직 역량", "question_text": "새로운 기술 도입에 대한 조직 문화가 개방적이다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q13", "order": 13, "dimension": "조직 역량", "question_text": "디지털 역량 교육에 대한 경영진의 지원이 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q14", "order": 14, "dimension": "조직 역량", "question_text": "IT/디지털 담당자가 지정되어 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q15", "order": 15, "dimension": "조직 역량", "question_text": "기존 업무 방식 변경에 대한 저항이 낮다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q16", "order": 16, "dimension": "IT 인프라", "question_text": "업무용 PC/노트북 성능이 충분하다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q17", "order": 17, "dimension": "IT 인프라", "question_text": "인터넷 연결이 안정적이다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q18", "order": 18, "dimension": "IT 인프라", "question_text": "클라우드 서비스 사용이 가능하다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q19", "order": 19, "dimension": "IT 인프라", "question_text": "외부 SaaS 도구 도입이 가능하다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q20", "order": 20, "dimension": "IT 인프라", "question_text": "정보보안 정책이 유연하게 적용된다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q21", "order": 21, "dimension": "AI 활용 현황", "question_text": "현재 AI 도구(ChatGPT 등)를 업무에 활용하고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q22", "order": 22, "dimension": "AI 활용 현황", "question_text": "AI 도구 활용 시 구체적인 업무 개선 효과를 경험했다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q23", "order": 23, "dimension": "AI 활용 현황", "question_text": "AI 도구 사용에 대한 사내 가이드라인이 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q24", "order": 24, "dimension": "AI 활용 현황", "question_text": "AI 활용 사례를 공유하는 문화가 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q25", "order": 25, "dimension": "AI 활용 현황", "question_text": "AI 도구 활용에 대한 교육 경험이 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q26", "order": 26, "dimension": "기대 효과", "question_text": "AI 도입으로 업무 시간 단축을 기대한다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q27", "order": 27, "dimension": "기대 효과", "question_text": "AI 도입으로 업무 품질 향상을 기대한다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q28", "order": 28, "dimension": "기대 효과", "question_text": "AI 도입으로 비용 절감을 기대한다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q29", "order": 29, "dimension": "기대 효과", "question_text": "구체적인 AI 적용 업무 영역을 파악하고 있다.", "question_type": "SCALE_5", "weight": 1},
    {"id": "q30", "order": 30, "dimension": "기대 효과", "question_text": "AI 도입 후 성과 측정 방법을 알고 있다.", "question_type": "SCALE_5", "weight": 1}
  ]'::jsonb,
  true
);
