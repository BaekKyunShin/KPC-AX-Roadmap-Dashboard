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
  ('11111111-1111-1111-1111-111111111111', 'son@test.com',        '손준성',   'OPS_ADMIN',            'ACTIVE', '010-1111-1111'),
  ('22222222-2222-2222-2222-222222222222', 'kpc@test.com',        '김동순',   'CONSULTANT_APPROVED',  'ACTIVE', '010-2222-2222'),
  ('33333333-3333-3333-3333-333333333333', 'sysadmin@test.com',   '신백균',   'SYSTEM_ADMIN',         'ACTIVE', '010-3333-3333');

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
  '시드기업B', 'IT/SW', '10-49',
  '김철수', 'kim@test.com', 'ASSIGNED',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
);

-- ⚠️ 정렬 주의 — 아래 추가 프로젝트는 created_at 을 명시적 과거로 고정한다.
--    컨설턴트 프로젝트 목록은 created_at DESC 정렬이고(consultant/projects/actions.ts),
--    다수의 E2E spec 이 helpers/navigation.helper.ts 의 findFirstLinkHref 로
--    "목록의 첫 프로젝트"를 집어 쓴다. 신규 시드가 최신이 되면 그 spec 들이
--    통째로 다른 프로젝트를 보게 되어 깨진다. 시드기업B(ROADMAP·ASSIGNED)가
--    계속 '첫 프로젝트'로 남도록 과거 시각을 박아 둔다.

-- PBL 트랙 프로젝트 (컨설턴트 PBL 인터뷰 E2E용)
INSERT INTO projects (
  id, company_name, industry, company_size,
  contact_name, contact_email, status, track,
  assigned_consultant_id, created_by, created_at
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '시드기업C', '제조업', '50~299명',
  '박영희', 'park@test.com', 'ASSIGNED', 'PBL',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-02 00:00:00+00'
);

-- FINALIZED ROADMAP 프로젝트 (OPS 로드맵 뷰·갤러리 상세 E2E용)
INSERT INTO projects (
  id, company_name, industry, company_size,
  contact_name, contact_email, status, track,
  assigned_consultant_id, created_by, created_at
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '시드기업D', 'IT/SW', '50~299명',
  '최민수', 'choi@test.com', 'FINALIZED', 'ROADMAP',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-01 00:00:00+00'
);

-- 프로젝트 배정 이력
INSERT INTO project_assignments (
  project_id, consultant_id, assigned_by, assignment_reason
) VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'E2E 테스트용 시드 배정'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'E2E PBL 트랙 시드 배정'
),
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'E2E 확정 로드맵 시드 배정'
);

-- ============================================================
-- 6. FINAL 로드맵 버전 — OPS 로드맵 뷰·갤러리 상세 E2E 시작점
-- ============================================================
-- 컬럼명은 v1 레거시지만 저장 의미는 v2 (roadmap-storage-mapper.ts 계약):
--   roadmap_matrix → 미사용(항상 [])
--   pbl_course     → { setup_necessity, outcome_summary }
--   courses        → course_specs[]
-- 갤러리 노출 조건: status='FINAL' AND is_shared=true (gallery/actions/queries.ts)
INSERT INTO roadmap_versions (
  id, project_id, version_number, status, is_shared,
  diagnosis_summary, roadmap_matrix, pbl_course, courses,
  created_by, finalized_by, finalized_at
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  1, 'FINAL', TRUE,
  'AI 활용 기초 역량은 갖췄으나 업무 적용 사례가 부족하다. 데이터 정제·문서 자동화부터 단계적으로 확산할 것을 권고한다.',
  '[]'::jsonb,
  jsonb_build_object(
    'setup_necessity', '반복 문서 작업이 많아 AI 도구 도입으로 즉시 효과를 볼 수 있는 구간이 넓다.',
    'outcome_summary', jsonb_build_object(
      'ai_competency_level', 'BEGINNER',
      'selected_tasks', '품질 검사 리포트 작성',
      'main_content', '1단계 AI 도구 활용 기초 → 2단계 업무 적용 실습 → 3단계 사내 확산'
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'training_period', '2026년 1분기',
      'training_level', 'BEGINNER',
      'course_name', 'AI 도구 활용 기초',
      'training_method', '집체(대면)',
      'recommended_program', '사업주 직업능력개발훈련',
      'goal', '생성형 AI 도구로 반복 문서 업무를 자동화할 수 있다.',
      'main_content', '프롬프트 작성 원리, 문서 요약·초안 생성 실습',
      'target_audience', '품질관리팀 전 직원',
      'subjects', jsonb_build_array(
        jsonb_build_object('name', 'AI 개요', 'details', '생성형 AI 동작 원리', 'hours', 4),
        jsonb_build_object('name', '프롬프트 실습', 'details', '업무 문서 초안 생성', 'hours', 8),
        jsonb_build_object('name', '사례 연구', 'details', '제조 현장 적용 사례', 'hours', 4)
      )
    )
  ),
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-05 00:00:00+00'
);

-- 자가진단 템플릿은 마이그레이션(001, 006)에서 이미 생성됨 — seed 불필요
