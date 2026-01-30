/**
 * STT (Speech-to-Text) 관련 상수
 */

/** STT 파일 최대 크기 (500KB) */
export const MAX_STT_FILE_SIZE_BYTES = 500 * 1024;

/** STT 파일 최대 크기 (KB 단위) */
export const MAX_STT_FILE_SIZE_KB = 500;

/** 허용되는 파일 확장자 */
export const ALLOWED_STT_FILE_EXTENSIONS = ['.txt'] as const;

/** LLM 인사이트 추출 시 사용하는 temperature */
export const STT_EXTRACTION_TEMPERATURE = 0.3;
