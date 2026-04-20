/**
 * HWPX Python Functions 호출 클라이언트 (Step 7 + Step 10 리팩터).
 *
 * Vercel Python Functions(`api/hwpx/generate.py`)에 POST로 로드맵/PBL 데이터를
 * 전달하고 HWPX 바이너리를 Buffer로 반환한다.
 *
 * 공용 헬퍼 `postToPythonGenerate`로 fetch·헤더·에러 처리·로깅을 캡슐화하고,
 * 트랙별 wrapper `generateRoadmapHwpx` / `generatePBLHwpx`를 제공한다.
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
 */

export interface RoadmapHwpxPayload {
  track: 'ROADMAP';
  fileName: string;
  data: Record<string, unknown>;
}

export interface PBLHwpxPayload {
  track: 'PBL';
  fileName: string;
  data: Record<string, unknown>;
}

export type HwpxPayload = RoadmapHwpxPayload | PBLHwpxPayload;

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

/**
 * 공통 POST 헬퍼 — 시크릿 헤더·bypass·fetch·에러 처리·응답 로깅 담당.
 * 로드맵/PBL 모두 이 함수를 공유한다 (계획서 Step 10 Task 7).
 */
async function postToPythonGenerate(
  payload: HwpxPayload,
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
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    headers['x-vercel-protection-bypass'] = bypassSecret;
  }

  console.log('[generateHwpx] fetching', {
    url,
    track: payload.track,
    hasBypass: Boolean(bypassSecret),
    bypassLen: bypassSecret?.length ?? 0,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (err) {
    const errObj = err as Error & { cause?: unknown };
    console.error('[generateHwpx] fetch threw', {
      url,
      track: payload.track,
      hasBypass: Boolean(bypassSecret),
      message: errObj?.message,
      cause: errObj?.cause instanceof Error
        ? errObj.cause.message
        : String(errObj?.cause ?? ''),
    });
    throw err;
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    const setCookie = response.headers.getSetCookie?.() ?? [];
    console.error('[generateHwpx] unexpected redirect — bypass rejected?', {
      url,
      track: payload.track,
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
    const isNextDevFallback =
      response.status === 404 &&
      (detail.includes('<!DOCTYPE html>') || detail.includes('__next_page'));

    console.error('[generateHwpx] non-ok response', {
      url,
      track: payload.track,
      status: response.status,
      hasBypass: Boolean(bypassSecret),
      isNextDevFallback,
      detail: detail.slice(0, 500),
    });

    if (isNextDevFallback) {
      // `next dev`는 Vercel Python 함수를 서빙하지 않음 → /api/hwpx/generate 가 404.
      // HWPX는 `python-hwpx` 라이브러리 의존으로 Next.js에서 네이티브 실행 불가.
      // 3가지 옵션: ① vercel dev ② Preview 배포 ③ Production 배포
      throw new Error(
        'HWPX는 Vercel Python 런타임이 필요합니다. 다음 중 하나로 테스트하세요:\n' +
          '① 현재 `npm run dev` 중단 후 `npm run dev:vercel` 실행 (Vercel CLI 필요)\n' +
          '② Preview 배포에서 테스트 (git push → Vercel Preview URL 사용)\n' +
          '③ Production 배포에서 확인',
      );
    }

    throw new Error(
      `HWPX generation failed: ${response.status} ${detail.slice(0, 200) || 'unknown error'}`.trim(),
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const getHeader = (name: string) => {
    try {
      return response.headers?.get?.(name) ?? null;
    } catch {
      return null;
    }
  };
  console.log('[generateHwpx] response received', {
    track: payload.track,
    bufferLength: buffer.length,
    firstBytes: buffer.subarray(0, 4).toString('hex'),
    contentEncoding: getHeader('content-encoding'),
    contentLength: getHeader('content-length'),
    contentType: getHeader('content-type'),
  });

  return buffer;
}

/**
 * 로드맵 HWPX 생성 — Python `_generate_roadmap` 호출.
 * (Step 7에서 `generateHwpx`로 도입, Step 10에서 `generateRoadmapHwpx`로 리네임.)
 */
export async function generateRoadmapHwpx(
  payload: RoadmapHwpxPayload,
  options?: GenerateHwpxOptions,
): Promise<Buffer> {
  return postToPythonGenerate(payload, options);
}

/**
 * PBL HWPX 생성 — Python `_generate_pbl` 호출 (Step 10).
 */
export async function generatePBLHwpx(
  payload: PBLHwpxPayload,
  options?: GenerateHwpxOptions,
): Promise<Buffer> {
  return postToPythonGenerate(payload, options);
}
