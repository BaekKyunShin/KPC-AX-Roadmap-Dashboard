/**
 * notice.ts 서비스 테스트
 * - Supabase 체인 모킹 (notification.test.ts 패턴 재사용)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadAttachment,
  deleteAttachment,
  incrementNoticeViewCount,
  sanitizeFileName,
  buildStoragePath,
} from './notice';

// ─── Supabase 체인 모킹 ─────────────────────────────────────────────────────

function createMockSupabase() {
  const results: Array<{ data: unknown; error: unknown; count?: number }> = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) return results[resultIndex++];
    return { data: null, error: null, count: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  for (const method of [
    'select',
    'eq',
    'ilike',
    'in',
    'order',
    'range',
    'returns',
  ]) {
    chainable[method] = vi.fn(() => chainable);
  }

  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.single = vi.fn(() => nextResult());
  chainable.maybeSingle = vi.fn(() => nextResult());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) =>
    Promise.resolve(nextResult()).then(resolve, reject);

  // Storage 모킹
  const storageMethods = {
    upload: vi.fn(() => Promise.resolve({ data: { path: 'ok' }, error: null })),
    remove: vi.fn(() => Promise.resolve({ data: [], error: null })),
    createSignedUrl: vi.fn(() =>
      Promise.resolve({
        data: { signedUrl: 'https://signed.example/path' },
        error: null,
      }),
    ),
  };
  const storage = { from: vi.fn(() => storageMethods) };

  const mockClient = {
    from: vi.fn(() => chainable),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    storage,
  };

  return {
    mockClient,
    chainable,
    storageMethods,
    addResult: (r: { data: unknown; error: unknown; count?: number }) => {
      results.push(r);
    },
  };
}

// ─── 순수 헬퍼 ─────────────────────────────────────────────────────────────

describe('sanitizeFileName', () => {
  it('공백·특수문자를 _로 치환', () => {
    expect(sanitizeFileName('my file (1).pdf')).toBe('my_file__1_.pdf');
  });

  it('한글·영숫자·점·하이픈 유지', () => {
    expect(sanitizeFileName('요청서-v2.pdf')).toBe('요청서-v2.pdf');
  });
});

describe('buildStoragePath', () => {
  it('noticeId 폴더 + uuid + 안전화된 파일명 구조', () => {
    const path = buildStoragePath('abc-123', '요청서 (1).pdf');
    expect(path.startsWith('abc-123/')).toBe(true);
    expect(path.endsWith('요청서__1_.pdf')).toBe(true);
  });
});

// ─── listNotices ────────────────────────────────────────────────────────────

describe('listNotices', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('정상 목록 조회 — is_pinned desc, created_at desc 정렬', async () => {
    mock.addResult({
      data: [
        {
          id: '1',
          title: '고정',
          body: '',
          author_id: 'u1',
          is_pinned: true,
          view_count: 0,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          author: { name: '관리자' },
          notice_attachments: [{ count: 2 }],
        },
      ],
      error: null,
      count: 1,
    });

    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
    );

    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
    expect(result.items[0].attachment_count).toBe(2);
    expect(mock.chainable.order).toHaveBeenCalledWith('is_pinned', {
      ascending: false,
    });
    expect(mock.chainable.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });

  it('빈 결과 반환', async () => {
    mock.addResult({ data: [], error: null, count: 0 });
    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('filter_by=title + q 지정 시 title ILIKE 호출', async () => {
    mock.addResult({ data: [], error: null, count: 0 });
    await listNotices(
      { filter_by: 'title', q: '공지', page: 1, per_page: 10 },
      mock.mockClient as never,
    );
    expect(mock.chainable.ilike).toHaveBeenCalledWith('title', '%공지%');
  });

  it('DB 에러 시 빈 결과 반환', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'db fail' }, count: 0 });
    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
    );
    expect(result.items).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── getNotice ──────────────────────────────────────────────────────────────

describe('getNotice', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('존재하는 공지 반환', async () => {
    mock.addResult({
      data: {
        id: 'n1',
        title: '테스트',
        body: '본문',
        author_id: 'u1',
        is_pinned: false,
        view_count: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        author: { name: '관리자' },
        notice_attachments: [],
      },
      error: null,
    });

    const result = await getNotice('n1', mock.mockClient as never);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('n1');
    expect(result?.notice_attachments).toEqual([]);
  });

  it('없는 공지는 null 반환', async () => {
    mock.addResult({ data: null, error: null });
    const result = await getNotice('nope', mock.mockClient as never);
    expect(result).toBeNull();
  });
});

// ─── incrementNoticeViewCount ──────────────────────────────────────────────

describe('incrementNoticeViewCount', () => {
  it('RPC 호출', async () => {
    const mock = createMockSupabase();
    await incrementNoticeViewCount('n1', mock.mockClient as never);
    expect(mock.mockClient.rpc).toHaveBeenCalledWith(
      'increment_notice_view_count',
      { p_notice_id: 'n1' },
    );
  });
});

// ─── createNotice ──────────────────────────────────────────────────────────

describe('createNotice', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('성공 시 생성된 id 반환', async () => {
    mock.addResult({ data: { id: 'new-notice-1' }, error: null });
    const result = await createNotice(
      { title: '공지', body: '본문', is_pinned: false },
      'user-1',
      mock.mockClient as never,
    );
    expect(result).toEqual({ id: 'new-notice-1' });
    expect(mock.chainable.insert).toHaveBeenCalled();
  });

  it('insert 실패 시 null 반환', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'fail' } });
    const result = await createNotice(
      { title: '공지', body: '본문', is_pinned: false },
      'user-1',
      mock.mockClient as never,
    );
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

// ─── updateNotice ──────────────────────────────────────────────────────────

describe('updateNotice', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('성공 시 true 반환', async () => {
    mock.addResult({ data: null, error: null });
    const ok = await updateNotice(
      'n1',
      { title: '수정' },
      mock.mockClient as never,
    );
    expect(ok).toBe(true);
    expect(mock.chainable.update).toHaveBeenCalled();
  });

  it('실패 시 false 반환', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'fail' } });
    const ok = await updateNotice(
      'n1',
      { title: '수정' },
      mock.mockClient as never,
    );
    expect(ok).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ─── deleteNotice ──────────────────────────────────────────────────────────

describe('deleteNotice', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('첨부 storage 파일도 함께 삭제', async () => {
    mock.addResult({
      data: [{ storage_path: 'n1/uuid-a.pdf' }],
      error: null,
    }); // attachments select
    mock.addResult({ data: null, error: null }); // notices delete
    const ok = await deleteNotice('n1', mock.mockClient as never);
    expect(ok).toBe(true);
    expect(mock.storageMethods.remove).toHaveBeenCalledWith(['n1/uuid-a.pdf']);
  });

  it('DB 삭제 실패 시 false', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: [], error: null });
    mock.addResult({ data: null, error: { message: 'fk fail' } });
    const ok = await deleteNotice('n1', mock.mockClient as never);
    expect(ok).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ─── uploadAttachment ──────────────────────────────────────────────────────

/** Vitest 환경의 File에 arrayBuffer 메서드가 없어 보조 File 생성 */
function makeFile(content: string, name: string, mime: string): File {
  const buf = new TextEncoder().encode(content);
  return {
    name,
    type: mime,
    size: buf.length,
    arrayBuffer: () => Promise.resolve(buf.buffer as ArrayBuffer),
  } as unknown as File;
}

