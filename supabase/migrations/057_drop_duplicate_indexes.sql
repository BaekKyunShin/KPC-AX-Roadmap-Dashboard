-- 중복 인덱스 제거
-- UNIQUE 제약 조건이 이미 동일한 B-tree 인덱스를 자동 생성하므로 명시적 인덱스 불필요
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_consultant_profiles_user_id;
