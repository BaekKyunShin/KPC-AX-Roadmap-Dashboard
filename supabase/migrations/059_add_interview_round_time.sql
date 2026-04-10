-- 059_add_interview_round_time.sql
-- 목적: 인터뷰 기본 정보에 차수(round)와 시간(time) 필드 추가

ALTER TABLE interviews
  ADD COLUMN interview_round SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN interview_time TEXT;

COMMENT ON COLUMN interviews.interview_round IS '인터뷰 차수 (1차, 2차, ...)';
COMMENT ON COLUMN interviews.interview_time IS '인터뷰 시간 (HH:mm 형식)';
