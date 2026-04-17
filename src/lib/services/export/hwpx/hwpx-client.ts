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
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    headers['x-vercel-protection-bypass'] = bypassSecret;
    headers['x-vercel-set-bypass-cookie'] = 'samesitenone';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // 디버깅을 위해 실제 URL·상태·응답을 로그에 남긴다.
    console.error('[generateHwpx] fetch failed', {
      url,
      status: response.status,
      hasBypass: Boolean(bypassSecret),
      detail: detail.slice(0, 500),
    });
    throw new Error(
      `HWPX generation failed: ${response.status} ${detail.slice(0, 200) || 'unknown error'}`.trim(),
    );
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}
