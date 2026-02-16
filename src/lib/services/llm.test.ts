/**
 * llm.ts 테스트
 * - getModelCapabilities: 모델별 기능 설정 조회 (순수 함수)
 * - callLLM: LLM API 호출 (fetch 모킹)
 * - callLLMForJSON: JSON 형식 응답 파싱 + 재시도 (fetch 모킹)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getModelCapabilities,
  callLLM,
  callLLMForJSON,
  type LLMMessage,
} from './llm';

// ─── getModelCapabilities ───────────────────────────────────────────────────

describe('getModelCapabilities', () => {
  describe('정확히 일치하는 모델', () => {
    it('gpt-5는 max_completion_tokens 사용, temperature 미지원', () => {
      const caps = getModelCapabilities('gpt-5');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: false,
      });
    });

    it('gpt-4o는 max_completion_tokens 사용, temperature 지원', () => {
      const caps = getModelCapabilities('gpt-4o');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: true,
      });
    });

    it('o3-mini는 max_completion_tokens 사용, temperature 미지원', () => {
      const caps = getModelCapabilities('o3-mini');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: false,
      });
    });
  });

  describe('접두사 매칭', () => {
    it('gpt-5-mini-2024-01은 gpt-5-mini로 매칭', () => {
      const caps = getModelCapabilities('gpt-5-mini-2024-01');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: false,
      });
    });

    it('gpt-4o-mini-2024-07은 gpt-4o-mini로 매칭', () => {
      const caps = getModelCapabilities('gpt-4o-mini-2024-07');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: true,
      });
    });

    it('o1-preview-2024은 o1-preview로 매칭', () => {
      const caps = getModelCapabilities('o1-preview-2024');
      expect(caps).toEqual({
        useMaxCompletionTokens: true,
        supportsTemperature: false,
      });
    });
  });

  describe('기본값 (알 수 없는 모델)', () => {
    it('등록되지 않은 모델은 레거시 기본값 반환', () => {
      const caps = getModelCapabilities('unknown-model');
      expect(caps).toEqual({
        useMaxCompletionTokens: false,
        supportsTemperature: true,
      });
    });

    it('빈 문자열도 기본값 반환', () => {
      const caps = getModelCapabilities('');
      expect(caps).toEqual({
        useMaxCompletionTokens: false,
        supportsTemperature: true,
      });
    });
  });
});

// ─── callLLM ────────────────────────────────────────────────────────────────

describe('callLLM', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    process.env.LLM_API_BASE_URL = 'https://test-api.example.com/v1';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '응답 텍스트' } }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            }),
        })
      )
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('API 키가 없으면 에러를 던짐', async () => {
    delete process.env.LLM_API_KEY;
    const messages: LLMMessage[] = [{ role: 'user', content: '안녕' }];

    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 키가 설정되지 않았습니다.'
    );
  });

  it('기본 설정으로 API를 호출하고 응답을 반환', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '안녕' }];
    const result = await callLLM(messages);

    expect(result.content).toBe('응답 텍스트');
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });

    // fetch 호출 검증
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://test-api.example.com/v1/chat/completions');
    expect(options?.method).toBe('POST');
    expect(
      (options?.headers as Record<string, string>)['Authorization']
    ).toBe('Bearer test-api-key');
  });

  it('fetch 호출 시 signal 옵션이 포함됨 (타임아웃 설정)', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages);

    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(options?.signal).toBeDefined();
  });

  it('기본 모델(gpt-5-mini)은 max_completion_tokens 사용, temperature 미포함', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages);

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.model).toBe('gpt-5-mini');
    expect(body.max_completion_tokens).toBe(20000);
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });

  it('temperature 지원 모델은 temperature를 포함', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, { model: 'gpt-4o', temperature: 0.5 });

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.5);
    expect(body.max_completion_tokens).toBe(20000);
  });

  it('레거시 모델은 max_tokens 사용', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, { model: 'legacy-model', maxTokens: 1000 });

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.max_tokens).toBe(1000);
    expect(body.max_completion_tokens).toBeUndefined();
    expect(body.temperature).toBe(0.7); // 레거시 기본값
  });

  it('기본 base URL은 OpenAI API', async () => {
    delete process.env.LLM_API_BASE_URL;
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages);

    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('타임아웃 발생 시 한국어 에러 메시지를 던짐', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(timeoutError)));

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 타임아웃 (60초 초과)'
    );
  });

  it('네트워크 에러는 그대로 전파', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow('Failed to fetch');
  });

  it('API 응답이 실패하면 에러를 던짐', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve('Rate limit exceeded'),
        })
      )
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 실패: 429'
    );
  });

  it('choices가 비어있으면 빈 문자열 반환', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{}], usage: null }),
        })
      )
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    const result = await callLLM(messages);
    expect(result.content).toBe('');
  });
});

// ─── callLLMForJSON ─────────────────────────────────────────────────────────

describe('callLLMForJSON', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    process.env.LLM_API_BASE_URL = 'https://test-api.example.com/v1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function mockFetchResponse(content: string) {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content } }],
              usage: null,
            }),
        })
      )
    );
  }

  it('순수 JSON 응답을 파싱', async () => {
    mockFetchResponse('{"name": "테스트", "value": 42}');

    const result = await callLLMForJSON<{ name: string; value: number }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '테스트', value: 42 });
  });

  it('```json ... ``` 래핑된 응답을 파싱', async () => {
    mockFetchResponse('```json\n{"name": "래핑된"}\n```');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '래핑된' });
  });

  it('``` ... ``` (json 타입 없이) 래핑된 응답도 파싱', async () => {
    mockFetchResponse('```\n{"name": "래핑된"}\n```');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '래핑된' });
  });

  it('JSON 파싱 실패 시 재시도', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        callCount++;
        const content =
          callCount < 3 ? '유효하지 않은 JSON' : '{"result": "성공"}';
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content } }],
              usage: null,
            }),
        });
      })
    );

    const result = await callLLMForJSON<{ result: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ result: '성공' });
    expect(callCount).toBe(3); // 2번 실패 + 1번 성공
  });

  it('maxRetries 횟수 초과 시 에러 던짐', async () => {
    mockFetchResponse('유효하지 않은 JSON');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 1)
    ).rejects.toThrow();

    // maxRetries=1이면 총 2번 시도 (초기 + 재시도 1회)
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('재시도 시 원본 messages 배열을 변형하지 않음', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        callCount++;
        const content =
          callCount < 2 ? '잘못된 응답' : '{"ok": true}';
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content } }],
              usage: null,
            }),
        });
      })
    );

    const messages: LLMMessage[] = [
      { role: 'user', content: '원래 메시지' },
    ];

    await callLLMForJSON(messages, {}, 2);

    // 원본 messages 배열은 변형되지 않아야 함
    expect(messages[0].content).toBe('원래 메시지');
  });

  it('기본 maxRetries는 2 (총 3번 시도)', async () => {
    mockFetchResponse('invalid');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }])
    ).rejects.toThrow();

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
