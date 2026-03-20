/**
 * LLM 모킹 팩토리
 *
 * mock-supabase.ts의 큐 패턴을 차용하여 LLM 응답을 중앙 관리합니다.
 *
 * 사용 예:
 *   const llm = setupLLMMock(vi);
 *   llm.addResponse(createMockLLMResponse('Hello'));
 *   llm.addJSONResponse({ courses: [] });
 */

import { vi, type Mock } from 'vitest';

import type { LLMResponse } from '@/lib/services/llm';

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type LLMErrorType = 'rate_limit' | 'timeout' | 'invalid_json' | 'network' | 'api_key' | 'abort' | 'token_limit';

interface MockLLMReturn {
  /** 성공 응답 큐에 추가 */
  addResponse: (response: LLMResponse) => void;
  /** JSON 응답 큐에 추가 (자동으로 content를 JSON.stringify) */
  addJSONResponse: <T>(data: T) => void;
  /** 에러 큐에 추가 */
  addError: (type: LLMErrorType) => void;
  /** 큐 초기화 */
  resetResponses: () => void;
  /** callLLM mock 함수 직접 접근 */
  callLLM: Mock;
  /** callLLMForJSON mock 함수 직접 접근 */
  callLLMForJSON: Mock;
}

// ─── 응답 생성 헬퍼 ──────────────────────────────────────────────────────────

export function createMockLLMResponse(
  content: string,
  finishReason: string = 'stop',
): LLMResponse {
  return {
    content,
    finishReason,
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

export function createMockLLMJSONResponse<T>(data: T): LLMResponse {
  return createMockLLMResponse(JSON.stringify(data));
}

// ─── 에러 생성 헬퍼 ──────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<LLMErrorType, string> = {
  rate_limit: 'LLM API 호출 실패: 429',
  timeout: 'LLM API 호출 타임아웃 (240초 초과)',
  invalid_json: 'LLM JSON 파싱 실패',
  network: 'Failed to fetch',
  api_key: 'LLM API 키가 설정되지 않았습니다.',
  abort: 'LLM 호출이 취소되었습니다.',
  token_limit: 'LLM 응답이 토큰 한도에 도달하여 잘렸습니다. 프롬프트를 줄이거나 maxTokens를 늘려주세요.',
};

export function createMockLLMError(type: LLMErrorType): Error {
  return new Error(ERROR_MESSAGES[type]);
}

// ─── 모듈 Mock 설정 ──────────────────────────────────────────────────────────

type QueueItem =
  | { type: 'response'; value: LLMResponse }
  | { type: 'json'; value: unknown }
  | { type: 'error'; errorType: LLMErrorType };

export function setupLLMMock(viInstance: typeof vi): MockLLMReturn {
  const queue: QueueItem[] = [];
  let queueIndex = 0;

  function nextItem(): QueueItem {
    if (queueIndex < queue.length) {
      return queue[queueIndex++];
    }
    throw new Error(
      `mock-llm: 응답 큐 소진 (${queueIndex}번째 호출). addResponse/addJSONResponse/addError로 충분한 결과를 추가하세요.`,
    );
  }

  const mockCallLLM = viInstance.fn(async () => {
    const item = nextItem();
    if (item.type === 'error') throw createMockLLMError(item.errorType);
    return item.type === 'response'
      ? item.value
      : createMockLLMJSONResponse(item.value);
  });

  const mockCallLLMForJSON = viInstance.fn(async () => {
    const item = nextItem();
    if (item.type === 'error') throw createMockLLMError(item.errorType);
    if (item.type === 'json') return item.value;
    try {
      return JSON.parse(item.value.content);
    } catch {
      throw createMockLLMError('invalid_json');
    }
  });

  return {
    addResponse: (response: LLMResponse) => {
      queue.push({ type: 'response', value: response });
    },
    addJSONResponse: <T>(data: T) => {
      queue.push({ type: 'json', value: data });
    },
    addError: (type: LLMErrorType) => {
      queue.push({ type: 'error', errorType: type });
    },
    resetResponses: () => {
      queue.length = 0;
      queueIndex = 0;
    },
    callLLM: mockCallLLM,
    callLLMForJSON: mockCallLLMForJSON,
  };
}
