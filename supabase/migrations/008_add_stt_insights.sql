-- 인터뷰 STT 인사이트 필드 추가
-- STT 텍스트 파일에서 LLM으로 추출한 구조화된 정보 저장

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS stt_insights JSONB;

-- 인덱스 추가 (stt_insights 존재 여부로 필터링할 때 사용)
CREATE INDEX IF NOT EXISTS idx_interviews_stt_insights ON interviews USING gin(stt_insights) WHERE stt_insights IS NOT NULL;

COMMENT ON COLUMN interviews.stt_insights IS 'STT 텍스트에서 LLM으로 추출한 구조화된 인사이트 (추가 업무, 페인포인트, 숨은 니즈 등)';
