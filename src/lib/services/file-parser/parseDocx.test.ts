/**
 * parseDocx 테스트 — mammoth 로 DOCX 텍스트 추출
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDocx } from './parseDocx';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

describe('parseDocx', () => {
  it('정상 DOCX → 한글 본문 추출', async () => {
    const buffer = readFileSync(fixturePath('sample.docx'));
    const text = await parseDocx(buffer);

    expect(text).toContain('HRD이음 진단보고서');
    expect(text).toContain('AI 역량 중급 수준');
    expect(text).toContain('품질검사');
  });

  it('손상된 버퍼 → throw', async () => {
    const corrupt = Buffer.from('this is not a docx');
    await expect(parseDocx(corrupt)).rejects.toThrow();
  });
});
