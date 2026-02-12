import type { SttInsights } from '@/lib/schemas/interview';

// ============================================================================
// STT 인사이트 관련 헬퍼
// ============================================================================

/** STT 인사이트 타입 가드 */
export function isSttInsights(value: unknown): value is SttInsights {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  // 최소한 하나의 유효한 필드가 있는지 확인
  return (
    Array.isArray(obj['추가_업무']) ||
    Array.isArray(obj['추가_페인포인트']) ||
    Array.isArray(obj['숨은_니즈']) ||
    typeof obj['조직_맥락'] === 'string' ||
    typeof obj['AI_태도'] === 'string' ||
    Array.isArray(obj['주요_인용'])
  );
}

/** 배열 항목 존재 여부 확인 */
export function hasItems(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.length > 0;
}

/** 배열을 마크다운 리스트로 변환 */
export function toMarkdownList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

/**
 * STT 인사이트를 프롬프트용 문자열로 포맷팅
 */
export function formatSttInsights(insights: SttInsights): string {
  const sections: string[] = [];

  if (hasItems(insights.추가_업무)) {
    sections.push(`**추가로 파악된 업무:**\n${toMarkdownList(insights.추가_업무)}`);
  }

  if (hasItems(insights.추가_페인포인트)) {
    sections.push(`**추가 페인포인트:**\n${toMarkdownList(insights.추가_페인포인트)}`);
  }

  if (hasItems(insights.숨은_니즈)) {
    sections.push(`**숨은 니즈:**\n${toMarkdownList(insights.숨은_니즈)}`);
  }

  if (insights.조직_맥락) {
    sections.push(`**조직 맥락:**\n${insights.조직_맥락}`);
  }

  if (insights.AI_태도) {
    sections.push(`**AI 도입에 대한 태도:**\n${insights.AI_태도}`);
  }

  if (hasItems(insights.주요_인용)) {
    sections.push(`**인터뷰 주요 발언:**\n${toMarkdownList(insights.주요_인용)}`);
  }

  return sections.join('\n\n');
}

/**
 * 인터뷰 데이터에서 STT 인사이트 섹션 생성
 */
export function buildSttInsightsSection(interview: Record<string, unknown>): string {
  const sttInsights = interview.stt_insights;

  if (!isSttInsights(sttInsights)) {
    return '';
  }

  return `
### STT 인터뷰 분석 인사이트

인터뷰 녹취록에서 AI가 추출한 추가 정보입니다. 로드맵 설계 시 참고하세요.

${formatSttInsights(sttInsights)}
`;
}
