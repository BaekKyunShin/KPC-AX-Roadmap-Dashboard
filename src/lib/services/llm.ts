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
  maxTokens: 8000,
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

/**
 * 모델의 기능 설정 조회
 */
function getModelCapabilities(model: string): ModelCapabilities {
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
 */
export async function callLLM(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {}
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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[LLM Error]', error);
    throw new Error(`LLM API 호출 실패: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
  };
}

/**
 * JSON 형식으로 LLM 응답 요청
 * JSON 파싱 실패 시 재시도
 */
export async function callLLMForJSON<T>(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {},
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await callLLM(messages, config);

      // JSON 추출 (```json ... ``` 형식 처리)
      let jsonString = response.content;
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }

      // JSON 파싱
      const parsed = JSON.parse(jsonString.trim());
      return parsed as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[LLM JSON Parse] 시도 ${i + 1}/${maxRetries + 1} 실패:`, lastError.message);

      if (i < maxRetries) {
        // 재시도 시 JSON 형식 강조
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          lastMessage.content += '\n\n중요: 반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.';
        }
      }
    }
  }

  throw lastError || new Error('LLM JSON 파싱 실패');
}
