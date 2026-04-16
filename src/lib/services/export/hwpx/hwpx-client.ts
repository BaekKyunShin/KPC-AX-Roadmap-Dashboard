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
 * Step 10에서 PBL도 동일 클라이언트를 사용할 수 있도록 `track` 파라미터를
 * 포함한 범용 payload 인터페이스를 export한다.
 */

export interface RoadmapHwpxPayload {
  track: 'ROADMAP' | 'PBL';
  fileName: string;
  data: Record<string, unknown>;
}

function resolveBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export async function generateHwpx(payload: RoadmapHwpxPayload): Promise<Buffer> {
  const secret = process.env.HWPX_API_SECRET;
  if (!secret) {
    throw new Error('HWPX_API_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const url = `${resolveBaseUrl()}/api/hwpx/generate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HWPX-Secret': secret,
    },
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
