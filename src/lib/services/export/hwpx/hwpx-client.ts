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
 *   1. `VERCEL_URL` (현재 deployment의 자기 URL — Preview/Prod 모두 안전)
 *   2. `NEXT_PUBLIC_APP_URL` (프로덕션 도메인이 고정된 경우 fallback)
 *   3. `http://localhost:3000` (로컬 개발)
 * 주의: 1순위가 VERCEL_URL이어야 Preview 배포에서도 같은 배포 내의 Python
 * 함수를 호출한다. NEXT_PUBLIC_APP_URL이 프로덕션 도메인으로 고정되어 있으면
 * Preview에서 프로덕션 URL을 찌르게 되어 실패한다.
 *
 * Deployment Protection 우회:
 * - Vercel Preview에 SSO Protection이 활성화된 경우 외부 HTTP 호출이 401을 받는다.
 * - 대시보드 → Deployment Protection → "Protection Bypass for Automation" 활성화 시
 *   `VERCEL_AUTOMATION_BYPASS_SECRET` 환경변수가 자동 생성된다.
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

export function resolveBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function generateHwpx(payload: RoadmapHwpxPayload): Promise<Buffer> {
  const secret = process.env.HWPX_API_SECRET;
  if (!secret) {
    throw new Error('HWPX_API_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const url = `${resolveBaseUrl()}/api/hwpx/generate`;
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
    throw new Error(
      `HWPX generation failed: ${response.status} ${detail || 'unknown error'}`.trim(),
    );
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}
