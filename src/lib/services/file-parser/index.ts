/**
 * file-parser — 인터뷰 첨부 파일 텍스트 추출 모듈
 *
 * 사용처:
 * - uploadInterviewAttachment Server Action 에서 업로드 직후 동기 파싱
 * - 결과는 attachment_files[].extracted_text 로 저장
 * - 로드맵 LLM 프롬프트에서 본문 텍스트로 활용 (ISSUE-04, ISSUE-14)
 */

export {
  extractTextFromAttachment,
  truncateExtractedText,
  TEXT_TRUNCATE_LIMIT,
  type ExtractTextResult,
} from './extractText';
