-- 세부 업종 필드 추가
-- 컨설턴트의 선호 세부 업종과 프로젝트의 기업 세부 업종을 저장

-- 컨설턴트 프로필에 세부 업종 필드 추가
ALTER TABLE consultant_profiles
ADD COLUMN IF NOT EXISTS sub_industries TEXT[] DEFAULT '{}';

-- 프로젝트에 세부 업종 필드 추가
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sub_industries TEXT[] DEFAULT '{}';

-- 인덱스 추가 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_consultant_profiles_sub_industries
ON consultant_profiles USING GIN (sub_industries);

CREATE INDEX IF NOT EXISTS idx_projects_sub_industries
ON projects USING GIN (sub_industries);

COMMENT ON COLUMN consultant_profiles.sub_industries IS '컨설턴트의 선호 세부 업종 (텍스트 배열)';
COMMENT ON COLUMN projects.sub_industries IS '기업의 세부 업종 (텍스트 배열)';