describe('uploadAttachment', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('Storage upload → DB insert 순서로 성공', async () => {
    mock.addResult({
      data: {
        id: 'att-1',
        notice_id: 'n1',
        file_name: 'a.pdf',
        storage_path: 'n1/uuid-a.pdf',
        mime_type: 'application/pdf',
        file_size: 10,
        uploaded_at: '2026-01-01',
      },
      error: null,
    });

    const file = makeFile('x', 'a.pdf', 'application/pdf');
    const result = await uploadAttachment(
      file,
      'n1',
      mock.mockClient as never,
    );

    expect('attachment' in result).toBe(true);
    expect(mock.storageMethods.upload).toHaveBeenCalled();
  });

  it('Storage 실패 시 error 반환', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.storageMethods.upload.mockResolvedValueOnce({
      data: null as never,
      error: { message: 'storage full' } as never,
    });
    const file = makeFile('x', 'a.pdf', 'application/pdf');
    const result = await uploadAttachment(
      file,
      'n1',
      mock.mockClient as never,
    );
    expect('error' in result).toBe(true);
    consoleSpy.mockRestore();
  });

  it('DB insert 실패 시 Storage 롤백', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'db fail' } });
    const file = makeFile('x', 'a.pdf', 'application/pdf');
    const result = await uploadAttachment(
      file,
      'n1',
      mock.mockClient as never,
    );
    expect('error' in result).toBe(true);
    expect(mock.storageMethods.remove).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── deleteAttachment ──────────────────────────────────────────────────────

describe('deleteAttachment', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('storage_path 조회 → row 삭제 → Storage 파일 제거', async () => {
    mock.addResult({
      data: { storage_path: 'n1/uuid-a.pdf' },
      error: null,
    });
    mock.addResult({ data: null, error: null });

    const ok = await deleteAttachment('att-1', mock.mockClient as never);
    expect(ok).toBe(true);
    expect(mock.storageMethods.remove).toHaveBeenCalledWith(['n1/uuid-a.pdf']);
  });

  it('없는 첨부는 false', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'not found' } });
    const ok = await deleteAttachment('nope', mock.mockClient as never);
    expect(ok).toBe(false);
    consoleSpy.mockRestore();
  });
});
