/**
 * LLM 서비스 - Anthropic Claude API
 * @anthropic-ai/sdk를 사용하여 Claude 모델 호출
 */

import Anthropic from '@anthropic-ai/sdk';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  finishReason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_CONFIG: LLMConfig = {
  model: 'claude-sonnet-4-6',
  temperature: 0.7,
  maxTokens: 20000,
};

/** LLM API 호출 타임아웃 (밀리초) — 로드맵 생성 등 복잡한 작업은 수 분 소요될 수 있음 */
const LLM_TIMEOUT_MS = 240_000;

const ERROR_TIMEOUT = `LLM API 호출 타임아웃 (${LLM_TIMEOUT_MS / 1000}초 초과)`;
const ERROR_CANCELLED = 'LLM 호출이 취소되었습니다.';

/** Anthropic 클라이언트 (lazy 초기화) */
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error('LLM API 키가 설정되지 않았습니다.');
    }
    _client = new Anthropic({ apiKey, timeout: LLM_TIMEOUT_MS });
  }
  return _client;
}

/** @internal 테스트용 클라이언트 리셋 */
export function _resetClient(): void {
  _client = null;
}

/**
 * LLM API 호출
 * @param signal - 외부 취소용 AbortSignal (타임아웃과 결합)
 */
export async function callLLM(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {},
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const client = getClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // system 메시지를 분리하여 Anthropic system 파라미터로 전달
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const systemPrompt =
    systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join('\n\n')
      : undefined;

  try {
    const response = await client.messages.create(
      {
        model: finalConfig.model,
        max_tokens: finalConfig.maxTokens ?? DEFAULT_CONFIG.maxTokens!,
        ...(systemPrompt !== undefined && { system: systemPrompt }),
        messages: chatMessages,
        ...(finalConfig.temperature !== undefined && {
          temperature: finalConfig.temperature,
        }),
      },
      ...(signal ? [{ signal }] : []),
    );

    // 응답 텍스트 추출
    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';

    // stop_reason → finishReason 정규화 (기존 인터페이스 호환)
    const finishReason =
      response.stop_reason === 'end_turn'
        ? 'stop'
        : response.stop_reason === 'max_tokens'
          ? 'length'
          : (response.stop_reason ?? undefined);

    return {
      content,
      finishReason,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    // 타임아웃
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error(ERROR_TIMEOUT);
    }

    // 사용자 취소 (SDK의 APIUserAbortError는 APIConnectionError 하위 클래스)
    if (
      error instanceof Anthropic.APIConnectionError &&
      (error.message.includes('abort') || error.message.includes('cancel'))
    ) {
      throw new Error(ERROR_CANCELLED);
    }

    // DOMException (AbortSignal에서 직접 발생할 수 있음)
    if (error instanceof DOMException) {
      if (error.name === 'TimeoutError') {
        throw new Error(ERROR_TIMEOUT);
      }
      if (error.name === 'AbortError') {
        throw new Error(ERROR_CANCELLED);
      }
    }

    // API 에러 (상태 코드 포함)
    if (error instanceof Anthropic.APIError) {
      console.error('[callLLM Error]', error.message);
      throw new Error(`LLM API 호출 실패: ${error.status}`);
    }

    throw error;
  }
}

/**
 * JSON 문자열 값 내부의 제어 문자를 이스케이프 처리
 * LLM이 JSON 문자열 안에 이스케이프 안 된 줄바꿈/탭 등을 넣는 경우 대응
 */
function sanitizeJsonControlChars(json: string): string {
  return json.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match.replace(/[\x00-\x1f]/g, (char) => {
      const escapes: Record<string, string> = {
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t',
        '\b': '\\b',
        '\f': '\\f',
      };
      return (
        escapes[char] ||
        `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
      );
    }),
  );
}

/**
 * JSON 형식으로 LLM 응답 요청
 * - LLM 호출 에러(타임아웃, 네트워크 등)는 재시도 없이 즉시 throw
 * - 응답 잘림(finishReason: length)은 재시도 없이 즉시 throw
 * - JSON 파싱 실패만 재시도
 */
export async function callLLMForJSON<T>(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {},
  maxRetries: number = 2,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    // LLM 호출 — 실패 시 재시도 없이 즉시 throw
    const response = await callLLM(messages, config, signal);

    // 응답 잘림 감지 — 토큰 한도 도달 시 재시도 무의미
    if (response.finishReason === 'length') {
      throw new Error(
        'LLM 응답이 토큰 한도에 도달하여 잘렸습니다. 프롬프트를 줄이거나 maxTokens를 늘려주세요.',
      );
    }

    try {
      // JSON 추출 (```json ... ``` 형식 처리)
      let jsonString = response.content;
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }

      // 제어 문자 정제 후 JSON 파싱
      const sanitized = sanitizeJsonControlChars(jsonString.trim());
      const parsed = JSON.parse(sanitized);
      return parsed as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[LLM JSON Parse] 시도 ${i + 1}/${maxRetries + 1} 실패:`,
        lastError.message,
      );

      if (i < maxRetries) {
        // 재시도 시 JSON 형식 강조 (원본 배열 변형 방지를 위해 복사본 사용)
        const retryMessages = messages.map((m) => ({ ...m }));
        const lastMessage = retryMessages[retryMessages.length - 1];
        if (lastMessage.role === 'user') {
          lastMessage.content +=
            '\n\n중요: 반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.';
        }
        messages = retryMessages;
      }
    }
  }

  throw lastError || new Error('LLM JSON 파싱 실패');
}

/**
 * 사용자 취소로 인한 에러인지 판별
 * 클라이언트에서 취소 시 에러 토스트 억제에 사용
 */
export function isCancelledError(errorMessage?: string): boolean {
  return !!errorMessage?.includes('취소되었습니다');
}

/**
 * LLM 에러를 사용자 친화적 메시지로 변환
 */
export function getLLMUserFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('취소되었습니다')) {
    return '로드맵 생성이 취소되었습니다.';
  }
  if (message.includes('타임아웃')) {
    return 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.';
  }
  if (message.includes('토큰 한도에 도달')) {
    return 'AI 응답이 잘렸습니다. 관리자에게 문의해 주세요.';
  }
  if (message.includes('Failed to fetch') || error instanceof TypeError) {
    return '네트워크 연결을 확인해 주세요.';
  }
  if (message.includes('JSON') || message.includes('파싱')) {
    return 'AI 응답 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }
  if (message.includes('API 키')) {
    return 'AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해 주세요.';
  }
  if (message.includes('API 호출 실패')) {
    return 'AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.';
  }

  return '오류가 발생했습니다. 다시 시도해 주세요.';
}
