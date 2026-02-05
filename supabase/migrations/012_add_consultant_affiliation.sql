-- 컨설턴트 프로필에 소속(affiliation) 컬럼 추가
-- 기존 컨설턴트는 '프리랜서'로 설정

ALTER TABLE consultant_profiles
ADD COLUMN affiliation TEXT NOT NULL DEFAULT '프리랜서';

-- DEFAULT 제약 제거 (새로운 레코드는 명시적으로 값을 입력해야 함)
ALTER TABLE consultant_profiles
ALTER COLUMN affiliation DROP DEFAULT;

COMMENT ON COLUMN consultant_profiles.affiliation IS '소속 (회사명, 기관명, 프리랜서 등)';
