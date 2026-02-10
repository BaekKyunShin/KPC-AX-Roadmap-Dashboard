-- =============================================================================
-- 021: 알림 타입 확장 (인터뷰 완료, 로드맵 초안, 로드맵 확정)
-- =============================================================================
-- 운영관리자/시스템관리자에게 프로젝트 진행 상태를 알리기 위한 알림 타입 추가.
-- 기존 ENUM 값(assignment, deadline, status_change, message, system)은 유지.

ALTER TYPE notification_type ADD VALUE 'interview_complete';
ALTER TYPE notification_type ADD VALUE 'roadmap_draft';
ALTER TYPE notification_type ADD VALUE 'roadmap_finalized';

COMMENT ON TYPE notification_type IS '알림 타입: assignment(배정), deadline(마감), status_change(상태변경), message(메시지), system(시스템), interview_complete(인터뷰완료), roadmap_draft(로드맵초안), roadmap_finalized(로드맵확정)';
