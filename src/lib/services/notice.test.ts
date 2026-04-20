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
    upload: vi.fn<() => Promise<{ data: { path: string } | null; error: { message: string } | null }>>(() => Promise.resolve({ data: { path: 'ok' }, error: null })),
    remove: vi.fn<() => Promise<{ data: unknown[] | null; error: { message: string } | null }>>(() => Promise.resolve({ data: [], error: null })),
    createSignedUrl: vi.fn<() => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>>(() =>
      Promise.resolve({
        data: { signedUrl: 'https://signed.example/path' },
        error: null,
      }),
    ),
  };
  const storage = { from: vi.fn(() => storageMethods) };

  const mockClient = {
    from: vi.fn(() => chainable),
    rpc: vi.fn<() => Promise<{ data: unknown; error: { message: string } | null }>>(() => Promise.resolve({ data: null, error: null })),
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

import {
  resolveAuthorNames,
} from './notice';

// ─── resolveAuthorNames ─────────────────────────────────────────────────────

describe('resolveAuthorNames', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('authorIds 비어 있으면 쿼리 없이 빈 맵 반환', async () => {
    const result = await resolveAuthorNames([], mock.mockClient as never);
    expect(result).toEqual({});
    expect(mock.mockClient.from).not.toHaveBeenCalled();
  });

  it('중복 id 제거 후 in 쿼리', async () => {
    mock.addResult({
      data: [
        { id: 'u1', name: '관리자1' },
        { id: 'u2', name: '관리자2' },
      ],
      error: null,
    });

    const result = await resolveAuthorNames(['u1', 'u2', 'u1'], mock.mockClient as never);

    expect(result).toEqual({ u1: '관리자1', u2: '관리자2' });
  });

  it('DB 에러 시 빈 맵 반환', async () => {
    mock.addResult({ data: null, error: { message: 'db error' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await resolveAuthorNames(['u1'], mock.mockClient as never);

    expect(result).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('name이 null인 row는 맵에 추가하지 않음', async () => {
    mock.addResult({
      data: [
        { id: 'u1', name: null },
        { id: 'u2', name: '관리자' },
      ],
      error: null,
    });

    const result = await resolveAuthorNames(['u1', 'u2'], mock.mockClient as never);

    expect(result).not.toHaveProperty('u1');
    expect(result).toHaveProperty('u2', '관리자');
  });
});

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

  it('filter_by=author + adminClient → users ILIKE 후 author_id IN 필터', async () => {
    const adminMock = createMockSupabase();
    // 1. adminClient: users ILIKE 조회 → id 목록
    adminMock.addResult({ data: [{ id: 'u1' }], error: null });
    // 2. 메인 notices 쿼리
    mock.addResult({ data: [], error: null, count: 0 });

    const result = await listNotices(
      { filter_by: 'author', q: '관리자', page: 1, per_page: 10 },
      mock.mockClient as never,
      adminMock.mockClient as never,
    );

    expect(result.total).toBe(0);
    // adminClient로 users 이름 조회
    expect(adminMock.mockClient.from).toHaveBeenCalledWith('users');
    // notices에 in 필터
    expect(mock.chainable.in).toHaveBeenCalledWith('author_id', ['u1']);
  });

  it('filter_by=author + adminClient + 매칭 users 없음 → 빈 결과 즉시 반환', async () => {
    const adminMock = createMockSupabase();
    // adminClient: users 조회 → 빈 배열
    adminMock.addResult({ data: [], error: null });

    const result = await listNotices(
      { filter_by: 'author', q: '없는작성자', page: 1, per_page: 10 },
      mock.mockClient as never,
      adminMock.mockClient as never,
    );

    // ids가 없으므로 즉시 빈 결과 반환
    expect(result).toEqual({ items: [], total: 0, page: 1, perPage: 10, totalPages: 0 });
    // adminClient에서 users 조회
    expect(adminMock.mockClient.from).toHaveBeenCalledWith('users');
    // 메인 notices 쿼리가 실행(.order, .range)되지 않아야 함
    expect(mock.chainable.order).not.toHaveBeenCalled();
  });

  it('filter_by=author + adminClient 없음 → FK inner join 폴백', async () => {
    mock.addResult({ data: [], error: null, count: 0 });

    // adminClient 없이 호출
    const result = await listNotices(
      { filter_by: 'author', q: '관리자', page: 1, per_page: 10 },
      mock.mockClient as never,
      // adminClient 미전달
    );

    expect(result.total).toBe(0);
    // ilike가 author.name으로 호출되어야 함 (FK join 폴백)
    expect(mock.chainable.ilike).toHaveBeenCalledWith('author.name', '%관리자%');
  });

  it('adminClient 제공 시 author_name 주입', async () => {
    const adminMock = createMockSupabase();
    const row = {
      id: '1',
      title: '공지',
      body: '',
      author_id: 'u1',
      is_pinned: false,
      view_count: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      author: { name: '기존이름' },
      notice_attachments: [],
    };
    // 메인 쿼리
    mock.addResult({ data: [row], error: null, count: 1 });
    // resolveAuthorNames (adminClient.from('users').select().in())
    adminMock.addResult({ data: [{ id: 'u1', name: '실제이름' }], error: null });

    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
      adminMock.mockClient as never,
    );

    expect(result.items[0].author_name).toBe('실제이름');
  });

  it('author_id 없는 항목 → author_name null (adminClient 없음)', async () => {
    const row = {
      id: '1',
      title: '공지',
      body: '',
      author_id: null,
      is_pinned: false,
      view_count: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      author: null,
      notice_attachments: [],
    };
    mock.addResult({ data: [row], error: null, count: 1 });

    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
    );

    expect(result.items[0].author_name).toBeNull();
  });

  it('author 배열 형태 처리 (Supabase join 결과 배열인 경우)', async () => {
    const row = {
      id: '1',
      title: '공지',
      body: '',
      author_id: 'u1',
      is_pinned: false,
      view_count: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      author: [{ name: '배열이름' }], // 배열 형태
      notice_attachments: [{ count: 3 }],
    };
    mock.addResult({ data: [row], error: null, count: 1 });

    const result = await listNotices(
      { filter_by: 'title', page: 1, per_page: 10 },
      mock.mockClient as never,
    );

    // 배열일 때 첫 번째 요소를 author로 사용
    expect(result.items[0].attachment_count).toBe(3);
    expect(result.items[0].author_name).toBe('배열이름');
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

  it('DB 에러 시 null 반환', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.addResult({ data: null, error: { message: 'db error' } });
    const result = await getNotice('n1', mock.mockClient as never);
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('adminClient 제공 시 author_name RLS 우회 해결', async () => {
    const adminMock = createMockSupabase();
    mock.addResult({
      data: {
        id: 'n1',
        title: '공지',
        body: '본문',
        author_id: 'u1',
        is_pinned: false,
        view_count: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        author: { name: '기존이름' },
        notice_attachments: [],
      },
      error: null,
    });
    // resolveAuthorNames 호출 (adminClient.from('users').select().in())
    adminMock.addResult({ data: [{ id: 'u1', name: '실제이름' }], error: null });

    const result = await getNotice('n1', mock.mockClient as never, adminMock.mockClient as never);

    expect(result).not.toBeNull();
    expect(result?.author_name).toBe('실제이름');
  });

  it('adminClient 없을 때 author.name 직접 사용', async () => {
    mock.addResult({
      data: {
        id: 'n1',
        title: '공지',
        body: '',
        author_id: 'u1',
        is_pinned: false,
        view_count: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        author: { name: '작성자' },
        notice_attachments: [],
      },
      error: null,
    });

    const result = await getNotice('n1', mock.mockClient as never);

    expect(result?.author_name).toBe('작성자');
  });

  it('author_id 없으면 adminClient 있어도 author.name 폴백', async () => {
    const adminMock = createMockSupabase();
    mock.addResult({
      data: {
        id: 'n1',
        title: '공지',
        body: '',
        author_id: null, // author_id 없음
        is_pinned: false,
        view_count: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        author: { name: '이름폴백' },
        notice_attachments: [],
      },
      error: null,
    });

    const result = await getNotice('n1', mock.mockClient as never, adminMock.mockClient as never);

    expect(result?.author_name).toBe('이름폴백');
    // resolveAuthorNames 미호출 (author_id 없으므로)
    expect(adminMock.mockClient.from).not.toHaveBeenCalled();
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

  it('RPC 에러 시 콘솔 에러 출력 (예외 미발생)', async () => {
    const mock = createMockSupabase();
    mock.mockClient.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc error' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // 에러가 있어도 throw하지 않아야 함
    await expect(incrementNoticeViewCount('n1', mock.mockClient as never)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
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

  it('row 삭제 실패 시 false 반환 (Storage 제거 미수행)', async () => {
    // storage_path 조회 성공
    mock.addResult({
      data: { storage_path: 'n1/uuid-a.pdf' },
      error: null,
    });
    // row 삭제 실패
    mock.addResult({ data: null, error: { message: 'delete failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = await deleteAttachment('att-1', mock.mockClient as never);

    expect(ok).toBe(false);
    // row 삭제 실패이므로 Storage 제거 미수행
    expect(mock.storageMethods.remove).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('Storage 제거 실패 시에도 true 반환 (best-effort)', async () => {
    // storage_path 조회 성공
    mock.addResult({
      data: { storage_path: 'n1/uuid-a.pdf' },
      error: null,
    });
    // row 삭제 성공
    mock.addResult({ data: null, error: null });
    // Storage 제거 실패
    mock.storageMethods.remove.mockResolvedValueOnce({
      data: null,
      error: { message: 'storage error' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = await deleteAttachment('att-1', mock.mockClient as never);

    // row는 이미 삭제됐으므로 true 반환 (best-effort)
    expect(ok).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── createAttachmentSignedUrl ──────────────────────────────────────────────

import { createAttachmentSignedUrl, getMimeTypeByExtension } from './notice';

describe('createAttachmentSignedUrl', () => {
  let mock: ReturnType<typeof createMockSupabase>;
  beforeEach(() => {
    mock = createMockSupabase();
  });
  afterEach(() => vi.restoreAllMocks());

  it('성공 시 서명 URL 반환', async () => {
    const signedUrl = 'https://signed.example.com/path?token=abc';
    mock.storageMethods.createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl },
      error: null,
    });

    const result = await createAttachmentSignedUrl(
      'notice-1/uuid-doc.pdf',
      mock.mockClient as never,
    );

    expect(result).toBe(signedUrl);
  });

  it('기본 만료 시간 60초 적용', async () => {
    const signedUrl = 'https://signed.example.com/path?token=abc';
    mock.storageMethods.createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl },
      error: null,
    });

    await createAttachmentSignedUrl('notice-1/uuid.pdf', mock.mockClient as never);

    // createSignedUrl 호출 시 기본 만료 60초 전달
    expect(mock.storageMethods.createSignedUrl).toHaveBeenCalledWith(
      'notice-1/uuid.pdf',
      60,
    );
  });

  it('사용자 지정 만료 시간 적용', async () => {
    mock.storageMethods.createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'https://signed.url/' },
      error: null,
    });

    await createAttachmentSignedUrl('path', mock.mockClient as never, 300);

    expect(mock.storageMethods.createSignedUrl).toHaveBeenCalledWith('path', 300);
  });

  it('Storage 에러 시 null 반환', async () => {
    mock.storageMethods.createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: { message: 'bucket not found' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await createAttachmentSignedUrl(
      'notice-1/uuid.pdf',
      mock.mockClient as never,
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('data가 null (에러 없음)이면 null 반환', async () => {
    mock.storageMethods.createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await createAttachmentSignedUrl(
      'notice-1/uuid.pdf',
      mock.mockClient as never,
    );

    expect(result).toBeNull();
  });
});

// ─── getMimeTypeByExtension ──────────────────────────────────────────────────

describe('getMimeTypeByExtension', () => {
  it('.pdf → application/pdf', () => {
    expect(getMimeTypeByExtension('document.pdf')).toBe('application/pdf');
  });

  it('.hwpx → application/vnd.hancom.hwpx', () => {
    expect(getMimeTypeByExtension('file.hwpx')).toBe('application/vnd.hancom.hwpx');
  });

  it('.hwp → application/x-hwp', () => {
    expect(getMimeTypeByExtension('file.hwp')).toBe('application/x-hwp');
  });

  it('.xlsx → openxmlformats MIME', () => {
    expect(getMimeTypeByExtension('file.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('.png → image/png', () => {
    expect(getMimeTypeByExtension('image.PNG')).toBe('image/png');
  });

  it('확장자 없는 파일명 → null', () => {
    expect(getMimeTypeByExtension('noextension')).toBeNull();
  });

  it('알 수 없는 확장자 → null', () => {
    expect(getMimeTypeByExtension('file.xyz')).toBeNull();
  });

  it('대소문자 무관 처리 — .JPEG → image/jpeg', () => {
    expect(getMimeTypeByExtension('photo.JPEG')).toBe('image/jpeg');
  });
});
