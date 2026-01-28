-- 교육 레벨 ENUM에 LEADER 추가
ALTER TYPE education_level ADD VALUE IF NOT EXISTS 'LEADER';

-- 기존 컨설턴트 프로필 데이터 삭제 (개발 단계이므로)
-- 필요시 아래 주석 해제
-- TRUNCATE TABLE consultant_profiles CASCADE;
