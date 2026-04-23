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

import {
  parseImage,
  _resetImageCache,
  _getImageCacheSize,
  _getImageCacheKeys,
  _MAX_IMAGE_CACHE_ENTRIES,
} from './parseImage';

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

  // ----------------------------------------------------------------------------
  // LRU 캐시 동작 (warm Vercel Function OOM 방어)
  // ----------------------------------------------------------------------------

  describe('LRU 캐시', () => {
    /** 임의 1바이트 buffer 생성 (sha256 키가 모두 다르도록 보장) */
    const makeBuffer = (n: number) => Buffer.from([n & 0xff, (n >> 8) & 0xff]);

    it(`MAX(${_MAX_IMAGE_CACHE_ENTRIES}) entry 까지 정상 누적`, async () => {
      for (let i = 0; i < _MAX_IMAGE_CACHE_ENTRIES; i++) {
        messagesCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: `text-${i}` }],
        });
        await parseImage(makeBuffer(i), 'image/png');
      }
      expect(_getImageCacheSize()).toBe(_MAX_IMAGE_CACHE_ENTRIES);
    });

    it('MAX+1 번째 entry 추가 시 가장 오래된 entry 제거', async () => {
      // 50개 채움
      for (let i = 0; i < _MAX_IMAGE_CACHE_ENTRIES; i++) {
        messagesCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: `text-${i}` }],
        });
        await parseImage(makeBuffer(i), 'image/png');
      }
      const keysBefore = _getImageCacheKeys();
      const oldestKey = keysBefore[0];

      // 51번째 추가
      messagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'overflow' }],
      });
      await parseImage(makeBuffer(999), 'image/png');

      expect(_getImageCacheSize()).toBe(_MAX_IMAGE_CACHE_ENTRIES);
      const keysAfter = _getImageCacheKeys();
      // 가장 오래된 entry 가 제거됨
      expect(keysAfter).not.toContain(oldestKey);
      // 그 외 49개는 유지
      expect(keysAfter.slice(0, _MAX_IMAGE_CACHE_ENTRIES - 1)).toEqual(
        keysBefore.slice(1),
      );
    });

    it('hit 시 entry 가 최신 위치로 갱신 (insertion order 변경)', async () => {
      // 3개만 추가
      for (let i = 0; i < 3; i++) {
        messagesCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: `text-${i}` }],
        });
        await parseImage(makeBuffer(i), 'image/png');
      }
      const keysBefore = _getImageCacheKeys();
      // 가장 오래된 항목(index 0)을 hit 시킴 — API 추가 호출 없음
      const callsBefore = messagesCreate.mock.calls.length;
      await parseImage(makeBuffer(0), 'image/png');
      expect(messagesCreate.mock.calls.length).toBe(callsBefore);

      const keysAfter = _getImageCacheKeys();
      // hit 된 키가 마지막 위치로 이동
      expect(keysAfter[keysAfter.length - 1]).toBe(keysBefore[0]);
      // 나머지 두 항목은 상대 순서 유지
      expect(keysAfter[0]).toBe(keysBefore[1]);
      expect(keysAfter[1]).toBe(keysBefore[2]);
    });
  });
});
