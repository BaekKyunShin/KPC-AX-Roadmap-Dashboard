-- ============================================
-- OPS_ADMIN_PENDING 역할 추가
-- 운영관리자 회원가입 시 승인 대기 상태를 위한 역할
-- ============================================

-- user_role ENUM에 OPS_ADMIN_PENDING 값 추가
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'OPS_ADMIN_PENDING' AFTER 'USER_PENDING';
