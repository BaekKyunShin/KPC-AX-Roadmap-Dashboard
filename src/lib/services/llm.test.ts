/**
 * llm.ts 테스트
 * - callLLM: Anthropic SDK를 통한 Claude API 호출
 * - callLLMForJSON: JSON 형식 응답 파싱 + 재시도
 * - getLLMUserFriendlyError: 에러 메시지 변환
 * - isCancelledError: 취소 에러 판별
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  callLLM,
  callLLMForJSON,
  getLLMUserFriendlyError,
  isCancelledError,
  LLMResponseInvalidError,
  _resetClient,
  type LLMMessage,
} from './llm';

// ─── Anthropic SDK 모킹 ────────────────────────────────────────────────────

const {
  mockCreate,
  MockAPIError,
  MockAPIConnectionError,
  MockAPIConnectionTimeoutError,
} = vi.hoisted(() => {
  const mockCreate = vi.fn();

  class MockAPIError extends Error {
    status: number;
    constructor(status: number, { message }: { message: string }) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  class MockAPIConnectionError extends Error {
    constructor(message: string = 'Connection error') {
      super(message);
      this.name = 'APIConnectionError';
    }
  }

  class MockAPIConnectionTimeoutError extends MockAPIConnectionError {
    constructor() {
      super('Connection timed out');
      this.name = 'APIConnectionTimeoutError';
    }
  }

  return {
    mockCreate,
    MockAPIError,
    MockAPIConnectionError,
    MockAPIConnectionTimeoutError,
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    static APIError = MockAPIError;
    static APIConnectionError = MockAPIConnectionError;
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
  }
  return { default: MockAnthropic };
});

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

/** Anthropic 응답 형식으로 mock 설정 */
function mockAnthropicResponse(
  text: string,
  stopReason: string = 'end_turn',
  usage = { input_tokens: 10, output_tokens: 20 },
) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    usage,
  });
}

// ─── callLLM ────────────────────────────────────────────────────────────────

