/**
 * parseImage 테스트 — Anthropic Vision 으로 이미지 텍스트(OCR) 추출
 *
 * 검증:
 * - mock Anthropic 클라이언트가 반환한 텍스트 추출
 * - sha256 캐시 히트 (같은 buffer 재호출 시 API 1회만 호출)
 * - 빈 응답 → 빈 문자열
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Anthropic SDK mock (모듈 평가 전에 hoisted)
const { messagesCreate } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: messagesCreate };
  }
  return { default: MockAnthropic };
});

import { parseImage, _resetImageCache } from './parseImage';

const fixturePath = (name: string) =>
  resolve(__dirname, '__fixtures__', name);

describe('parseImage', () => {
  beforeEach(() => {
    messagesCreate.mockReset();
    _resetImageCache();
  });

  it('정상 이미지 → Vision 텍스트 추출', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '추출된 한글 텍스트: AI 역량 진단 보고서' }],
    });
    const buffer = readFileSync(fixturePath('sample.png'));

    const text = await parseImage(buffer, 'image/png');

    expect(text).toContain('추출된 한글 텍스트');
    expect(messagesCreate).toHaveBeenCalledTimes(1);
  });

  it('동일 buffer 재호출 → 캐시 히트 (API 1회만)', async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'first call' }],
    });
    const buffer = readFileSync(fixturePath('sample.png'));

    const a = await parseImage(buffer, 'image/png');
    const b = await parseImage(buffer, 'image/png');

    expect(a).toBe(b);
    expect(messagesCreate).toHaveBeenCalledTimes(1);
  });

  it('빈 content → 빈 문자열', async () => {
    messagesCreate.mockResolvedValueOnce({ content: [] });
    const buffer = readFileSync(fixturePath('sample.png'));

    const text = await parseImage(buffer, 'image/png');

    expect(text).toBe('');
  });

  it('지원하지 않는 mime → throw', async () => {
    const buffer = readFileSync(fixturePath('sample.png'));
    await expect(parseImage(buffer, 'image/svg+xml')).rejects.toThrow();
  });
});
