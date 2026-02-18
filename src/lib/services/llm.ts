/**
 * LLM 서비스 - OpenAI 호환 API
 * 다양한 모델 지원 (GPT-4o, GPT-5, o1, o3 등)
 */

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
  model: 'gpt-5-mini',
  temperature: 0.7,
  maxTokens: 20000,
};

/**
 * 모델별 기능 설정
 * - useMaxCompletionTokens: max_tokens 대신 max_completion_tokens 사용
 * - supportsTemperature: temperature 파라미터 지원 여부
 */
interface ModelCapabilities {
  useMaxCompletionTokens: boolean;
  supportsTemperature: boolean;
}

const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // GPT-5 시리즈: max_completion_tokens 사용, temperature 미지원
  'gpt-5': { useMaxCompletionTokens: true, supportsTemperature: false },
  'gpt-5-mini': { useMaxCompletionTokens: true, supportsTemperature: false },
  // GPT-4o 시리즈: max_completion_tokens 사용, temperature 지원
  'gpt-4o': { useMaxCompletionTokens: true, supportsTemperature: true },
  'gpt-4o-mini': { useMaxCompletionTokens: true, supportsTemperature: true },
  // o1/o3 시리즈: max_completion_tokens 사용, temperature 미지원
  'o1': { useMaxCompletionTokens: true, supportsTemperature: false },
  'o1-mini': { useMaxCompletionTokens: true, supportsTemperature: false },
  'o1-preview': { useMaxCompletionTokens: true, supportsTemperature: false },
  'o3': { useMaxCompletionTokens: true, supportsTemperature: false },
  'o3-mini': { useMaxCompletionTokens: true, supportsTemperature: false },
};

// 기본 설정 (레거시 모델용)
const DEFAULT_CAPABILITIES: ModelCapabilities = {
  useMaxCompletionTokens: false,
  supportsTemperature: true,
};

/** LLM API 호출 타임아웃 (밀리초) — 로드맵 생성 등 복잡한 작업은 수 분 소요될 수 있음 */
const LLM_TIMEOUT_MS = 240_000;

/**
 * 모델의 기능 설정 조회
 */
export function getModelCapabilities(model: string): ModelCapabilities {
  // 정확히 일치하는 모델 찾기
  if (MODEL_CAPABILITIES[model]) {
    return MODEL_CAPABILITIES[model];
  }
  // 접두사로 일치하는 모델 찾기 (예: gpt-5-mini-2024-01 → gpt-5-mini)
  for (const [prefix, capabilities] of Object.entries(MODEL_CAPABILITIES)) {
    if (model.startsWith(prefix)) {
      return capabilities;
    }
  }
  return DEFAULT_CAPABILITIES;
}

/**
 * LLM API 호출
 * @param signal - 외부 취소용 AbortSignal (타임아웃과 결합)
 */
export async function callLLM(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {},
  signal?: AbortSignal
): Promise<LLMResponse> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_API_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('LLM API 키가 설정되지 않았습니다.');
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const capabilities = getModelCapabilities(finalConfig.model);

  // 모델 기능에 따라 파라미터 구성
  const requestBody: Record<string, unknown> = {
    model: finalConfig.model,
    messages,
  };

  if (capabilities.supportsTemperature && finalConfig.temperature !== undefined) {
    requestBody.temperature = finalConfig.temperature;
  }

  if (finalConfig.maxTokens !== undefined) {
    const tokenKey = capabilities.useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens';
    requestBody[tokenKey] = finalConfig.maxTokens;
  }

  let response: Response;
  try {
    const timeoutSignal = AbortSignal.timeout(LLM_TIMEOUT_MS);
    const fetchSignal = signal
      ? AbortSignal.any([timeoutSignal, signal])
      : timeoutSignal;

    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: fetchSignal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`LLM API 호출 타임아웃 (${LLM_TIMEOUT_MS / 1000}초 초과)`);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('LLM 호출이 취소되었습니다.');
    }
    throw error;
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('[callLLM Error]', error);
    throw new Error(`LLM API 호출 실패: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    finishReason: data.choices[0]?.finish_reason,
    usage: data.usage,
  };
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
      return escapes[char] || `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
    })
  );
}

/**
 * JSON 형식으로 LLM 응답 요청
 * - LLM 호출 에러(타임아웃, 네트워크 등)는 재시도 없이 즉시 throw
 * - 응답 잘림(finish_reason: length)은 재시도 없이 즉시 throw
 * - JSON 파싱 실패만 재시도
 */
export async function callLLMForJSON<T>(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {},
  maxRetries: number = 2,
  signal?: AbortSignal
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    // LLM 호출 — 실패 시 재시도 없이 즉시 throw
    const response = await callLLM(messages, config, signal);

    // 응답 잘림 감지 — 토큰 한도 도달 시 재시도 무의미
    if (response.finishReason === 'length') {
      throw new Error(
        'LLM 응답이 토큰 한도에 도달하여 잘렸습니다. 프롬프트를 줄이거나 maxTokens를 늘려주세요.'
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
      console.warn(`[LLM JSON Parse] 시도 ${i + 1}/${maxRetries + 1} 실패:`, lastError.message);

      if (i < maxRetries) {
        // 재시도 시 JSON 형식 강조 (원본 배열 변형 방지를 위해 복사본 사용)
        const retryMessages = messages.map((m) => ({ ...m }));
        const lastMessage = retryMessages[retryMessages.length - 1];
        if (lastMessage.role === 'user') {
          lastMessage.content += '\n\n중요: 반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.';
        }
        messages = retryMessages;
      }
    }
  }

  throw lastError || new Error('LLM JSON 파싱 실패');
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
