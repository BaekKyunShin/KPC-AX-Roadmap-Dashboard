/**
 * resolveHrdSignedUrl — HRD 진단 보고서 PDF 의 storage_path / 만료 signed URL 을
 * 항상 새 signed URL 로 정규화하는 공통 헬퍼.
 *
 * 회귀 가드 (2026-05-18):
 * - 기존 hydrate 함수들이 `url.startsWith('http')` 일 때 재발급을 건너뛰는 버그가 있었음.
 * - 결과: 인터뷰에서 발급된 signed URL 의 JWT exp 가 만료되어 결과 페이지 iframe 에
 *   `{"statusCode":"400","error":"InvalidJWT", ...}` JSON 이 그대로 노출됨.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveHrdSignedUrl } from './hrd-signed-url';

// Supabase admin client mock
const createSignedUrlMock = vi.fn();
const fromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: { from: fromMock },
  }),
}));

const BUCKET = 'interview-attachments';

describe('resolveHrdSignedUrl', () => {
  beforeEach(() => {
    createSignedUrlMock.mockReset();
    fromMock.mockClear();
  });
  afterEach(() => vi.clearAllMocks());

  it('storage_path 형식 → 그 path 로 createSignedUrl 호출', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://fresh.example/sign/path?token=fresh' },
      error: null,
    });

    const out = await resolveHrdSignedUrl('projects/p1/hrd.pdf', BUCKET);

    expect(fromMock).toHaveBeenCalledWith(BUCKET);
    expect(createSignedUrlMock).toHaveBeenCalledWith('projects/p1/hrd.pdf', 3600);
    expect(out).toBe('https://fresh.example/sign/path?token=fresh');
  });

  it('이미 signed URL (http) 형식 → 만료 가능성 → path 추출 후 재발급', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://fresh.example/sign/projects/p1/hrd.pdf?token=fresh' },
      error: null,
    });

    const stale =
      'https://abc.supabase.co/storage/v1/object/sign/interview-attachments/projects/p1/hrd.pdf' +
      '?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.STALE_JWT';

    const out = await resolveHrdSignedUrl(stale, BUCKET);

    // path 추출 후 재발급되어야 함 — 핵심 회귀 가드
    expect(createSignedUrlMock).toHaveBeenCalledWith('projects/p1/hrd.pdf', 3600);
    expect(out).toBe('https://fresh.example/sign/projects/p1/hrd.pdf?token=fresh');
  });

  it('http URL 인데 sign path 형식이 아니면 원본 URL 그대로 반환 (안전 fallback)', async () => {
    const externalUrl = 'https://external.example/some-other-path/file.pdf';
    const out = await resolveHrdSignedUrl(externalUrl, BUCKET);

    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(out).toBe(externalUrl);
  });

  it('createSignedUrl 에러 → 원본 URL 반환 (silent fallback)', async () => {
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const out = await resolveHrdSignedUrl('projects/p1/hrd.pdf', BUCKET);

    expect(out).toBe('projects/p1/hrd.pdf');
  });

  it('빈 URL → undefined 반환', async () => {
    expect(await resolveHrdSignedUrl('', BUCKET)).toBeUndefined();
    expect(await resolveHrdSignedUrl(null as unknown as string, BUCKET)).toBeUndefined();
    expect(await resolveHrdSignedUrl(undefined as unknown as string, BUCKET)).toBeUndefined();
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('URL-encoded path 도 디코드 후 createSignedUrl 호출', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://fresh.example/sign/projects/p1/한글파일.pdf?token=fresh' },
      error: null,
    });

    const stale =
      'https://abc.supabase.co/storage/v1/object/sign/interview-attachments/' +
      'projects/p1/%ED%95%9C%EA%B8%80%ED%8C%8C%EC%9D%BC.pdf?token=STALE';

    await resolveHrdSignedUrl(stale, BUCKET);

    expect(createSignedUrlMock).toHaveBeenCalledWith('projects/p1/한글파일.pdf', 3600);
  });
});
