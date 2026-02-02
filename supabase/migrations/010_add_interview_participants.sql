-- 인터뷰 참석자 정보 필드 추가
-- 인터뷰에 참석한 기업 담당자 정보 (이름, 직급)를 저장

-- interviews 테이블에 participants 필드 추가
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';

-- 코멘트 추가
COMMENT ON COLUMN interviews.participants IS '인터뷰 참석자 정보 (id, name, position 배열)';
