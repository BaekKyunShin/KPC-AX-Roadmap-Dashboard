/**
 * parsePptx 테스트 — jszip 으로 PPTX 슬라이드별 <a:t> 텍스트 추출
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePptx } from './parsePptx';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

describe('parsePptx', () => {
  it('정상 PPTX → 슬라이드 순서대로 본문 결합', async () => {
    const buffer = readFileSync(fixturePath('sample.pptx'));
    const text = await parsePptx(buffer);

    expect(text).toContain('슬라이드1');
    expect(text).toContain('AI 컨설팅 PPT 본문');
    expect(text).toContain('슬라이드2');
    expect(text).toContain('다음 단계 추진');

    // 순서 보장
    expect(text.indexOf('슬라이드1')).toBeLessThan(text.indexOf('슬라이드2'));
  });

  it('손상된 버퍼 → 사용자 안내 메시지로 throw', async () => {
    const corrupt = Buffer.from('not a pptx zip');
    await expect(parsePptx(corrupt)).rejects.toThrow(
      /구버전 \.ppt 형식은 지원하지 않습니다\. \.pptx 로 변환 후 다시 업로드해 주세요\./,
    );
  });

  it('OLE compound (구 .ppt) magic byte → jszip 호출 전 명시적 안내', async () => {
    // OLE2/CFB header: D0 CF 11 E0 A1 B1 1A E1 + padding
    const ole = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00,
    ]);
    await expect(parsePptx(ole)).rejects.toThrow(
      '구버전 .ppt 형식은 지원하지 않습니다. .pptx 로 변환 후 다시 업로드해 주세요.',
    );
  });
});
