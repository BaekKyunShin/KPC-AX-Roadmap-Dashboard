/**
 * STT 인사이트 추출 서비스
 *
 * 인터뷰 녹취록(STT 텍스트)에서 AI 교육 로드맵 수립에 필요한 정보를 추출합니다.
 */

import { callLLMForJSON } from './llm';
import type { SttInsights } from '@/lib/schemas/interview';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  STT_EXTRACTION_TEMPERATURE,
} from '@/lib/constants/stt';

// ============================================================================
// 상수
// ============================================================================

/** STT 인사이트 추출용 시스템 프롬프트 */
const STT_EXTRACTION_SYSTEM_PROMPT = `당신은 AI 교육 로드맵 수립을 위한 인터뷰 분석 전문가입니다.

다음은 기업 현장 인터뷰 녹취록입니다.
컨설턴트가 별도로 정리한 핵심 정보(세부업무, 페인포인트, 개선목표 등) 외에
추가로 로드맵 수립에 참고할 만한 정보를 추출해주세요.

## 추출 항목

1. **추가_업무**: 인터뷰에서 언급되었으나 놓치기 쉬운 세부 업무
2. **추가_페인포인트**: 명시적으로 말하지 않았지만 드러나는 어려움
3. **숨은_니즈**: 직접 요청하진 않았지만 기대하는 것
4. **조직_맥락**: 교육 방식 선호, 변화 수용도, 의사결정 구조 등
5. **AI_태도**: AI 도입에 대한 기대, 우려, 과거 경험
6. **주요_인용**: 로드맵 설계에 참고할 만한 인터뷰이의 핵심 발언

## 출력 형식

JSON 형식으로 출력하세요. 해당 사항이 없으면 빈 배열 또는 빈 문자열로 표시합니다.

{
  "추가_업무": ["...", "..."],
  "추가_페인포인트": ["...", "..."],
  "숨은_니즈": ["...", "..."],
  "조직_맥락": "...",
  "AI_태도": "...",
  "주요_인용": ["\\"...\\"", "\\"...\\""]
}`;

// ============================================================================
// 검증 함수
// ============================================================================

/** STT 텍스트 크기 검증 결과 */
export type SttSizeValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * STT 텍스트 크기 검증
 *
 * @param sttText - 검증할 STT 텍스트
 * @returns 검증 결과 (valid: true 또는 error 메시지)
 */
export function validateSttTextSize(sttText: string): SttSizeValidationResult {
  const textBytes = new TextEncoder().encode(sttText).length;

  if (textBytes > MAX_STT_FILE_SIZE_BYTES) {
    const currentSizeKB = Math.round(textBytes / 1024);
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB까지 업로드 가능합니다. (현재: ${currentSizeKB}KB)`,
    };
  }

  return { valid: true };
}

// ============================================================================
// 인사이트 추출 함수
// ============================================================================

/**
 * STT 텍스트에서 로드맵 수립에 필요한 정보 추출
 *
 * LLM을 사용하여 인터뷰 녹취록에서 다음 정보를 추출합니다:
 * - 추가 업무
 * - 추가 페인포인트
 * - 숨은 니즈
 * - 조직 맥락
 * - AI 도입 태도
 * - 주요 인용
 *
 * @param sttText - 인터뷰 녹취록 텍스트
 * @returns 추출된 인사이트
 */
export async function extractInsightsFromStt(sttText: string): Promise<SttInsights> {
  const userPrompt = `## 인터뷰 녹취록

${sttText}

위 녹취록에서 AI 교육 로드맵 수립에 필요한 정보를 추출해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return callLLMForJSON<SttInsights>(
    [
      { role: 'system', content: STT_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: STT_EXTRACTION_TEMPERATURE }
  );
}
