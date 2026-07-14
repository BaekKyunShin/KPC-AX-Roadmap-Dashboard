import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Server Actions 모킹 ───────────────────────────────────────────────────
const mockCreateUploadUrlAction = vi.fn();
const mockRegisterAttachmentAction = vi.fn();

vi.mock('@/app/(dashboard)/ops/notices/actions', () => ({
  createUploadUrlAction: (...args: unknown[]) => mockCreateUploadUrlAction(...args),
  registerAttachmentAction: (...args: unknown[]) => mockRegisterAttachmentAction(...args),
}));

// ─── 대상 함수 import ───────────────────────────────────────────────────
import { uploadNoticeAttachmentDirect } from './upload-notice-attachment';

// ─── XMLHttpRequest 모킹 ─────────────────────────────────────────────────
// 배경: 업로드 진행률(%)을 얻으려면 fetch 로는 불가능하다 (요청 body 스트림
//       진행 이벤트가 표준에 없음). XHR 의 upload.onprogress 만이 유일한 수단.
//       100MB 첨부는 회선에 따라 수 분이 걸리므로 진행률 노출이 필수다.
interface ProgressEventLike {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

interface NextResponse {
  status: number;
  body: string;
  /** true 면 load 대신 error 이벤트를 발생시킨다 (네트워크 단절 재현) */
  networkError?: boolean;
}

let nextResponse: NextResponse = { status: 200, body: '' };
let xhrInstances: MockXHR[] = [];

class MockXHR {
  status = 0;
  responseText = '';
  open = vi.fn();
  setRequestHeader = vi.fn();

  private listeners: Record<string, Array<() => void>> = {};
  private progressCb?: (ev: ProgressEventLike) => void;

  upload = {
    addEventListener: (type: string, cb: (ev: ProgressEventLike) => void) => {
      if (type === 'progress') this.progressCb = cb;
    },
  };

  constructor() {
    xhrInstances.push(this);
  }

  addEventListener(type: string, cb: () => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  send = vi.fn((body: unknown) => {
    const total = (body as { size?: number })?.size ?? 0;
    // 실제 XHR 과 동일하게 비동기로 이벤트를 발생시킨다
    queueMicrotask(() => {
      if (nextResponse.networkError) {
        this.listeners['error']?.forEach((cb) => cb());
        return;
      }
      // 진행률 이벤트: 절반 → 완료
      this.progressCb?.({ lengthComputable: true, loaded: Math.floor(total / 2), total });
      this.progressCb?.({ lengthComputable: true, loaded: total, total });

      this.status = nextResponse.status;
      this.responseText = nextResponse.body;
      this.listeners['load']?.forEach((cb) => cb());
    });
  });
}

// 헬퍼 — 가짜 File 생성
function makeFile(name: string, size: number, mime: string): File {
  return {
    name,
    type: mime,
    size,
  } as unknown as File;
}

const UPLOAD_URL_OK = {
  success: true,
  data: {
    signedUrl: 'https://upload.example/path?token=abc',
    token: 'abc',
    storagePath: 'n-1/uuid-a.pdf',
    resolvedMime: 'application/pdf',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  xhrInstances = [];
  nextResponse = { status: 200, body: '' };
  vi.stubGlobal('XMLHttpRequest', MockXHR);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadNoticeAttachmentDirect', () => {
  it('3단계 모두 성공 시 attachment 반환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
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
      makeFile('a.pdf', 100, 'application/pdf')
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachment.id).toBe('att-1');
    }
    expect(mockCreateUploadUrlAction).toHaveBeenCalledWith('n-1', 'a.pdf', 'application/pdf', 100);
    // XHR 로 signedUrl 에 PUT
    expect(xhrInstances).toHaveLength(1);
    expect(xhrInstances[0].open).toHaveBeenCalledWith(
      'PUT',
      'https://upload.example/path?token=abc'
    );
    expect(mockRegisterAttachmentAction).toHaveBeenCalledWith('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });
  });

  // ─── 업로드 진행률 ────────────────────────────────────────────────────
  // 100MB 첨부는 수 분이 걸린다. 진행률이 없으면 사용자는 멈춘 것으로 오해한다.

  it('onProgress 콜백에 (loaded, total) 이 전달된다', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    mockRegisterAttachmentAction.mockResolvedValue({
      success: true,
      data: { attachment: { id: 'att-1' } },
    });
    const onProgress = vi.fn();

    await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 1000, 'application/pdf'),
      onProgress
    );

    expect(onProgress).toHaveBeenCalledWith(500, 1000);
    expect(onProgress).toHaveBeenLastCalledWith(1000, 1000);
  });

  it('onProgress 를 넘기지 않아도 정상 동작한다 (선택 인자)', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    mockRegisterAttachmentAction.mockResolvedValue({
      success: true,
      data: { attachment: { id: 'att-1' } },
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 1000, 'application/pdf')
    );

    expect(result.success).toBe(true);
  });

  it('createUploadUrlAction 실패 시 그 error 전달, XHR·register 미호출', async () => {
    mockCreateUploadUrlAction.mockResolvedValue({
      success: false,
      error: '권한 없음',
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('권한 없음');
    }
    expect(xhrInstances).toHaveLength(0);
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('PUT status 400 응답 시 error 반환, register 미호출', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    nextResponse = { status: 400, body: 'bad request' };

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf')
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
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    nextResponse = {
      status: 400,
      body: '{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}',
    };

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('large.pdf', 90 * 1024 * 1024, 'application/pdf')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('100MB');
      expect(result.error).not.toContain('statusCode');
      expect(result.error).not.toContain('Payload too large');
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('직접 status 413 응답 시에도 친화 메시지로 변환', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    nextResponse = { status: 413, body: 'Payload Too Large' };

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('large.pdf', 90 * 1024 * 1024, 'application/pdf')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('100MB');
    }
    expect(mockRegisterAttachmentAction).not.toHaveBeenCalled();
  });

  it('status 500 등 413과 무관한 에러는 raw 메시지 유지 (회귀 방지)', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    nextResponse = { status: 500, body: 'Internal Server Error' };

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('500');
      expect(result.error).toContain('Internal Server Error');
      expect(result.error).not.toContain('100MB');
    }
  });

  it('네트워크 오류(XHR error 이벤트) 시 error 반환, register 미호출', async () => {
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    nextResponse = { status: 0, body: '', networkError: true };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf')
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
    mockCreateUploadUrlAction.mockResolvedValue(UPLOAD_URL_OK);
    mockRegisterAttachmentAction.mockResolvedValue({
      success: false,
      error: 'DB 에러',
    });

    const result = await uploadNoticeAttachmentDirect(
      'n-1',
      makeFile('a.pdf', 100, 'application/pdf')
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB 에러');
    }
  });

  it('PUT 시 Content-Type 헤더는 createUploadUrlAction 가 보정한 resolvedMime 사용', async () => {
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
    mockRegisterAttachmentAction.mockResolvedValue({
      success: true,
      data: { attachment: { id: 'att-1' } },
    });

    await uploadNoticeAttachmentDirect('n-1', makeFile('report.hwp', 100, ''));

    expect(xhrInstances[0].setRequestHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/x-hwp'
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