describe('callLLM', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    _resetClient();
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetClient();
  });

  it('API 키가 없으면 에러를 던짐', async () => {
    delete process.env.LLM_API_KEY;
    const messages: LLMMessage[] = [{ role: 'user', content: '안녕' }];

    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 키가 설정되지 않았습니다.',
    );
  });

  it('기본 설정으로 API를 호출하고 응답을 반환', async () => {
    mockAnthropicResponse('응답 텍스트');
    const messages: LLMMessage[] = [{ role: 'user', content: '안녕' }];
    const result = await callLLM(messages);

    expect(result.content).toBe('응답 텍스트');
    expect(result.finishReason).toBe('stop'); // end_turn → stop
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });

    // SDK 호출 검증
    expect(mockCreate).toHaveBeenCalledOnce();
    const [body] = mockCreate.mock.calls[0];
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.max_tokens).toBe(20000);
    expect(body.temperature).toBe(0.7);
  });

  it('system 메시지를 분리하여 system 파라미터로 전달', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [
      { role: 'system', content: '시스템 프롬프트' },
      { role: 'user', content: '사용자 메시지' },
    ];
    await callLLM(messages);

    const [body] = mockCreate.mock.calls[0];
    expect(body.system).toBe('시스템 프롬프트');
    expect(body.messages).toEqual([
      { role: 'user', content: '사용자 메시지' },
    ]);
  });

  it('여러 system 메시지를 결합하여 전달', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [
      { role: 'system', content: '규칙 1' },
      { role: 'system', content: '규칙 2' },
      { role: 'user', content: '질문' },
    ];
    await callLLM(messages);

    const [body] = mockCreate.mock.calls[0];
    expect(body.system).toBe('규칙 1\n\n규칙 2');
  });

  it('system 메시지가 없으면 system 파라미터 미포함', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [{ role: 'user', content: '안녕' }];
    await callLLM(messages);

    const [body] = mockCreate.mock.calls[0];
    expect(body.system).toBeUndefined();
  });

  it('커스텀 모델과 temperature 전달', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, { model: 'claude-opus-4-6', temperature: 0.3 });

    const [body] = mockCreate.mock.calls[0];
    expect(body.model).toBe('claude-opus-4-6');
    expect(body.temperature).toBe(0.3);
  });

  it('maxTokens 전달', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, { maxTokens: 1000 });

    const [body] = mockCreate.mock.calls[0];
    expect(body.max_tokens).toBe(1000);
  });

  it('외부 signal 전달 시 request options에 포함', async () => {
    mockAnthropicResponse('응답');
    const controller = new AbortController();
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages, {}, controller.signal);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0];
    expect(callArgs[1]).toEqual({ signal: controller.signal });
  });

  it('signal 미제공 시 request options 미전달', async () => {
    mockAnthropicResponse('응답');
    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await callLLM(messages);

    expect(mockCreate).toHaveBeenCalledOnce();
    // signal 없으면 두 번째 인자 없음
    expect(mockCreate.mock.calls[0].length).toBe(1);
  });

  it('stop_reason: end_turn → finishReason: stop', async () => {
    mockAnthropicResponse('응답', 'end_turn');
    const result = await callLLM([{ role: 'user', content: '테스트' }]);
    expect(result.finishReason).toBe('stop');
  });

  it('stop_reason: max_tokens → finishReason: length', async () => {
    mockAnthropicResponse('응답', 'max_tokens');
    const result = await callLLM([{ role: 'user', content: '테스트' }]);
    expect(result.finishReason).toBe('length');
  });

  it('stop_reason: stop_sequence → finishReason: stop_sequence', async () => {
    mockAnthropicResponse('응답', 'stop_sequence');
    const result = await callLLM([{ role: 'user', content: '테스트' }]);
    expect(result.finishReason).toBe('stop_sequence');
  });

  it('usage 매핑: input_tokens/output_tokens → prompt_tokens/completion_tokens', async () => {
    mockAnthropicResponse('응답', 'end_turn', {
      input_tokens: 100,
      output_tokens: 200,
    });
    const result = await callLLM([{ role: 'user', content: '테스트' }]);
    expect(result.usage).toEqual({
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    });
  });

  it('content가 비어있으면 빈 문자열 반환', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
      stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    const result = await callLLM([{ role: 'user', content: '테스트' }]);
    expect(result.content).toBe('');
  });

  it('타임아웃 발생 시 한국어 에러 메시지를 던짐', async () => {
    mockCreate.mockRejectedValueOnce(new MockAPIConnectionTimeoutError());

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 타임아웃 (240초 초과)',
    );
  });

  it('사용자 취소(abort) 시 취소 에러 메시지를 던짐', async () => {
    mockCreate.mockRejectedValueOnce(
      new MockAPIConnectionError('Request was aborted'),
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM 호출이 취소되었습니다.',
    );
  });

  it('DOMException AbortError 발생 시 취소 에러', async () => {
    mockCreate.mockRejectedValueOnce(
      new DOMException('signal was aborted', 'AbortError'),
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM 호출이 취소되었습니다.',
    );
  });

  it('DOMException TimeoutError 발생 시 타임아웃 에러', async () => {
    mockCreate.mockRejectedValueOnce(
      new DOMException('signal timed out', 'TimeoutError'),
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 타임아웃 (240초 초과)',
    );
  });

  it('API 응답 에러(상태 코드)를 던짐', async () => {
    mockCreate.mockRejectedValueOnce(
      new MockAPIError(429, { message: 'Rate limit exceeded' }),
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 실패: 429',
    );
  });

  it('API 응답 500 에러', async () => {
    mockCreate.mockRejectedValueOnce(
      new MockAPIError(500, { message: 'Internal Server Error' }),
    );

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow(
      'LLM API 호출 실패: 500',
    );
  });

  it('네트워크 에러는 그대로 전파', async () => {
    mockCreate.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const messages: LLMMessage[] = [{ role: 'user', content: '테스트' }];
    await expect(callLLM(messages)).rejects.toThrow('Failed to fetch');
  });
});

// ─── callLLMForJSON ─────────────────────────────────────────────────────────

