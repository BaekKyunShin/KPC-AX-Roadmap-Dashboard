-- 013: 회원탈퇴 기능을 위한 ENUM 확장
-- user_status에 WITHDRAWN 추가, audit_action에 USER_WITHDRAW 추가

ALTER TYPE user_status ADD VALUE 'WITHDRAWN';
ALTER TYPE audit_action ADD VALUE 'USER_WITHDRAW';
