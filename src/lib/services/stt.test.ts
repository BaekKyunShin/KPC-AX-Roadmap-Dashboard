/**
 * stt.ts 테스트
 * - validateSttTextSize: STT 텍스트 크기 검증 (순수 함수)
 * - extractInsightsFromStt: LLM 기반 인사이트 추출
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSttTextSize, extractInsightsFromStt } from './stt';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  STT_EXTRACTION_TEMPERATURE,
} from '@/lib/constants/stt';
import { callLLMForJSON } from './llm';

vi.mock('./llm', () => ({
  callLLMForJSON: vi.fn(),
}));

// ─── validateSttTextSize ────────────────────────────────────────────────────

describe('validateSttTextSize', () => {
  it('빈 문자열 → { valid: true }', () => {
    const result = validateSttTextSize('');
    expect(result).toEqual({ valid: true });
  });

  it('MAX_STT_FILE_SIZE_BYTES 이하 텍스트 → { valid: true }', () => {
    // ASCII 1바이트 문자로 정확히 최대 크기만큼 생성
    const text = 'a'.repeat(MAX_STT_FILE_SIZE_BYTES);
    const result = validateSttTextSize(text);
    expect(result).toEqual({ valid: true });
  });

  it('MAX_STT_FILE_SIZE_BYTES 초과 텍스트 → { valid: false, error: 크기 포함 메시지 }', () => {
    const text = 'a'.repeat(MAX_STT_FILE_SIZE_BYTES + 1);
    const result = validateSttTextSize(text);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain(`${MAX_STT_FILE_SIZE_KB}KB`);
      // 현재 크기도 포함
      const currentSizeKB = Math.round(
        new TextEncoder().encode(text).length / 1024,
      );
      expect(result.error).toContain(`${currentSizeKB}KB`);
    }
  });

  it('한글 텍스트 경계값 (멀티바이트 — 한글은 3바이트/글자, TextEncoder 기반)', () => {
    // 한글 1자 = 3바이트 (UTF-8)
    const maxKoreanChars = Math.floor(MAX_STT_FILE_SIZE_BYTES / 3);

    // 최대 한글 글자 수까지는 유효
    const validText = '가'.repeat(maxKoreanChars);
    expect(validateSttTextSize(validText).valid).toBe(true);

    // 한 글자 추가하면 3바이트 초과 → invalid
    const overText = '가'.repeat(maxKoreanChars + 1);
    expect(validateSttTextSize(overText).valid).toBe(false);
  });
});

// ─── extractInsightsFromStt ─────────────────────────────────────────────────

describe('extractInsightsFromStt', () => {
  const mockedCallLLM = vi.mocked(callLLMForJSON);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('LLM이 유효한 JSON 반환 → SttInsights 객체 반환', async () => {
    const validResponse = {
      추가_업무: ['데이터 정리', '보고서 작성'],
      추가_페인포인트: ['수작업 반복'],
      숨은_니즈: ['자동화 도구'],
      조직_맥락: '보수적 조직 문화',
      AI_태도: '긍정적이나 우려 있음',
      주요_인용: ['"AI가 업무를 대체할까 걱정됩니다"'],
    };

    mockedCallLLM.mockResolvedValue(validResponse);

    const result = await extractInsightsFromStt('인터뷰 녹취 내용입니다.');

    expect(result).toEqual(validResponse);
  });

  it('callLLMForJSON 호출 시 messages 배열 (system + user) 전달 확인', async () => {
    mockedCallLLM.mockResolvedValue({
      추가_업무: [],
      추가_페인포인트: [],
      숨은_니즈: [],
      조직_맥락: '',
      AI_태도: '',
      주요_인용: [],
    });

    const sttText = '테스트 녹취록 내용';
    await extractInsightsFromStt(sttText);

    expect(mockedCallLLM).toHaveBeenCalledTimes(1);

    const [messages] = mockedCallLLM.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain(sttText);
  });

  it('temperature 옵션 전달 확인 (STT_EXTRACTION_TEMPERATURE 사용)', async () => {
    mockedCallLLM.mockResolvedValue({});

    await extractInsightsFromStt('내용');

    const [, options] = mockedCallLLM.mock.calls[0];
    expect(options).toEqual({ temperature: STT_EXTRACTION_TEMPERATURE });
  });

  it('LLM이 스키마에 맞지 않는 데이터 반환 시 Zod parse 에러 throw', async () => {
    // sttInsightsSchema는 optional 필드가 많아 빈 객체도 통과
    // 타입이 완전히 잘못된 데이터로 테스트 (배열이어야 할 곳에 숫자)
    mockedCallLLM.mockResolvedValue({
      추가_업무: 12345, // z.array(z.string())에 숫자 전달
    });

    await expect(extractInsightsFromStt('내용')).rejects.toThrow();
  });
});
