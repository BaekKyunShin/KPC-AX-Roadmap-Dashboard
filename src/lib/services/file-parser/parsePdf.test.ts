/**
 * parsePdf 테스트 — pdfjs-dist legacy build 로 PDF 텍스트 추출
 *
 * 검증:
 * - 정상 PDF → 본문 텍스트 추출
 * - 손상된 PDF → 빈 문자열 (throw 없음 — 호출자 격리 책임)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePdf } from './parsePdf';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

describe('parsePdf', () => {
  it('정상 PDF → 본문 키워드 추출', async () => {
    const buffer = readFileSync(fixturePath('sample.pdf'));
    const text = await parsePdf(buffer);

    expect(text).toContain('HRD AI Roadmap PDF Sample Keyword');
  });

  it('손상된 버퍼 → throw (호출자가 try/catch 로 격리)', async () => {
    const corrupt = Buffer.from('not a pdf at all');
    await expect(parsePdf(corrupt)).rejects.toThrow();
  });
});
