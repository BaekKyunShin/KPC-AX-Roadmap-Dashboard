/**
 * extractText — 파일 파서 디스패처
 *
 * 책임:
 * - mime type 으로 적절한 파서 선택
 * - 파서 실패 격리 (throw 안 함, { text: null, parseError } 로 변환)
 * - 5000자 truncate (LLM 프롬프트 비용 통제)
 *
 * 호출자 (uploadInterviewAttachment) 는 결과를 그대로
 * `attachment_files[].extracted_text` 로 저장한다.
 */

import { parsePdf } from './parsePdf';
import { parseDocx } from './parseDocx';
import { parsePptx } from './parsePptx';
import { parseXlsx } from './parseXlsx';
import { parseImage } from './parseImage';

export const TEXT_TRUNCATE_LIMIT = 5000;
const TRUNCATE_NOTICE = '\n... (이하 생략)';

export interface ExtractTextResult {
  /** 추출된 텍스트 (truncate 후). 실패 시 null. */
  text: string | null;
  /** 실패 사유 (성공 시 undefined). */
  parseError?: string;
}

/** 5000자 초과 시 말미에 안내 추가 후 잘라낸다. */
export function truncateExtractedText(input: string): string {
  if (input.length <= TEXT_TRUNCATE_LIMIT) return input;
  return input.slice(0, TEXT_TRUNCATE_LIMIT) + TRUNCATE_NOTICE;
}

const MIME_TO_PARSER: Record<
  string,
  (buf: Buffer | Uint8Array, mime: string) => Promise<string>
> = {
  'application/pdf': (buf) => parsePdf(buf),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (
    buf,
  ) => parseDocx(buf),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': (
    buf,
  ) => parsePptx(buf),
  'application/vnd.ms-powerpoint': (buf) => parsePptx(buf), // 일부 .pptx 가 구 mime 으로 올 수 있음
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (buf) =>
    parseXlsx(buf),
  'application/vnd.ms-excel': (buf) => parseXlsx(buf), // 구 .xls 는 xlsx-js-style 이 처리 가능
  'image/png': (buf, mime) => parseImage(buf, mime),
  'image/jpeg': (buf, mime) => parseImage(buf, mime),
  'image/webp': (buf, mime) => parseImage(buf, mime),
};

export async function extractTextFromAttachment(
  buffer: Buffer | Uint8Array,
  mimeType: string,
): Promise<ExtractTextResult> {
  // 구 .doc 는 mammoth 가 처리 불가 — 안내 메시지로 격리
  if (mimeType === 'application/msword') {
    return {
      text: null,
      parseError:
        '구버전 .doc 형식은 지원하지 않습니다. .docx 로 변환 후 다시 업로드해 주세요.',
    };
  }

  const parser = MIME_TO_PARSER[mimeType];
  if (!parser) {
    return {
      text: null,
      parseError: `지원하지 않는 파일 형식입니다 (${mimeType}).`,
    };
  }

  try {
    const raw = await parser(buffer, mimeType);
    const text = truncateExtractedText(raw ?? '');
    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      text: null,
      parseError: `파싱 실패: ${message}`,
    };
  }
}
