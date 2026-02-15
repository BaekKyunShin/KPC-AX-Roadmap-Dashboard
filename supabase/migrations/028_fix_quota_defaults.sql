-- 028_fix_quota_defaults.sql
-- 목적: user_quotas 테이블의 DDL 기본값을 TS 상수(50/500)와 일치시킴
-- 기존: daily_limit DEFAULT 100, monthly_limit DEFAULT 2000 (001_initial_schema.sql)
-- 변경: daily_limit DEFAULT 50, monthly_limit DEFAULT 500
-- 참고: 기존 행의 값은 변경하지 않음 (관리자가 의도적으로 설정한 값일 수 있음)

ALTER TABLE public.user_quotas ALTER COLUMN daily_limit SET DEFAULT 50;
ALTER TABLE public.user_quotas ALTER COLUMN monthly_limit SET DEFAULT 500;
