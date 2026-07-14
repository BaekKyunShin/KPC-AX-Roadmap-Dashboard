/**
 * ops/notices Server Actions 테스트
 * - requireAuthWithRole, 서비스 함수, audit, revalidatePath 모킹
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(async () => {}),
}));

vi.mock('@/lib/services/notice', () => ({
  createNotice: vi.fn(),
  updateNotice: vi.fn(),
  deleteNotice: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  buildStoragePath: vi.fn((noticeId: string, name: string) => `${noticeId}/uuid-${name}`),
  createNoticeAttachmentUploadUrl: vi.fn(),
  registerNoticeAttachment: vi.fn(),
}));

import {
  createNoticeAction,
  updateNoticeAction,
  deleteNoticeAction,
  togglePinAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  createUploadUrlAction,
  registerAttachmentAction,
} from './actions';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import * as noticeService from '@/lib/services/notice';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import { ATTACHMENT_TOO_LARGE_MESSAGE } from '@/lib/schemas/notice';

// ─── 헬퍼 ────────────────────────────────────────────────────────────────

function setAuthSuccess(userId = 'user-1') {
  vi.mocked(requireAuthWithRole).mockResolvedValue({
    user: { id: userId, email: 'a@b.c' },
    supabase: {} as never,
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
  } as never);
}

function setAuthFailure(error = '권한이 없습니다.') {
  vi.mocked(requireAuthWithRole).mockResolvedValue({ error } as never);
}

function makeFormData(values: Record<string, string | Blob>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.append(k, v);
  return fd;
}

/** Vitest 환경: 실제 File 생성 (instanceof File 통과) */
function makeFile(name: string, size: number, mime: string): File {
  return new File([new Uint8Array(size)], name, { type: mime });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ─── createNoticeAction ─────────────────────────────────────────────────

describe('createNoticeAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure('공지 작성 권한이 없습니다.');
    const result = await createNoticeAction(makeFormData({ title: 't', body: 'b' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('권한');
    }
  });

  it('제목 누락 시 Zod 검증 실패', async () => {
    setAuthSuccess();
    const result = await createNoticeAction(makeFormData({ title: '', body: 'b' }));
    expect(result.success).toBe(false);
  });

  it('성공 시 noticeId 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce({ id: 'n-1' });
    const result = await createNoticeAction(
      makeFormData({ title: '공지', body: '본문', is_pinned: 'on' })
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.noticeId).toBe('n-1');
  });

  it('서비스 실패 시 error 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce(null);
    const result = await createNoticeAction(makeFormData({ title: '공지', body: 'b' }));
    expect(result.success).toBe(false);
  });

  it('createAuditLog throw 해도 noticeId 반환 (회귀 #이슈1)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce({ id: 'n-1' });
    vi.mocked(createAuditLog).mockRejectedValueOnce(new Error('audit 테이블 에러'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createNoticeAction(makeFormData({ title: '공지', body: '본문' }));

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.noticeId).toBe('n-1');
    consoleSpy.mockRestore();
  });

  it('revalidatePath throw 해도 noticeId 반환 (회귀 #이슈1)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce({ id: 'n-1' });
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error('cache 무효화 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createNoticeAction(makeFormData({ title: '공지', body: '본문' }));

    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  // ─── 본 흐름 unknown throw 방어 (이슈 1-C 재발 차단) ─────────────────────
  // 증상: 첨부 포함 등록 시 클라이언트에 "An unexpected response was received
  // from the server" 토스트가 뜨지만 공지 row 는 저장됨. 원인은 본 흐름의
  // unknown throw 가 응답 직렬화를 손상시켜 fetch-server-response.ts(E394)
  // 에서 throw 한 것. createNotice / createAdminClient 등 모든 unknown
  // throw 가 ActionResult 로 변환되어야 한다.

  it('createNotice 서비스가 throw해도 ActionResult 반환 (회귀 #이슈1-C)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockRejectedValueOnce(new Error('DB 네트워크 에러'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createNoticeAction(makeFormData({ title: '공지', body: '본문' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
    consoleSpy.mockRestore();
  });
});

// ─── updateNoticeAction ─────────────────────────────────────────────────

describe('updateNoticeAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await updateNoticeAction('n-1', makeFormData({ title: 't', body: 'b' }));
    expect(result.success).toBe(false);
  });

  it('성공 시 simpleSuccess', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.updateNotice).mockResolvedValueOnce(true);
    const result = await updateNoticeAction('n-1', makeFormData({ title: '수정', body: 'b' }));
    expect(result.success).toBe(true);
  });

  it('빈 id 거부', async () => {
    setAuthSuccess();
    const result = await updateNoticeAction('', makeFormData({ title: 't' }));
    expect(result.success).toBe(false);
  });
});

