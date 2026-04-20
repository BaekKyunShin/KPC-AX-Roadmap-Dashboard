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
}));

import {
  createNoticeAction,
  updateNoticeAction,
  deleteNoticeAction,
  togglePinAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
} from './actions';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import * as noticeService from '@/lib/services/notice';

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
    const result = await createNoticeAction(
      makeFormData({ title: 't', body: 'b' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('권한');
    }
  });

  it('제목 누락 시 Zod 검증 실패', async () => {
    setAuthSuccess();
    const result = await createNoticeAction(
      makeFormData({ title: '', body: 'b' }),
    );
    expect(result.success).toBe(false);
  });

  it('성공 시 noticeId 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce({ id: 'n-1' });
    const result = await createNoticeAction(
      makeFormData({ title: '공지', body: '본문', is_pinned: 'on' }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.noticeId).toBe('n-1');
  });

  it('서비스 실패 시 error 반환', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.createNotice).mockResolvedValueOnce(null);
    const result = await createNoticeAction(
      makeFormData({ title: '공지', body: 'b' }),
    );
    expect(result.success).toBe(false);
  });
});

// ─── updateNoticeAction ─────────────────────────────────────────────────

describe('updateNoticeAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await updateNoticeAction(
      'n-1',
      makeFormData({ title: 't', body: 'b' }),
    );
    expect(result.success).toBe(false);
  });

  it('성공 시 simpleSuccess', async () => {
    setAuthSuccess();
    vi.mocked(noticeService.updateNotice).mockResolvedValueOnce(true);
    const result = await updateNoticeAction(
      'n-1',
      makeFormData({ title: '수정', body: 'b' }),
    );
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
      expect.anything(),
    );
  });
});

// ─── uploadAttachmentAction ─────────────────────────────────────────────

describe('uploadAttachmentAction', () => {
  it('권한 없으면 실패', async () => {
    setAuthFailure();
    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') }),
    );
    expect(result.success).toBe(false);
  });

  it('파일 없으면 실패', async () => {
    setAuthSuccess();
    const result = await uploadAttachmentAction('n-1', makeFormData({}));
    expect(result.success).toBe(false);
  });

  it('20MB 초과 거부', async () => {
    setAuthSuccess();
    const huge = makeFile('a.pdf', 21 * 1024 * 1024, 'application/pdf');
    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({ file: huge }),
    );
    expect(result.success).toBe(false);
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
      makeFormData({ file: makeFile('a.pdf', 10, 'application/pdf') }),
    );
    expect(result.success).toBe(true);
  });

  it('허용되지 않은 확장자 거부 (.exe)', async () => {
    setAuthSuccess();
    const result = await uploadAttachmentAction(
      'n-1',
      makeFormData({
        file: makeFile('mal.exe', 10, 'application/octet-stream'),
      }),
    );
    expect(result.success).toBe(false);
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
