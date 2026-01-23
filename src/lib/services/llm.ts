/**
 * LLM 서비스 - OpenAI GPT-5 mini
 * 나중에 다른 LLM으로 교체 가능하도록 인터페이스 분리
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
  model: 'gpt-5-mini', // GPT-5 mini
  temperature: 0.7,
  maxTokens: 8000,
};

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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: finalConfig.model,
      messages,
      temperature: finalConfig.temperature,
      max_tokens: finalConfig.maxTokens,
    }),
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
