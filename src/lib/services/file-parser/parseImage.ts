/**
 * parseImage — 이미지 OCR (Anthropic Vision)
 *
 * - 모델: Haiku 4.5 (비용 절감, 인터뷰 첨부 OCR 용도에 충분)
 * - 캐시: sha256(buffer) 기준 메모리 Map. 동일 파일 재업로드 시 즉시 반환.
 * - 지원 mime: image/png, image/jpeg, image/webp, image/gif
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';

const VISION_MODEL = 'claude-haiku-4-5-20251001';
const VISION_MAX_TOKENS = 1500;
const VISION_PROMPT =
  '이 이미지에 있는 모든 텍스트를 빠짐없이 그대로 추출해 주세요. 한국어/영어/숫자/표 모두 포함하되, 보이지 않는 정보는 추측하지 마세요.';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

// 메모리 캐시 (모듈 수명 내 유효). LRU 가 아닌 단순 Map — 인터뷰 첨부는 동일 세션 내
// 중복 업로드 빈도가 낮고, 서버리스 환경에서 콜드 스타트마다 리셋되므로 충분.
const cache = new Map<string, string>();

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.LLM_API_KEY ?? '',
      timeout: 60_000,
    });
  }
  return _client;
}

export async function parseImage(
  buffer: Buffer | Uint8Array,
  mimeType: string,
): Promise<string> {
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
    throw new Error(`parseImage: 지원하지 않는 이미지 형식 (${mimeType})`);
  }

  const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const cacheKey = createHash('sha256').update(buf).digest('hex');

  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  const client = getClient();
  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: VISION_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as ImageMediaType,
              data: buf.toString('base64'),
            },
          },
          { type: 'text', text: VISION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const text = textBlock && 'text' in textBlock ? (textBlock.text ?? '') : '';

  cache.set(cacheKey, text);
  return text;
}

/** 테스트 전용 — 캐시 초기화 */
export function _resetImageCache(): void {
  cache.clear();
}
