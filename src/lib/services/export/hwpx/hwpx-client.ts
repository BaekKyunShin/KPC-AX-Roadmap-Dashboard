/**
 * HWPX Python Functions 호출 클라이언트 (Step 7).
 *
 * Vercel Python Functions(`api/hwpx/generate.py`)에 POST로 로드맵/PBL 데이터를
 * 전달하고 HWPX 바이너리를 Buffer로 반환한다.
 *
 * 보안:
 * - `HWPX_API_SECRET` 환경변수를 요청 헤더 `X-HWPX-Secret`에 실어 보낸다.
 *   (Step 3 보안 원칙 — Python 핸들러가 동일 값을 검증한다.)
 *
 * URL 해석 우선순위 (서버→서버 내부 호출):
 *   1. 호출자가 `options.baseUrl` 전달 (권장 — Server Action에서 `headers()`로
 *      현재 요청 origin을 추출해 전달)
 *   2. `VERCEL_URL` 환경변수 (비어있지 않은 경우)
 *   3. `NEXT_PUBLIC_APP_URL`
 *   4. `http://localhost:3000`
 *
 * 1순위가 중요한 이유:
 * - 이 프로젝트는 `VERCEL_URL`이 유저 env로 빈 값("")으로 등록되어 있어
 *   시스템 자동 주입을 덮어쓴다. 따라서 환경변수에 의존할 수 없다.
 * - 호출자(Server Action)의 요청 `host` 헤더를 쓰면 Preview/Production/로컬
 *   어느 환경에서든 같은 deployment의 Python 함수를 안전하게 찌른다.
 *
 * Deployment Protection 우회:
 * - Vercel Preview에 SSO Protection이 활성화된 경우 외부 HTTP 호출이 401 반환.
 * - 대시보드 → Deployment Protection → "Protection Bypass for Automation" 활성화 시
 *   `VERCEL_AUTOMATION_BYPASS_SECRET` 환경변수가 자동 주입된다.
 * - 해당 값이 있으면 요청 헤더 `x-vercel-protection-bypass`에 담아 Protection을 우회한다.
 *
 * Step 10에서 PBL도 동일 클라이언트를 사용할 수 있도록 `track` 파라미터를
 * 포함한 범용 payload 인터페이스를 export한다.
 */

export interface RoadmapHwpxPayload {
  track: 'ROADMAP' | 'PBL';
  fileName: string;
  data: Record<string, unknown>;
}

export interface GenerateHwpxOptions {
  /** 같은 deployment를 찌르기 위해 Server Action의 요청 host 기반 URL을 전달. */
  baseUrl?: string;
}

export function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function generateHwpx(
  payload: RoadmapHwpxPayload,
  options?: GenerateHwpxOptions,
): Promise<Buffer> {
  const secret = process.env.HWPX_API_SECRET;
  if (!secret) {
    throw new Error('HWPX_API_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const url = `${resolveBaseUrl(options?.baseUrl)}/api/hwpx/generate`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-HWPX-Secret': secret,
  };

  // Vercel Deployment Protection (Preview SSO) 우회 헤더
  // 주의: `x-vercel-set-bypass-cookie`는 의도적으로 보내지 않는다.
  // 이 헤더가 있으면 Vercel이 `_vercel_jwt` 쿠키를 세팅하는 307 리다이렉트로
  // 응답하는데, Node fetch는 쿠키를 자동으로 재요청에 포함하지 않아
  // 리다이렉트 루프에 빠진다 (`redirect count exceeded`).
  // 서버→서버 단발성 호출에서는 bypass 헤더만으로 충분하며, Vercel이 즉시
  // 200을 반환한다.
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    headers['x-vercel-protection-bypass'] = bypassSecret;
  }

  // 요청 직전 상태 로그 — fetch 실패 시 원인 추적용
  console.log('[generateHwpx] fetching', {
    url,
    hasBypass: Boolean(bypassSecret),
    bypassLen: bypassSecret?.length ?? 0,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      // Vercel SSO가 POST 요청을 SSO 페이지로 302 리다이렉트하면 undici가
      // 리다이렉트 루프에 빠진다. manual로 설정하면 첫 응답 그대로 받아
      // bypass 헤더가 먹혔는지 즉시 판단할 수 있다. curl 테스트에서는
      // POST + bypass 헤더가 바로 200을 반환하지만 Next.js Server Action의
      // Node fetch는 다르게 동작하는 것으로 확인됨.
      redirect: 'manual',
      // Next.js App Router의 자동 fetch 캐싱을 비활성화 — Server Action 내부
      // 호출이 의도치 않게 캐싱/재검증 처리되어 요청 shape이 달라지는 것 방지.
      cache: 'no-store',
    });
  } catch (err) {
    const errObj = err as Error & { cause?: unknown };
    console.error('[generateHwpx] fetch threw', {
      url,
      hasBypass: Boolean(bypassSecret),
      message: errObj?.message,
      cause: errObj?.cause instanceof Error
        ? errObj.cause.message
        : String(errObj?.cause ?? ''),
    });
    throw err;
  }

  // redirect: 'manual'이므로 3xx는 여기서 분기 처리.
  // Vercel이 SSO로 리다이렉트하려는 경우 (bypass가 무시된 상황).
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    const setCookie = response.headers.getSetCookie?.() ?? [];
    console.error('[generateHwpx] unexpected redirect — bypass rejected?', {
      url,
      status: response.status,
      location,
      hasSetCookie: setCookie.length > 0,
      setCookieKeys: setCookie.map((c) => c.split('=')[0]),
    });
    throw new Error(
      `HWPX generation failed: unexpected ${response.status} redirect to ${location ?? 'unknown'}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[generateHwpx] non-ok response', {
      url,
      status: response.status,
      hasBypass: Boolean(bypassSecret),
      detail: detail.slice(0, 500),
    });
    throw new Error(
      `HWPX generation failed: ${response.status} ${detail.slice(0, 200) || 'unknown error'}`.trim(),
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 응답 크기·Content-Encoding 로그 — 클라이언트 다운로드 파일 손상 여부 진단용.
  // curl로 받은 파일이 정상이므로, Node fetch의 자동 decompression 또는 response
  // shape 문제로 크기가 다를 가능성 체크.
  console.log('[generateHwpx] response received', {
    bufferLength: buffer.length,
    firstBytes: buffer.subarray(0, 4).toString('hex'),
    contentEncoding: response.headers.get('content-encoding'),
    contentLength: response.headers.get('content-length'),
    contentType: response.headers.get('content-type'),
  });

  return buffer;
}
