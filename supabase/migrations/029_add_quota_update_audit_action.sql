-- 029: 쿼터 수정 감사로그 액션 추가
-- updateQuota Server Action에서 쿼터 변경 시 감사로그 기록용

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'QUOTA_UPDATE';
