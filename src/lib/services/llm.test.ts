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
  getLLMUserFriendlyError,
  isCancelledError,
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
              choices: [{ message: { content: '응답 텍스트' }, finish_reason: 'stop' }],
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

  it('responseFormat 설정 시 request body에 response_format 포함', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, { responseFormat: { type: 'json_object' } });

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('responseFormat 미설정 시 response_format 미포함', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages);

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.response_format).toBeUndefined();
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
      'LLM API 호출 타임아웃 (240초 초과)'
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

  it('finishReason을 반환', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '응답' }, finish_reason: 'length' }],
              usage: null,
            }),
        })
      )
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    const result = await callLLM(messages);
    expect(result.finishReason).toBe('length');
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

  function mockFetchResponse(content: string, finishReason: string = 'stop') {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content }, finish_reason: finishReason }],
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
              choices: [{ message: { content }, finish_reason: 'stop' }],
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
              choices: [{ message: { content }, finish_reason: 'stop' }],
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

  it('finish_reason이 length이면 재시도 없이 즉시 에러', async () => {
    mockFetchResponse('{"incomplete": true', 'length');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }])
    ).rejects.toThrow('LLM 응답이 토큰 한도에 도달하여 잘렸습니다');

    // 재시도 없이 1번만 호출
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('LLM 호출 에러(타임아웃 등)는 재시도 없이 즉시 throw', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(timeoutError)));

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }])
    ).rejects.toThrow('LLM API 호출 타임아웃');

    // 재시도 없이 1번만 호출
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('callLLMForJSON은 기본적으로 response_format: json_object 자동 적용', async () => {
    mockFetchResponse('{"ok": true}');

    await callLLMForJSON([{ role: 'user', content: '테스트' }]);

    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]?.body as string
    );
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('JSON 문자열 내 제어 문자를 자동 정제하여 파싱 성공', async () => {
    // 실제 줄바꿈이 JSON 문자열 값 안에 들어간 경우
    const contentWithControlChars = '{"desc": "줄바꿈\n포함된\t텍스트"}';
    mockFetchResponse(contentWithControlChars);

    const result = await callLLMForJSON<{ desc: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result.desc).toBe('줄바꿈\n포함된\t텍스트');
  });
});

// ─── getLLMUserFriendlyError ─────────────────────────────────────────────────

