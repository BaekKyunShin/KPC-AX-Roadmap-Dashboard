import { NextResponse } from 'next/server';

/**
 * PoC 단계의 일회성 검증 라우트.
 *
 * Node(Next.js) Runtime에서 Python Function(/api/hwpx/generate)을 호출해
 * 런타임 간 통신이 정상 동작하는지 확인한다.
 *
 * Step 7에서 정식 클라이언트(`src/lib/services/export/hwpx/`)로 대체되고
 * 이 라우트는 삭제된다.
 */
export async function GET() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${base}/api/hwpx/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 공개 URL이므로 내부 시크릿 헤더 필수.
        'X-HWPX-Secret': process.env.HWPX_API_SECRET ?? '',
      },
      body: JSON.stringify({ title: 'Node → Python 통신 확인' }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status },
        { status: 500 },
      );
    }

    const ab = await res.arrayBuffer();
    return NextResponse.json({ ok: true, bytes: ab.byteLength });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  }
}
