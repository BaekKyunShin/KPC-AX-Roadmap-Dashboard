/**
 * stt.ts 테스트
 * - validateSttTextSize: STT 텍스트 크기 검증 (순수 함수)
 */

import { describe, it, expect } from 'vitest';
import { validateSttTextSize } from './stt';
import { MAX_STT_FILE_SIZE_BYTES, MAX_STT_FILE_SIZE_KB } from '@/lib/constants/stt';

describe('validateSttTextSize', () => {
  it('빈 문자열은 유효', () => {
    const result = validateSttTextSize('');
    expect(result).toEqual({ valid: true });
  });

  it('짧은 문자열은 유효', () => {
    const result = validateSttTextSize('안녕하세요');
    expect(result).toEqual({ valid: true });
  });

  it('최대 크기 이하면 유효', () => {
    // ASCII 1바이트 문자로 정확히 MAX_STT_FILE_SIZE_BYTES만큼 생성
    const text = 'a'.repeat(MAX_STT_FILE_SIZE_BYTES);
    const result = validateSttTextSize(text);
    expect(result).toEqual({ valid: true });
  });

  it('최대 크기 초과 시 invalid + 에러 메시지', () => {
    // ASCII 1바이트 문자로 1바이트 초과
    const text = 'a'.repeat(MAX_STT_FILE_SIZE_BYTES + 1);
    const result = validateSttTextSize(text);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain(`${MAX_STT_FILE_SIZE_KB}KB`);
    }
  });

  it('에러 메시지에 현재 크기(KB)가 포함됨', () => {
    const text = 'a'.repeat(MAX_STT_FILE_SIZE_BYTES + 1024); // 1KB 초과
    const result = validateSttTextSize(text);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      const expectedCurrentKB = Math.round(
        new TextEncoder().encode(text).length / 1024,
      );
      expect(result.error).toContain(`${expectedCurrentKB}KB`);
    }
  });

  it('한글은 3바이트/문자 (UTF-8) — 바이트 기준 검증', () => {
    // 한글 1자 = 3바이트 (UTF-8)
    // MAX_STT_FILE_SIZE_BYTES / 3 문자까지는 유효
    const maxKoreanChars = Math.floor(MAX_STT_FILE_SIZE_BYTES / 3);
    const validText = '가'.repeat(maxKoreanChars);
    expect(validateSttTextSize(validText).valid).toBe(true);

    // 한 글자 더 추가하면 초과
    const overText = '가'.repeat(maxKoreanChars + 1);
    expect(validateSttTextSize(overText).valid).toBe(false);
  });
});