// ─── deleteNoticeAction ─────────────────────────────────────────────────

describe('deleteNoticeAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await deleteNoticeAction('n-1');
    expect(result.success).toBe(false);
  });

  it('성공 시 simpleSuccess', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.deleteNotice).mockResolvedValueOnce(true);
    const result = await deleteNoticeAction('n-1');
    expect(result.success).toBe(true);
  });

  it('서비스 실패 시 error', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.deleteNotice).mockResolvedValueOnce(false);
    const result = await deleteNoticeAction('n-1');
    expect(result.success).toBe(false);
  });
});

// ─── togglePinAction ────────────────────────────────────────────────────

describe('togglePinAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await togglePinAction('n-1', true);
    expect(result.success).toBe(false);
  });

  it('pinned=true 전달', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.updateNotice).mockResolvedValueOnce(true);
    const result = await togglePinAction('n-1', true);
    expect(result.success).toBe(true);
    expect(noticeService.updateNotice).toHaveBeenCalledWith(
      'n-1',
      { is_pinned: true },
      expect.anything()
    );
  });
});

// ─── uploadAttachmentAction ─────────────────────────────────────────────

describe('uploadAttachmentAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') })
    );
    expect(result.success).toBe(false);
  });

  it('파일 없으면 실패', async () => {
    setAuthSuccess();
    const result = await uploadAttachmentAction('n-1', makeFormData({}));
    expect(result.success).toBe(false);
  });

  it('100MB 초과 거부', async () => {
    setAuthSuccess();
    const huge = makeFile('a.pdf', 100 * 1024 * 1024 + 1, 'application/pdf');
    const result = await uploadAttachmentAction('n-1', makeFormData({ file: huge }));
    expect(result.success).toBe(false);
  });

  it('100MB 이하(90MB)는 통과 — 상향된 한도가 실제로 적용된다', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.uploadAttachment).mockResolvedValueOnce({
      attachment: {
        id: 'att-90',
        notice_id: 'n-1',
        file_name: 'big.pdf',
        mime_type: 'application/pdf',
        file_size: 90 * 1024 * 1024,
        storage_path: 'n-1/big.pdf',
        uploaded_at: '2026-01-01',
      },
    });
    const big = makeFile('big.pdf', 90 * 1024 * 1024, 'application/pdf');
    const result = await uploadAttachmentAction('n-1', makeFormData({ file: big }));
    expect(result.success).toBe(true);
  });

  it('허용 확장자·크기면 서비스 호출 후 성공', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.uploadAttachment).mockResolvedValueOnce({
      attachment: {
        id: 'att-1',
        notice_id: 'n-1',
        file_name: 'a.pdf',
        storage_path: 'n-1/uuid-a.pdf',
        mime_type: 'application/pdf',
        file_size: 10,
        uploaded_at: '2026-01-01',
      },
    } as never);

    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') })
    );
    expect(result.success).toBe(true);
  });

  it('허용되지 않은 확장자 거부 (.exe)', async () => {
    setAuthSuccess();
    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({
        file: makeFile('mal.exe', 10, 'application/octet-stream'),
      })
    );
    expect(result.success).toBe(false);
  });

  it('createAuditLog throw 해도 attachment 반환 (회귀 #이슈1)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.uploadAttachment).mockResolvedValueOnce({
      attachment: {
        id: 'att-1',
        notice_id: 'n-1',
        file_name: 'a.pdf',
        storage_path: 'n-1/uuid-a.pdf',
        mime_type: 'application/pdf',
        file_size: 10,
        uploaded_at: '2026-01-01',
      },
    } as never);
    vi.mocked(createAuditLog).mockRejectedValueOnce(new Error('audit 테이블 에러'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') })
    );

    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  it('revalidatePath throw 해도 attachment 반환 (회귀 #이슈1)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.uploadAttachment).mockResolvedValueOnce({
      attachment: {
        id: 'att-1',
        notice_id: 'n-1',
        file_name: 'a.pdf',
        storage_path: 'n-1/uuid-a.pdf',
        mime_type: 'application/pdf',
        file_size: 10,
        uploaded_at: '2026-01-01',
      },
    } as never);
    vi.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error('cache 무효화 실패');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') })
    );

    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  // ─── 본 흐름 unknown throw 방어 (이슈 1-C 재발 차단) ─────────────────────
  // 증상: 첨부 포함 등록 시 catch 블록에 도달하여 "저장 실패 - An unexpected
  // response was received from the server" 토스트가 발생, 공지는 저장되었으나
  // 첨부는 누락. 본 흐름(서비스/admin client/파일 처리)에서의 unknown throw 가
  // 응답 직렬화를 손상시킨 것으로 판단. 모든 unknown throw 는 ActionResult 로
  // 변환되어 클라이언트 catch 블록에 도달하지 않아야 한다.

  it('uploadAttachment 서비스가 throw해도 ActionResult 반환 (회귀 #이슈1-C)', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.uploadAttachment).mockRejectedValueOnce(
      new Error('storage 네트워크 에러')
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
    consoleSpy.mockRestore();
  });
});

