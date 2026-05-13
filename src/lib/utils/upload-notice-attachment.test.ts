import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Server Actions 모킹 ───────────────────────────────────────────────────
const mockCreateUploadUrlAction = vi.fn();
const mockRegisterAttachmentAction = vi.fn();

vi.mock('@/app/(dashboard)/ops/notices/actions', () => ({
  createUploadUrlAction: (...args: unknown[]) => mockCreateUploadUrlAction(...args),
  registerAttachmentAction: (...args: unknown[]) => mockRegisterAttachmentAction(...args),
}));

// ─── 대상 함수 import ───────────────────────────────────────────────────
import { uploadNoticeAttachmentDirect } from './upload-notice-attachment';

// ─── fetch 모킹 ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// 헬퍼 — 가짜 File 생성
function makeFile(name: string, size: number, mime: string): File {
  return {
    name,
    type: mime,
    size,
  } as unknown as File;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadNoticeAttachmentDirect', () => {
  it('3단계 모두 성공 시 attachment 반환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-a.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    const attachment = {
      id: 'att-1',
      notice_id: 'n-1',
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
      uploaded_at: '2026-01-01',
    };
    mockRegisterAttachmentAction.mockResolvedValue({
      success: true,
      data: { attachment },
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachment.id).toBe('att-1');
    }
    // 3단계 순서대로 호출되었는지
    expect(mockCreateUploadUrlAction).toHaveBeenCalledWith(
      'n-1',
      'a.pdf',
      'application/pdf',
      100,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://upload.example/path?token=abc',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(mockRegisterAttachmentAction).toHaveBeenCalledWith('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });
  });

  it('createUploadUrlAction 실패 시 그 error 전달, fetch·register 미호출', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: false,
      error: '권한 없음',
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('권한 없음');
    }
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('fetch PUT status 400 응답 시 error 반환, register 미호출', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-a.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad request'),
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('400');
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  // ─── 413 Payload Too Large: 사용자 친화 메시지로 변환 ─────────────────
  // 배경: Supabase Storage 버킷 file_size_limit 초과 시 outer HTTP 400 +
  //       body JSON 의 statusCode === "413" / error === "Payload too large"
  //       형태로 응답한다. raw JSON 그대로 노출하면 사용자가 의미를
  //       파악할 수 없으므로 한국어 친화 메시지로 치환한다.

  it('Supabase Storage 413 응답(outer 400 + inner statusCode 413) 시 친화 메시지로 변환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-large.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          '{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}',
        ),
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('large.pdf', 25 * 1024 * 1024, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('30MB');
      expect(result.error).not.toContain('statusCode');
      expect(result.error).not.toContain('Payload too large');
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('직접 status 413 응답 시에도 친화 메시지로 변환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-large.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 413,
      text: () => Promise.resolve('Payload Too Large'),
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('large.pdf', 25 * 1024 * 1024, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('30MB');
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('status 500 등 413과 무관한 에러는 raw 메시지 유지 (회귀 방지)', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-a.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('500');
      expect(result.error).toContain('Internal Server Error');
      expect(result.error).not.toContain('30MB');
    }
  });

  it('fetch PUT throw 해도 error 반환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-a.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockRejectedValue(new Error('network down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('registerAttachmentAction 실패 시 그 error 전달', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-a.pdf',
        resolvedMime: 'application/pdf',
      },
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockRegisterAttachmentAction.mockResolvedValue({
      success: false,
      error: 'DB 에러',
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB 에러');
    }
  });

  it('fetch 시 Content-Type 헤더는 createUploadUrlAction 가 보정한 resolvedMime 사용', async () => {
    // .hwp 파일은 클라이언트 file.type 이 비어있고 resolvedMime 가 보정됨
    mockCreateUploadUrlAction.mockResolvedValue({
      success: true,
      data: {
        signedUrl: 'https://upload.example/path?token=abc',
        token: 'abc',
        storagePath: 'n-1/uuid-report.hwp',
        resolvedMime: 'application/x-hwp',
      },
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockRegisterAttachmentAction.mockResolvedValue({
      success: true,
      data: { attachment: { id: 'att-1' } },
    });

    await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('report.hwp', 100, ''),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-hwp',
        }),
      }),
    );
    // registerAttachmentAction 도 보정된 mime_type 으로 호출
    expect(mockRegisterAttachmentAction).toHaveBeenCalledWith('n-1', {
      file_name: 'report.hwp',
      mime_type: 'application/x-hwp',
      file_size: 100,
      storage_path: 'n-1/uuid-report.hwp',
    });
  });
});
