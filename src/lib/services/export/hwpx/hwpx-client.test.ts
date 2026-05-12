/**
 * HWPX Python 함수 호출 클라이언트 단위 테스트 (TDD RED → GREEN).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateRoadmapHwpx, generatePBLHwpx, type RoadmapHwpxPayload, type PBLHwpxPayload } from './hwpx-client';

// fetch 모킹을 위한 helper
const _originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubEnv('HWPX_API_SECRET', 'test-secret');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com');
  vi.stubEnv('VERCEL_URL', 'preview.vercel.app');
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = _originalFetch;
});

function mockFetchOk(body: Uint8Array) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => body.buffer,
  } as Response);
  globalThis.fetch = fn as typeof fetch;
  return fn;
}

function mockFetchError(status: number, text: string) {
  const fn = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => text,
  } as Response);
  globalThis.fetch = fn as typeof fetch;
  return fn;
}

describe('generateRoadmapHwpx', () => {
  const payload: RoadmapHwpxPayload = {
    track: 'ROADMAP',
    fileName: 'test.hwpx',
    data: { company_name: '테스트(주)' },
  };

  it('성공 시 HWPX 바이너리(Buffer)를 반환한다', async () => {
    const body = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic
    mockFetchOk(body);

    const result = await generateRoadmapHwpx(payload);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result[0]).toBe(0x50);
  });

  it('X-HWPX-Secret 헤더를 요청에 포함한다', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'X-HWPX-Secret': 'test-secret',
      'Content-Type': 'application/json',
    });
  });

  it('options.baseUrl 전달 시 최우선 사용 (Server Action headers 기반)', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload, { baseUrl: 'https://preview-abc.vercel.app' });

    // 호출자가 전달한 baseUrl이 환경변수보다 우선
    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('https://preview-abc.vercel.app/api/hwpx/generate');
  });

  it('options.baseUrl 없으면 VERCEL_URL fallback', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('https://preview.vercel.app/api/hwpx/generate');
  });

  it('VERCEL_URL 빈 문자열이면 NEXT_PUBLIC_APP_URL fallback', async () => {
    vi.stubEnv('VERCEL_URL', '');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('https://app.example.com/api/hwpx/generate');
  });

  it('NEXT_PUBLIC_APP_URL·VERCEL_URL 모두 미설정 시 localhost로 fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_URL', '');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/hwpx/generate');
  });

  it('HWPX_API_SECRET 환경변수가 없으면 에러를 던진다', async () => {
    vi.stubEnv('HWPX_API_SECRET', '');

    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/HWPX_API_SECRET/);
  });

  it('요청 body는 track + data JSON', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [, init] = fetchFn.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.track).toBe('ROADMAP');
    expect(body.fileName).toBe('test.hwpx');
    expect(body.data.company_name).toBe('테스트(주)');
  });

  it('응답이 500 에러면 예외를 던진다 (메시지에 상태 포함)', async () => {
    mockFetchError(500, 'generation failed: error');

    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/500/);
  });

  it('VERCEL_AUTOMATION_BYPASS_SECRET 설정 시 bypass 헤더 + URL 쿼리 모두 추가 (set-bypass-cookie 제외)', async () => {
    vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', 'bypass-secret-xyz');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [calledUrl, init] = fetchFn.mock.calls[0];
    // 헤더로 전달
    expect((init as RequestInit).headers).toMatchObject({
      'x-vercel-protection-bypass': 'bypass-secret-xyz',
    });
    // 쿼리스트링으로도 전달 (Edge/CDN 변형 대응 — 헤더 누락 시 fallback)
    expect(String(calledUrl)).toContain(
      'x-vercel-protection-bypass=bypass-secret-xyz',
    );
    // set-bypass-cookie는 Node fetch 리다이렉트 루프를 유발하므로 보내지 않아야 함
    expect((init as RequestInit).headers).not.toHaveProperty('x-vercel-set-bypass-cookie');
  });

  it('VERCEL_AUTOMATION_BYPASS_SECRET 미설정 시 bypass 헤더 없음', async () => {
    vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', '');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateRoadmapHwpx(payload);

    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty('x-vercel-protection-bypass');
  });
});

describe('generatePBLHwpx', () => {
  const pblPayload: PBLHwpxPayload = {
    track: 'PBL',
    fileName: 'test-pbl.hwpx',
    data: { company_name: '테스트(주)', course_name: 'AI 과정' },
  };

  it('성공 시 HWPX 바이너리를 반환한다', async () => {
    const body = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    mockFetchOk(body);

    const result = await generatePBLHwpx(pblPayload);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result[0]).toBe(0x50);
  });

  it('요청 body는 track=PBL 로 전송된다', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generatePBLHwpx(pblPayload);

    const [, init] = fetchFn.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.track).toBe('PBL');
    expect(body.fileName).toBe('test-pbl.hwpx');
    expect(body.data.course_name).toBe('AI 과정');
  });

  it('X-HWPX-Secret 헤더를 동일하게 포함한다', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generatePBLHwpx(pblPayload);

    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'X-HWPX-Secret': 'test-secret',
    });
  });

  it('HWPX_API_SECRET 미설정 시 에러', async () => {
    vi.stubEnv('HWPX_API_SECRET', '');
    await expect(generatePBLHwpx(pblPayload)).rejects.toThrow(/HWPX_API_SECRET/);
  });
});

// ─── 미커버 분기: 리다이렉트·Next dev fallback·fetch throw ─────────────────

describe('postToPythonGenerate — 미커버 분기', () => {
  const payload: RoadmapHwpxPayload = {
    track: 'ROADMAP',
    fileName: 'test.hwpx',
    data: {},
  };

  it('3xx 리다이렉트 응답 → 에러 throw (bypass 거부)', async () => {
    // Vercel Preview 보호가 활성화되어 307 리다이렉트가 오는 경우
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 307,
      headers: {
        get: (name: string) => (name === 'location' ? 'https://vercel.com/sso' : null),
        getSetCookie: () => ['_vercel_jwt=abc'],
      },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/307/);
  });

  it('302 리다이렉트 응답 → 에러 메시지에 위치 포함', async () => {
    const redirectUrl = 'https://auth.vercel.com/login';
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: {
        get: (name: string) => (name === 'location' ? redirectUrl : null),
        getSetCookie: () => [],
      },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(redirectUrl);
  });

  it('3xx + setCookie 없음 → 에러 throw', async () => {
    // getSetCookie가 없는 환경 (구형 fetch polyfill)
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 301,
      headers: {
        get: () => '/moved',
        // getSetCookie 미구현
      },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/301/);
  });

  it('404 + Next dev HTML 응답 → Next dev fallback 에러 throw', async () => {
    // `npm run dev` 환경에서 Python 함수가 없을 때 Next.js가 HTML 404 페이지 반환
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '<!DOCTYPE html><html><body>Not Found</body></html>',
      headers: { get: () => null },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/Vercel Python/);
    consoleSpy.mockRestore();
  });

  it('404 + __next_page 응답 → Next dev fallback 에러 throw', async () => {
    // Next.js dev 서버의 다른 형태 404 응답
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Error: __next_page route not found',
      headers: { get: () => null },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/Vercel Python/);
    consoleSpy.mockRestore();
  });

  it('일반 404 (Next dev 아님) → 일반 에러 throw', async () => {
    // 일반적인 404 에러 (Python 함수 에러 등)
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '{"error": "payload invalid"}',
      headers: { get: () => null },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateRoadmapHwpx(payload)).rejects.toThrow(/404/);
    // Next dev fallback 에러 메시지가 아니어야 함
    await expect(generateRoadmapHwpx(payload)).rejects.not.toThrow(/Vercel Python/);
    consoleSpy.mockRestore();
  });

  it('fetch 자체가 throw → 에러 그대로 re-throw', async () => {
    // 네트워크 연결 실패 등
    const networkError = new Error('fetch failed');
    const fn = vi.fn().mockRejectedValue(networkError);
    globalThis.fetch = fn as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateRoadmapHwpx(payload)).rejects.toThrow('fetch failed');
    consoleSpy.mockRestore();
  });

  it('fetch 에러 객체에 cause 포함 → 로깅 후 re-throw', async () => {
    // ECONNREFUSED 등 cause를 가진 에러
    const cause = new Error('ECONNREFUSED');
    const networkError = Object.assign(new Error('fetch failed'), { cause });
    const fn = vi.fn().mockRejectedValue(networkError);
    globalThis.fetch = fn as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateRoadmapHwpx(payload)).rejects.toThrow('fetch failed');
    consoleSpy.mockRestore();
  });

  it('성공 응답의 headers.get 호출 시 예외 발생 → null 폴백', async () => {
    // response.headers.get이 throw 하는 엣지 케이스 (일부 환경/polyfill)
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([0x50, 0x4b]).buffer,
      headers: {
        get: () => {
          throw new Error('headers not available');
        },
        getSetCookie: () => [],
      },
    } as unknown as Response);
    globalThis.fetch = fn as typeof fetch;

    // 예외가 throw되지 않고 정상적으로 버퍼를 반환해야 함
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await generateRoadmapHwpx(payload);
    expect(Buffer.isBuffer(result)).toBe(true);
    consoleSpy.mockRestore();
  });
});

// ─── resolveBaseUrl ──────────────────────────────────────────────────────────

import { resolveBaseUrl } from './hwpx-client';

describe('resolveBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('override 전달 시 최우선 사용 (후행 슬래시 제거)', () => {
    expect(resolveBaseUrl('https://example.com/')).toBe('https://example.com');
  });

  it('override 없이 VERCEL_URL 사용', () => {
    vi.stubEnv('VERCEL_URL', 'my-app.vercel.app');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(resolveBaseUrl()).toBe('https://my-app.vercel.app');
  });

  it('VERCEL_URL 후행 슬래시 제거', () => {
    vi.stubEnv('VERCEL_URL', 'my-app.vercel.app/');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(resolveBaseUrl()).toBe('https://my-app.vercel.app');
  });

  it('VERCEL_URL 없고 NEXT_PUBLIC_APP_URL 사용', () => {
    vi.stubEnv('VERCEL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://my-production.com');
    expect(resolveBaseUrl()).toBe('https://my-production.com');
  });

  it('VERCEL_URL·NEXT_PUBLIC_APP_URL 모두 없으면 localhost 반환', () => {
    vi.stubEnv('VERCEL_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(resolveBaseUrl()).toBe('http://localhost:3000');
  });
});