describe('callLLMForJSON', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LLM_API_KEY = 'test-api-key';
    _resetClient();
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetClient();
  });

  it('순수 JSON 응답을 파싱', async () => {
    mockAnthropicResponse('{"name": "테스트", "value": 42}');

    const result = await callLLMForJSON<{ name: string; value: number }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '테스트', value: 42 });
  });

  it('```json ... ``` 래핑된 응답을 파싱', async () => {
    mockAnthropicResponse('```json\n{"name": "래핑된"}\n```');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '래핑된' });
  });

  it('``` ... ``` (json 타입 없이) 래핑된 응답도 파싱', async () => {
    mockAnthropicResponse('```\n{"name": "래핑된"}\n```');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ name: '래핑된' });
  });

  it('JSON 파싱 실패 시 재시도', async () => {
    // 첫 두 번은 유효하지 않은 JSON, 세 번째는 성공
    mockAnthropicResponse('유효하지 않은 JSON');
    mockAnthropicResponse('또 유효하지 않은 JSON');
    mockAnthropicResponse('{"result": "성공"}');

    const result = await callLLMForJSON<{ result: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result).toEqual({ result: '성공' });
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('maxRetries 횟수 초과 시 에러 던짐', async () => {
    mockAnthropicResponse('유효하지 않은 JSON');
    mockAnthropicResponse('유효하지 않은 JSON');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 1),
    ).rejects.toThrow();

    // maxRetries=1이면 총 2번 시도 (초기 + 재시도 1회)
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('재시도 시 원본 messages 배열을 변형하지 않음', async () => {
    mockAnthropicResponse('잘못된 응답');
    mockAnthropicResponse('{"ok": true}');

    const messages: LLMMessage[] = [
      { role: 'user', content: '원래 메시지' },
    ];

    await callLLMForJSON(messages, {}, 2);

    // 원본 messages 배열은 변형되지 않아야 함
    expect(messages[0].content).toBe('원래 메시지');
  });

  it('기본 maxRetries는 2 (총 3번 시도)', async () => {
    mockAnthropicResponse('invalid');
    mockAnthropicResponse('invalid');
    mockAnthropicResponse('invalid');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }]),
    ).rejects.toThrow();

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('finishReason이 length이면 재시도 없이 즉시 에러', async () => {
    mockAnthropicResponse('{"incomplete": true', 'max_tokens');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }]),
    ).rejects.toThrow('LLM 응답이 토큰 한도에 도달하여 잘렸습니다');

    // 재시도 없이 1번만 호출
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('LLM 호출 에러(타임아웃 등)는 재시도 없이 즉시 throw', async () => {
    mockCreate.mockRejectedValueOnce(new MockAPIConnectionTimeoutError());

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }]),
    ).rejects.toThrow('LLM API 호출 타임아웃');

    // 재시도 없이 1번만 호출
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('JSON 문자열 내 제어 문자를 자동 정제하여 파싱 성공', async () => {
    // 실제 줄바꿈이 JSON 문자열 값 안에 들어간 경우
    const contentWithControlChars = '{"desc": "줄바꿈\n포함된\t텍스트"}';
    mockAnthropicResponse(contentWithControlChars);

    const result = await callLLMForJSON<{ desc: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result.desc).toBe('줄바꿈\n포함된\t텍스트');
  });

  it('빈 문자열 응답은 JSON 파싱 실패로 재시도', async () => {
    mockAnthropicResponse('');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 0),
    ).rejects.toThrow();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('maxRetries=0이면 재시도 없이 1번만 호출', async () => {
    mockAnthropicResponse('not-json');

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }], {}, 0),
    ).rejects.toThrow();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('네트워크 에러는 재시도 없이 즉시 throw', async () => {
    mockCreate.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      callLLMForJSON([{ role: 'user', content: '테스트' }]),
    ).rejects.toThrow('Failed to fetch');

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('JSON 내부에 중첩된 객체도 파싱 가능', async () => {
    mockAnthropicResponse('{"outer": {"inner": [1, 2, 3]}, "flag": true}');

    const result = await callLLMForJSON<{
      outer: { inner: number[] };
      flag: boolean;
    }>([{ role: 'user', content: '테스트' }]);

    expect(result.outer.inner).toEqual([1, 2, 3]);
    expect(result.flag).toBe(true);
  });

  it('JSON 앞뒤 공백이 있어도 파싱 성공', async () => {
    mockAnthropicResponse('  \n  {"name": "공백"}\n  ');

    const result = await callLLMForJSON<{ name: string }>([
      { role: 'user', content: '테스트' },
    ]);

    expect(result.name).toBe('공백');
  });

  it('system 메시지의 content는 재시도 시에도 변경되지 않음', async () => {
    mockAnthropicResponse('잘못된 응답');
    mockAnthropicResponse('{"ok": true}');

    const messages: LLMMessage[] = [
      { role: 'system', content: '시스템 메시지' },
      { role: 'user', content: '원래 메시지' },
    ];

    await callLLMForJSON(messages, {}, 2);

    // 원본 messages 배열은 변형되지 않아야 함
    expect(messages[0].content).toBe('시스템 메시지');
    expect(messages[1].content).toBe('원래 메시지');
  });

  // ─── validator 검증 (ISSUE-06·07·19 방어적 하드닝) ─────────────────────
  describe('validator 인자', () => {
    it('validator 가 성공하면 검증된 값을 반환한다', async () => {
      mockAnthropicResponse('{"name": "테스트", "score": 90}');

      const validator = (raw: unknown): { success: true; data: { name: string; score: number } } => ({
        success: true,
        data: raw as { name: string; score: number },
      });

      const result = await callLLMForJSON<{ name: string; score: number }>(
        [{ role: 'user', content: '테스트' }],
        {},
        2,
        undefined,
        validator,
      );

      expect(result.name).toBe('테스트');
      expect(result.score).toBe(90);
    });

    it('validator 가 첫 시도에서 실패 → 재시도 후 성공 시 검증된 값 반환', async () => {
      // 1회: 스키마 불일치 응답
      mockAnthropicResponse('{"recommendations": null}');
      // 2회: 올바른 응답
      mockAnthropicResponse('{"recommendations": [{"id": 1}]}');

      let callCount = 0;
      const validator = (raw: unknown) => {
        callCount++;
        const obj = raw as { recommendations?: unknown };
        if (!Array.isArray(obj.recommendations)) {
          return { success: false as const, error: '배열 필요' };
        }
        return { success: true as const, data: obj as { recommendations: { id: number }[] } };
      };

      const result = await callLLMForJSON<{ recommendations: { id: number }[] }>(
        [{ role: 'user', content: '테스트' }],
        {},
        2,
        undefined,
        validator,
      );

      expect(callCount).toBe(2);
      expect(result.recommendations).toHaveLength(1);
    });

    it('validator 가 모든 시도에서 실패하면 LLMResponseInvalidError 를 throw 한다', async () => {
      mockAnthropicResponse('{"wrong": 1}');
      mockAnthropicResponse('{"wrong": 2}');
      mockAnthropicResponse('{"wrong": 3}');

      const validator = () => ({ success: false as const, error: 'always-fail' });

      await expect(
        callLLMForJSON(
          [{ role: 'user', content: '테스트' }],
          {},
          2,
          undefined,
          validator,
        ),
      ).rejects.toThrow(LLMResponseInvalidError);
    });

    it('JSON 파싱 실패와 validator 실패가 섞여도 재시도 한도까지 시도', async () => {
      // 1회: JSON 파싱 실패 (재시도 소비)
      mockAnthropicResponse('invalid json text');
      // 2회: JSON 은 성공했으나 validator 실패 (재시도 소비)
      mockAnthropicResponse('{"wrong": 1}');
      // 3회: 성공
      mockAnthropicResponse('{"ok": true}');

      const validator = (raw: unknown) => {
        const obj = raw as { ok?: boolean };
        return obj.ok
          ? { success: true as const, data: obj as { ok: true } }
          : { success: false as const, error: 'missing ok' };
      };

      const result = await callLLMForJSON<{ ok: true }>(
        [{ role: 'user', content: '테스트' }],
        {},
        2,
        undefined,
        validator,
      );

      expect(result.ok).toBe(true);
    });
  });
});

