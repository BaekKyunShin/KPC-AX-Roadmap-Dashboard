-- 023: 이메일 알림 설정 컬럼 추가
-- 관리자(OPS_ADMIN, SYSTEM_ADMIN)가 새 메시지 수신 시 이메일 알림을 받을 수 있도록
-- users 테이블에 opt-in 방식의 이메일 알림 설정 컬럼을 추가한다.

ALTER TABLE users
ADD COLUMN email_notify_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.email_notify_enabled IS '이메일 알림 활성화 여부 (관리자 전용, 기본값 비활성)';
