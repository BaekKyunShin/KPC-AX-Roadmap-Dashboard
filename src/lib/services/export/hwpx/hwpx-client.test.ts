/**
 * HWPX Python 함수 호출 클라이언트 단위 테스트 (TDD RED → GREEN).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateHwpx, type RoadmapHwpxPayload } from './hwpx-client';

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

describe('generateHwpx', () => {
  const payload: RoadmapHwpxPayload = {
    track: 'ROADMAP',
    fileName: 'test.hwpx',
    data: { company_name: '테스트(주)' },
  };

  it('성공 시 HWPX 바이너리(Buffer)를 반환한다', async () => {
    const body = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic
    mockFetchOk(body);

    const result = await generateHwpx(payload);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result[0]).toBe(0x50);
  });

  it('X-HWPX-Secret 헤더를 요청에 포함한다', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateHwpx(payload);

    expect(fetchFn).toHaveBeenCalledOnce();
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'X-HWPX-Secret': 'test-secret',
      'Content-Type': 'application/json',
    });
  });

  it('요청 URL은 NEXT_PUBLIC_APP_URL + /api/hwpx/generate 이다', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('https://app.example.com/api/hwpx/generate');
  });

  it('NEXT_PUBLIC_APP_URL 미설정 + VERCEL_URL 설정 시 VERCEL_URL 사용', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('https://preview.vercel.app/api/hwpx/generate');
  });

  it('NEXT_PUBLIC_APP_URL·VERCEL_URL 모두 미설정 시 localhost로 fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_URL', '');
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateHwpx(payload);

    const [url] = fetchFn.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/hwpx/generate');
  });

  it('HWPX_API_SECRET 환경변수가 없으면 에러를 던진다', async () => {
    vi.stubEnv('HWPX_API_SECRET', '');

    await expect(generateHwpx(payload)).rejects.toThrow(/HWPX_API_SECRET/);
  });

  it('요청 body는 track + data JSON', async () => {
    const fetchFn = mockFetchOk(new Uint8Array([0]));

    await generateHwpx(payload);

    const [, init] = fetchFn.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.track).toBe('ROADMAP');
    expect(body.fileName).toBe('test.hwpx');
    expect(body.data.company_name).toBe('테스트(주)');
  });

  it('응답이 500 에러면 예외를 던진다 (메시지에 상태 포함)', async () => {
    mockFetchError(500, 'generation failed: error');

    await expect(generateHwpx(payload)).rejects.toThrow(/500/);
  });
});