describe('LLMResponseInvalidError', () => {
  it('name 과 cause 를 올바르게 보관한다', () => {
    const cause = new Error('original');
    const err = new LLMResponseInvalidError('검증 실패', { cause });
    expect(err.name).toBe('LLMResponseInvalidError');
    expect(err.message).toBe('검증 실패');
    expect(err.cause).toBe(cause);
  });
});

// ─── getLLMUserFriendlyError ─────────────────────────────────────────────────

describe('getLLMUserFriendlyError', () => {
  it('타임아웃 에러', () => {
    const error = new Error('LLM API 호출 타임아웃 (240초 초과)');
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.',
    );
  });

  it('토큰 한도 잘림 에러', () => {
    const error = new Error(
      'LLM 응답이 토큰 한도에 도달하여 잘렸습니다.',
    );
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 응답이 잘렸습니다. 관리자에게 문의해 주세요.',
    );
  });

  it('네트워크 에러 (Failed to fetch)', () => {
    const error = new TypeError('Failed to fetch');
    expect(getLLMUserFriendlyError(error)).toBe(
      '네트워크 연결을 확인해 주세요.',
    );
  });

  it('JSON 파싱 에러', () => {
    const error = new Error('LLM JSON 파싱 실패');
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 응답 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
    );
  });

  it('API 키 에러', () => {
    const error = new Error('LLM API 키가 설정되지 않았습니다.');
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해 주세요.',
    );
  });

  it('API 호출 실패 에러', () => {
    const error = new Error('LLM API 호출 실패: 429');
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
    );
  });

  it('알 수 없는 에러', () => {
    const error = new Error('알 수 없는 에러');
    expect(getLLMUserFriendlyError(error)).toBe(
      '오류가 발생했습니다. 다시 시도해 주세요.',
    );
  });

  it('취소 에러', () => {
    const error = new Error('LLM 호출이 취소되었습니다.');
    expect(getLLMUserFriendlyError(error)).toBe(
      '로드맵 생성이 취소되었습니다.',
    );
  });

  it('LLMResponseInvalidError 는 스키마 검증 실패 전용 메시지', () => {
    const error = new LLMResponseInvalidError('매칭 응답 검증 실패');
    expect(getLLMUserFriendlyError(error)).toBe(
      'AI 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.',
    );
  });

  it('Error가 아닌 문자열 에러', () => {
    expect(getLLMUserFriendlyError('알 수 없는 에러')).toBe(
      '오류가 발생했습니다. 다시 시도해 주세요.',
    );
  });

  it('TypeError (네트워크 에러 변형)', () => {
    const error = new TypeError('network error');
    expect(getLLMUserFriendlyError(error)).toBe(
      '네트워크 연결을 확인해 주세요.',
    );
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
