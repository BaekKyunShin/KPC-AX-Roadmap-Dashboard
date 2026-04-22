/**
 * extractText 디스패처 테스트
 *
 * 검증:
 * - mime type 별로 적절한 파서 호출
 * - 5000자 truncate
 * - 파서 실패 격리: throw 안 하고 { text: null, parseError } 반환
 * - 지원하지 않는 mime → unsupported error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  extractTextFromAttachment,
  TEXT_TRUNCATE_LIMIT,
} from './extractText';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

// parseImage 가 외부 API 를 호출하므로 모킹
vi.mock('./parseImage', () => ({
  parseImage: vi.fn(async () => '이미지 OCR 추출 결과'),
  _resetImageCache: vi.fn(),
}));

describe('extractTextFromAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PDF → parsePdf 결과 반환', async () => {
    const buffer = readFileSync(fixturePath('sample.pdf'));
    const r = await extractTextFromAttachment(buffer, 'application/pdf');

    expect(r.text).toContain('HRD AI Roadmap PDF Sample Keyword');
    expect(r.parseError).toBeUndefined();
  });

  it('DOCX → parseDocx 결과 반환', async () => {
    const buffer = readFileSync(fixturePath('sample.docx'));
    const r = await extractTextFromAttachment(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    expect(r.text).toContain('HRD이음 진단보고서');
    expect(r.parseError).toBeUndefined();
  });

  it('PPTX → parsePptx 결과 반환', async () => {
    const buffer = readFileSync(fixturePath('sample.pptx'));
    const r = await extractTextFromAttachment(
      buffer,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );

    expect(r.text).toContain('AI 컨설팅 PPT 본문');
    expect(r.parseError).toBeUndefined();
  });

  it('XLSX → parseXlsx 결과 반환', async () => {
    const buffer = readFileSync(fixturePath('sample.xlsx'));
    const r = await extractTextFromAttachment(
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    expect(r.text).toContain('AI 역량 점수');
    expect(r.parseError).toBeUndefined();
  });

  it('PNG → parseImage 결과 반환', async () => {
    const buffer = readFileSync(fixturePath('sample.png'));
    const r = await extractTextFromAttachment(buffer, 'image/png');

    expect(r.text).toBe('이미지 OCR 추출 결과');
    expect(r.parseError).toBeUndefined();
  });

  it('5000자 초과 → truncate (말미에 ... 표시)', async () => {
    // 거대한 텍스트를 반환하는 파서를 직접 만들어 디스패처를 통과시키기 위해
    // 큰 PPTX 를 만들 필요 없이 PDF 를 빈 문자열로 만들고 직접 truncate 호출 검증
    const huge = 'A'.repeat(TEXT_TRUNCATE_LIMIT + 500);
    const result = (await import('./extractText')).truncateExtractedText(huge);
    expect(result.length).toBeLessThanOrEqual(TEXT_TRUNCATE_LIMIT + 20); // 말미 안내 포함 여유
    expect(result.startsWith('A')).toBe(true);
    expect(result).toContain('이하 생략');
  });

  it('파서 실패 격리: 손상된 PDF → text=null, parseError 메시지', async () => {
    const corrupt = Buffer.from('not a pdf at all');
    const r = await extractTextFromAttachment(corrupt, 'application/pdf');

    expect(r.text).toBeNull();
    expect(r.parseError).toBeDefined();
    expect(typeof r.parseError).toBe('string');
  });

  it('지원하지 않는 mime → text=null, parseError', async () => {
    const buffer = Buffer.from('whatever');
    const r = await extractTextFromAttachment(
      buffer,
      'application/x-some-unknown',
    );

    expect(r.text).toBeNull();
    expect(r.parseError).toContain('지원');
  });

  it('구버전 .doc (application/msword) → 안내 메시지', async () => {
    const buffer = Buffer.from('whatever');
    const r = await extractTextFromAttachment(buffer, 'application/msword');

    expect(r.text).toBeNull();
    expect(r.parseError).toContain('docx');
  });
});