// ─── deleteAttachmentAction ─────────────────────────────────────────────

describe('deleteAttachmentAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await deleteAttachmentAction('att-1');
    expect(result.success).toBe(false);
  });

  it('성공 시 simpleSuccess', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.deleteAttachment).mockResolvedValueOnce(true);
    const result = await deleteAttachmentAction('att-1');
    expect(result.success).toBe(true);
  });
});

// ─── createUploadUrlAction (Storage 직접 업로드용 signed URL 발급) ───────

describe('createUploadUrlAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await createUploadUrlAction('n-1', 'a.pdf', 'application/pdf', 100);
    expect(result.success).toBe(false);
  });

  it('빈 noticeId 거부', async () => {
    setAuthSuccess();
    const result = await createUploadUrlAction('', 'a.pdf', 'application/pdf', 100);
    expect(result.success).toBe(false);
  });

  it('100MB 초과 거부', async () => {
    setAuthSuccess();
    const result = await createUploadUrlAction(
      'n-1',
      'a.pdf',
      'application/pdf',
      100 * 1024 * 1024 + 1
    );
    expect(result.success).toBe(false);
  });

  it('100MB 초과 거부 메시지는 ATTACHMENT_TOO_LARGE_MESSAGE 와 동일 (문구 drift 방지)', async () => {
    setAuthSuccess();
    const result = await createUploadUrlAction(
      'n-1',
      'a.pdf',
      'application/pdf',
      100 * 1024 * 1024 + 1
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ATTACHMENT_TOO_LARGE_MESSAGE);
    }
  });

  it('빈 파일(0바이트) 거부', async () => {
    setAuthSuccess();
    const result = await createUploadUrlAction('n-1', 'a.pdf', 'application/pdf', 0);
    expect(result.success).toBe(false);
  });

  it('허용되지 않은 확장자 거부 (.exe)', async () => {
    setAuthSuccess();
    const result = await createUploadUrlAction('n-1', 'mal.exe', 'application/octet-stream', 100);
    expect(result.success).toBe(false);
  });

  it('성공 시 signedUrl·token·storagePath·resolvedMime 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNoticeAttachmentUploadUrl).mockResolvedValueOnce({
      signedUrl: 'https://upload.example/path?token=abc',
      token: 'abc',
      storagePath: 'n-1/uuid-a.pdf',
      resolvedMime: 'application/pdf',
    });

    const result = await createUploadUrlAction('n-1', 'a.pdf', 'application/pdf', 100);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.signedUrl).toContain('upload.example');
      expect(result.data.token).toBe('abc');
      expect(result.data.storagePath).toBe('n-1/uuid-a.pdf');
    }
  });

  it('서비스 throw 해도 ActionResult 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNoticeAttachmentUploadUrl).mockRejectedValueOnce(
      new Error('network down')
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createUploadUrlAction('n-1', 'a.pdf', 'application/pdf', 100);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
    consoleSpy.mockRestore();
  });
});

// ─── registerAttachmentAction (Storage 업로드 후 DB row 등록) ─────────────

describe('registerAttachmentAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await registerAttachmentAction('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('빈 noticeId 거부', async () => {
    setAuthSuccess();
    const result = await registerAttachmentAction('', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('성공 시 attachment 반환', async () => {
    setAuthSuccess();
    const attachment = {
      id: 'att-1',
      notice_id: 'n-1',
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
      uploaded_at: '2026-01-01',
    };
    vi.mocked(noticeService.registerNoticeAttachment).mockResolvedValueOnce({
      attachment,
    } as never);

    const result = await registerAttachmentAction('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachment.id).toBe('att-1');
    }
  });

  it('서비스 실패 시 error 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.registerNoticeAttachment).mockResolvedValueOnce({
      error: 'duplicate key',
    });

    const result = await registerAttachmentAction('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('duplicate key');
    }
  });

  it('서비스 throw 해도 ActionResult 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.registerNoticeAttachment).mockRejectedValueOnce(new Error('db down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await registerAttachmentAction('n-1', {
      file_name: 'a.pdf',
      mime_type: 'application/pdf',
      file_size: 100,
      storage_path: 'n-1/uuid-a.pdf',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
    consoleSpy.mockRestore();
  });
});
