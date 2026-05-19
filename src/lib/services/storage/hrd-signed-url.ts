/**
 * HRD 진단 보고서 PDF 의 storage path 또는 기존 signed URL 을
 * 항상 새 1시간 signed URL 로 정규화한다.
 *
 * 배경 (2026-05-18 회귀 수정):
 *   인터뷰 단계에서 발급된 signed URL 의 JWT exp 가 만료된 후 결과 페이지를 열면
 *   iframe.src 로 들어간 만료 URL 이 `{"error":"InvalidJWT", ...}` JSON 을 반환,
 *   브라우저가 그 JSON 을 본문에 노출했다. 이전 구현은 `url.startsWith('http')`
 *   일 때 재발급을 건너뛰어 만료된 URL 을 그대로 사용했다.
 *
 *   본 헬퍼는 입력이 storage_path 든 기존 signed URL 이든 항상 새 URL 을 발급한다.
 *   호출처: roadmap/actions.ts · pbl/actions.ts · interview/page.tsx 의 hydrate 흐름.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const SIGN_EXPIRES_IN_SECONDS = 3600;

/**
 * 입력 url 이 `/storage/v1/object/sign/<bucket>/<path>?token=...` 형식의 Supabase
 * signed URL 이면 path 만 추출. 그 외에는 null.
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const prefix = `/storage/v1/object/sign/${bucket}/`;
    if (!u.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(u.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

/**
 * url 입력을 정규화:
 *   - 빈 값 → undefined
 *   - http 로 시작 + sign path 형식 → path 추출 후 새 signed URL 발급
 *   - http 로 시작 + 다른 형식 → 외부 URL 로 간주, 원본 그대로 반환
 *   - 그 외 (storage_path 추정) → 새 signed URL 발급
 *
 * 발급 실패 시 원본 url 을 반환 (silent fallback). 호출처에서 url 이 http 인지
 * 검사해 iframe 렌더 여부를 결정한다.
 */
export async function resolveHrdSignedUrl(
  url: string | null | undefined,
  bucket: string,
): Promise<string | undefined> {
  if (!url) return undefined;

  let storagePath: string;
  if (url.startsWith('http')) {
    const extracted = extractStoragePath(url, bucket);
    if (extracted === null) {
      // 외부 URL — 그대로 사용
      return url;
    }
    storagePath = extracted;
  } else {
    storagePath = url;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGN_EXPIRES_IN_SECONDS);
    if (error || !data) return url;
    return data.signedUrl;
  } catch {
    return url;
  }
}
