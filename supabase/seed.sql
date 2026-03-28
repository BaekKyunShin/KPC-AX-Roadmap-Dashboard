-- ============================================================
-- E2E 테스트 시드 데이터
-- supabase db reset 시 마이그레이션 후 자동 실행
-- ============================================================

-- ============================================================
-- 0. 확장 보장
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- 1. auth.users — 테스트 계정 3개
-- ============================================================
-- 고정 UUID (seed.sql과 .env.test 간 일관성)
--   OPS_ADMIN:    11111111-1111-1111-1111-111111111111
--   CONSULTANT:   22222222-2222-2222-2222-222222222222
--   SYSTEM_ADMIN: 33333333-3333-3333-3333-333333333333

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'son@test.com',
  extensions.crypt('test1234!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '', '', '', '', '', '', '', ''
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'kpc@test.com',
  extensions.crypt('test1234!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '', '', '', '', '', '', '', ''
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'sysadmin@test.com',
  extensions.crypt('test1234!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '', '', '', '', '', '', '', ''
);

-- ============================================================
-- 2. auth.identities — GoTrue v2 필수
-- ============================================================
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'son@test.com',
  'email',
  jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'son@test.com'),
  NOW(), NOW(), NOW()
),
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'kpc@test.com',
  'email',
  jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'kpc@test.com'),
  NOW(), NOW(), NOW()
),
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  'sysadmin@test.com',
  'email',
  jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'sysadmin@test.com'),

  NOW(), NOW(), NOW()
);

-- ============================================================
-- 3. public.users — 프로필
-- ============================================================
INSERT INTO users (id, email, name, role, status, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'son@test.com',          '손운영관리자', 'OPS_ADMIN',            'ACTIVE', '010-1111-1111'),
  ('22222222-2222-2222-2222-222222222222', 'kpc@test.com',          'KPC컨설턴트',  'CONSULTANT_APPROVED',  'ACTIVE', '010-2222-2222'),
  ('33333333-3333-3333-3333-333333333333', 'sysadmin@test.com',   '시스템관리자', 'SYSTEM_ADMIN',         'ACTIVE', '010-3333-3333');

-- ============================================================
-- 4. consultant_profiles — 컨설턴트 프로필
-- ============================================================
INSERT INTO consultant_profiles (
  user_id,
  affiliation,
  expertise_domains,
  available_industries,
  teaching_levels,
  coaching_methods,
  skill_tags,
  years_of_experience,
  representative_experience,
  portfolio,
  strengths_constraints
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'KPC AI교육센터',
  ARRAY['AI/ML', '데이터분석'],
  ARRAY['제조업', 'IT/SW'],
  ARRAY['BEGINNER', 'INTERMEDIATE']::education_level[],
  ARRAY['PBL', 'WORKSHOP']::coaching_method[],
  ARRAY['Python', 'TensorFlow', 'ChatGPT'],
  5,
  'AI 교육 프로그램 설계 및 운영 5년 경력',
  'https://example.com/portfolio',
  '중소기업 맞춤형 AI 교육에 강점'
);

-- ============================================================
-- 5. 기본 프로젝트 — E2E 테스트 시작점
-- ============================================================

-- NEW 상태 프로젝트 (진단/배정 등 테스트용)
INSERT INTO projects (
  id, company_name, industry, company_size,
  contact_name, contact_email, status, created_by
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '시드기업A', '제조업', '50-100명',
  '홍길동', 'hong@test.com', 'NEW',
  '11111111-1111-1111-1111-111111111111'
);

-- ASSIGNED 상태 프로젝트 (컨설턴트 페이지 테스트용)
INSERT INTO projects (
  id, company_name, industry, company_size,
  contact_name, contact_email, status,
  assigned_consultant_id, created_by
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '시드기업B', 'IT/SW', '10-50명',
  '김철수', 'kim@test.com', 'ASSIGNED',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
);

-- 프로젝트 배정 이력
INSERT INTO project_assignments (
  project_id, consultant_id, assigned_by, assignment_reason
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'E2E 테스트용 시드 배정'
);

-- 자가진단 템플릿은 마이그레이션(001, 006)에서 이미 생성됨 — seed 불필요