describe('getLLMUserFriendlyError', () => {
  it('타임아웃 에러', () => {
    const error = new Error('LLM API 호출 타임아웃 (180초 초과)');
    expect(getLLMUserFriendlyError(error)).toBe('AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.');
  });

  it('토큰 한도 잘림 에러', () => {
    const error = new Error('LLM 응답이 토큰 한도에 도달하여 잘렸습니다.');
    expect(getLLMUserFriendlyError(error)).toBe('AI 응답이 잘렸습니다. 관리자에게 문의해 주세요.');
  });

  it('네트워크 에러 (Failed to fetch)', () => {
    const error = new TypeError('Failed to fetch');
    expect(getLLMUserFriendlyError(error)).toBe('네트워크 연결을 확인해 주세요.');
  });

  it('JSON 파싱 에러', () => {
    const error = new Error('LLM JSON 파싱 실패');
    expect(getLLMUserFriendlyError(error)).toBe('AI 응답 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
  });

  it('API 키 에러', () => {
    const error = new Error('LLM API 키가 설정되지 않았습니다.');
    expect(getLLMUserFriendlyError(error)).toBe('AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해 주세요.');
  });

  it('API 호출 실패 에러', () => {
    const error = new Error('LLM API 호출 실패: 429');
    expect(getLLMUserFriendlyError(error)).toBe('AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('알 수 없는 에러', () => {
    const error = new Error('알 수 없는 에러');
    expect(getLLMUserFriendlyError(error)).toBe('오류가 발생했습니다. 다시 시도해 주세요.');
  });

  it('취소 에러', () => {
    const error = new Error('LLM 호출이 취소되었습니다.');
    expect(getLLMUserFriendlyError(error)).toBe('로드맵 생성이 취소되었습니다.');
  });

  it('Error가 아닌 문자열 에러', () => {
    expect(getLLMUserFriendlyError('알 수 없는 에러')).toBe('오류가 발생했습니다. 다시 시도해 주세요.');
  });

  it('TypeError (네트워크 에러 변형)', () => {
    const error = new TypeError('network error');
    expect(getLLMUserFriendlyError(error)).toBe('네트워크 연결을 확인해 주세요.');
  });
});

// ─── isCancelledError ─────────────────────────────────────────────────────

describe('isCancelledError', () => {
  it('취소 메시지 포함 시 true', () => {
    expect(isCancelledError('LLM 호출이 취소되었습니다.')).toBe(true);
  });

  it('취소 메시지 미포함 시 false', () => {
    expect(isCancelledError('타임아웃 에러')).toBe(false);
  });

  it('undefined 전달 시 false', () => {
    expect(isCancelledError(undefined)).toBe(false);
  });

  it('빈 문자열 전달 시 false', () => {
    expect(isCancelledError('')).toBe(false);
  });
});

// ─── callLLM 에지 케이스 ──────────────────────────────────────────────────

describe('callLLM 에지 케이스', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    process.env.LLM_API_BASE_URL = 'https://test-api.example.com/v1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('AbortError 발생 시 취소 에러 메시지를 던짐', async () => {
    const abortError = new DOMException('signal was aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(abortError)));

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow('LLM 호출이 취소되었습니다.');
  });

  it('외부 signal과 함께 호출 시 signal 옵션이 포함됨', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: '응답' }, finish_reason: 'stop' }],
              usage: null,
            }),
        })
      )
    );

    const controller = new AbortController();
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, {}, controller.signal);

    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(options?.signal).toBeDefined();
  });

  it('API 응답 500 에러', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
      )
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow('LLM API 호출 실패: 500');
  });

  it('choices 배열이 완전히 비어있으면 빈 문자열 반환', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [], usage: null }),
        })
      )
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    const result = await callLLM(messages);
    expect(result.content).toBe('');
    expect(result.finishReason).toBeUndefined();
  });
});

// ─── callLLMForJSON 에지 케이스 ───────────────────────────────────────────

describe('callLLMForJSON 에지 케이스', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    process.env.LLM_API_BASE_URL = 'https://test-api.example.com/v1';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function mockFetchResponse(content: string, finishReason: string = 'stop') {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content }, finish_reason: finishReason }],
              usage: null,
            }),
        })
      )
    );
  }

  it('빈 문자열 응답은 JSON 파싱 실패로 재시도', async () => {
    mockFetchResponse('');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 0)
    ).rejects.toThrow();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maxRetries=0이면 재시도 없이 1번만 호출', async () => {
    mockFetchResponse('not-json');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 0)
    ).rejects.toThrow();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('네트워크 에러는 재시도 없이 즉시 throw', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }])
    ).rejects.toThrow('Failed to fetch');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('JSON 내부에 중첩된 객체도 파싱 가능', async () => {
    mockFetchResponse('{"outer": {"inner": [1, 2, 3]}, "flag": true}');

    const result = await callLLMForJSON<{ outer: { inner: number[] }; flag: boolean }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result.outer.inner).toEqual([1, 2, 3]);
    expect(result.flag).toBe(true);
  });

  it('JSON 앞뒤 공백이 있어도 파싱 성공', async () => {
    mockFetchResponse('  \n  {"name": "공백"}\n  ');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result.name).toBe('공백');
  });

  it('system 메시지의 content는 재시도 시에도 변경되지 않음', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        callCount++;
        const content = callCount < 2 ? '잘못된 응답' : '{"ok": true}';
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content }, finish_reason: 'stop' }],
              usage: null,
            }),
        });
      })
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: '시스템 메시지' },
      { role: 'user', content: '원래 메시지' },
    ];

    await callLLMForJSON(messages, {}, 2);

    // 원본 messages 배열은 변형되지 않아야 함
    expect(messages[0].content).toBe('시스템 메시지');
    expect(messages[1].content).toBe('원래 메시지');
  });
});
