/**
 * messages/actions.ts 테스트
 *
 * 조회 함수:
 * - fetchConversations: 인증 실패, 참여 없음, DB 에러, 정상 조회 (안읽음/읽음 판별)
 * - fetchMessages: 인증 실패, cursor 없이 조회, cursor 페이지네이션 + hasMore, DB 에러
 * - fetchAvailableRecipients: 인증 실패, 역할 없음, 허용 역할 없음, DB 에러, 정상 그룹화
 * - fetchUnreadConversationCount: 인증 실패 → 0, 참여 없음 → 0, 안읽음 카운트
 *
 * 변경 함수:
 * - createConversation: 인증 실패, Zod 실패, 본인에게 보내기, 수신자 미존재/비활성/불가역할,
 *                       역할 권한, 기존 대화 재사용, 대화/참여자 INSERT 실패, 새 대화 생성
 * - sendMessage: 인증 실패, Zod 실패, INSERT 실패,
 *               성공 (갱신 + revalidatePath + 이메일 알림)
 * - markConversationRead: 인증 실패, DB 에러, 성공
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchConversations,
  fetchMessages,
  fetchAvailableRecipients,
  fetchUnreadConversationCount,
  createConversation,
  sendMessage,
  markConversationRead,
} from './actions';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/services/email', () => ({
  notifyRecipientByEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const CONV_ID = '550e8400-e29b-41d4-a716-446655440010';

// ─── 큐 기반 Supabase 모킹 ────────────────────────────────────────────────

function createMockSupabase() {
  const results: Array<{ data: unknown; error: unknown; count?: number | null }> = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      const r = results[resultIndex++];
      return { data: r.data, error: r.error, count: r.count ?? null };
    }
    return { data: null, error: null, count: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  for (const method of [
    'select', 'eq', 'neq', 'in', 'order', 'limit', 'lt', 'gt',
    'insert', 'update', 'delete',
  ]) {
    chainable[method] = vi.fn(() => chainable);
  }

  chainable.single = vi.fn(() => nextResult());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve(nextResult()).then(resolve, reject);
  };

  const rpcResults: Array<{ data: unknown; error: unknown }> = [];
  let rpcIndex = 0;

  const client = {
    from: vi.fn(() => chainable),
    rpc: vi.fn(() => {
      if (rpcIndex < rpcResults.length) {
        return Promise.resolve(rpcResults[rpcIndex++]);
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };

  return {
    client,
    chainable,
    addResult: (result: { data: unknown; error: unknown; count?: number | null }) => {
      results.push(result);
    },
    addRpcResult: (result: { data: unknown; error: unknown }) => {
      rpcResults.push(result);
    },
  };
}

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;
let adminMock: ReturnType<typeof createMockSupabase>;

function setupAuth(overrides?: { role?: string; userId?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role ?? 'OPS_ADMIN',
    status: 'ACTIVE',
  });
}

function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });
}

beforeEach(async () => {
  serverMock = createMockSupabase();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// fetchConversations
// =============================================================================

describe('fetchConversations', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchConversations();

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('참여 대화 없음 → 빈 배열', async () => {
    setupAuth();
    // 1) conversation_participants → 빈 배열
    serverMock.addResult({ data: [], error: null });

    const result = await fetchConversations();

    expect(result).toEqual({ success: true, data: [] });
  });

  it('참여 조회 DB 에러 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchConversations();

    expect(result).toEqual({ success: false, error: '메시지 목록을 불러올 수 없습니다.' });
    spy.mockRestore();
  });

  it('정상 조회 → 대화 목록 + 안읽음 상태 포함', async () => {
    setupAuth();
    const now = '2026-02-17T10:00:00Z';
    const earlier = '2026-02-17T09:00:00Z';

    // 1) 내 참여 (last_read_at < last_message_at → 안읽음)
    serverMock.addResult({
      data: [{ conversation_id: CONV_ID, last_read_at: earlier }],
      error: null,
    });
    // 2) 대화 정보
    serverMock.addResult({
      data: [{ id: CONV_ID, last_message_at: now }],
      error: null,
    });
    // 3) 상대방 참여자
    serverMock.addResult({
      data: [{ conversation_id: CONV_ID, user_id: OTHER_USER_ID }],
      error: null,
    });
    // 4) 상대방 사용자 정보 (admin)
    adminMock.addResult({
      data: [{ id: OTHER_USER_ID, name: '홍길동', role: 'CONSULTANT_APPROVED' }],
      error: null,
    });
    // 5) 마지막 메시지 (single)
    serverMock.addResult({
      data: {
        conversation_id: CONV_ID,
        content: '안녕하세요',
        sender_id: OTHER_USER_ID,
        created_at: now,
      },
      error: null,
    });

    const result = await fetchConversations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: CONV_ID,
        other_user: { id: OTHER_USER_ID, name: '홍길동' },
        last_message: { content: '안녕하세요' },
        has_unread: true,
      });
    }
  });

  it('last_read_at >= last_message_at → has_unread=false', async () => {
    setupAuth();
    const messageTime = '2026-02-17T09:00:00Z';
    const readTime = '2026-02-17T10:00:00Z'; // 읽은 시간이 더 나중

    serverMock.addResult({
      data: [{ conversation_id: CONV_ID, last_read_at: readTime }],
      error: null,
    });
    serverMock.addResult({
      data: [{ id: CONV_ID, last_message_at: messageTime }],
      error: null,
    });
    serverMock.addResult({
      data: [{ conversation_id: CONV_ID, user_id: OTHER_USER_ID }],
      error: null,
    });
    adminMock.addResult({
      data: [{ id: OTHER_USER_ID, name: '홍길동', role: 'CONSULTANT_APPROVED' }],
      error: null,
    });
    serverMock.addResult({
      data: { conversation_id: CONV_ID, content: '이전 메시지', sender_id: OTHER_USER_ID, created_at: messageTime },
      error: null,
    });

    const result = await fetchConversations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].has_unread).toBe(false);
    }
  });
});

// =============================================================================
// fetchMessages
// =============================================================================

describe('fetchMessages', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchMessages(CONV_ID);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('cursor 없이 조회 → 메시지 반환 + hasMore=false', async () => {
    setupAuth();
    const messages = [
      { id: '1', conversation_id: CONV_ID, sender_id: TEST_USER_ID, content: 'hello', created_at: '2026-02-17T10:00:00Z' },
    ];
    // messages 조회 (thenable)
    serverMock.addResult({ data: messages, error: null });

    const result = await fetchMessages(CONV_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('PAGE_SIZE+1개 반환 시 hasMore=true', async () => {
    setupAuth();
    // MESSAGE_PAGE_SIZE=30 이므로 31개 반환하면 hasMore=true
    const messages = Array.from({ length: 31 }, (_, i) => ({
      id: String(i),
      conversation_id: CONV_ID,
      sender_id: TEST_USER_ID,
      content: `msg ${i}`,
      created_at: `2026-02-17T10:${String(i).padStart(2, '0')}:00Z`,
    }));
    serverMock.addResult({ data: messages, error: null });

    const result = await fetchMessages(CONV_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(30);
      expect(result.data.hasMore).toBe(true);
    }
  });

  it('cursor 전달 시 lt 필터 적용', async () => {
    setupAuth();
    serverMock.addResult({ data: [], error: null });

    const cursor = '2026-02-17T09:00:00Z';
    await fetchMessages(CONV_ID, cursor);

    expect(serverMock.chainable.lt).toHaveBeenCalledWith('created_at', cursor);
  });

  it('DB 에러 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchMessages(CONV_ID);

    expect(result).toEqual({ success: false, error: '메시지를 불러올 수 없습니다.' });
    spy.mockRestore();
  });
});

// =============================================================================
// fetchAvailableRecipients
// =============================================================================

describe('fetchAvailableRecipients', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchAvailableRecipients();

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('역할 없음 → error 반환', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'test@test.com' },
      supabase: serverMock.client,
      role: null,
      status: 'ACTIVE',
    });

    const result = await fetchAvailableRecipients();

    expect(result).toEqual({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
  });

  it('허용 역할 없는 역할 → 빈 배열', async () => {
    setupAuth({ role: 'USER_PENDING' });

    const result = await fetchAvailableRecipients();

    expect(result).toEqual({ success: true, data: [] });
  });

  it('사용자 조회 DB 에러 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchAvailableRecipients();

    expect(result).toEqual({ success: false, error: '사용자 목록을 불러올 수 없습니다.' });
    spy.mockRestore();
  });

  it('OPS_ADMIN → 역할별 그룹화된 목록 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    // admin에서 사용자 조회
    adminMock.addResult({
      data: [
        { id: 'u1', name: '김컨설턴트', role: 'CONSULTANT_APPROVED' },
        { id: 'u2', name: '이관리자', role: 'SYSTEM_ADMIN' },
      ],
      error: null,
    });

    const result = await fetchAvailableRecipients();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      const consultantGroup = result.data.find((g) => g.role === 'CONSULTANT_APPROVED');
      expect(consultantGroup?.users).toHaveLength(1);
      expect(consultantGroup?.users[0].name).toBe('김컨설턴트');
    }
  });
});

// =============================================================================
// fetchUnreadConversationCount
// =============================================================================

describe('fetchUnreadConversationCount', () => {
  it('인증 실패 → 0 반환', async () => {
    setupAuthFailure();

    const result = await fetchUnreadConversationCount();

    expect(result).toBe(0);
  });

  it('RPC 에러 → 0', async () => {
    setupAuth();
    serverMock.addRpcResult({ data: null, error: { message: 'rpc error' } });

    const result = await fetchUnreadConversationCount();

    expect(result).toBe(0);
  });

  it('안읽음 대화 존재 → RPC 결과 반환', async () => {
    setupAuth();
    serverMock.addRpcResult({ data: 3, error: null });

    const result = await fetchUnreadConversationCount();

    expect(result).toBe(3);
  });

  it('안읽음 대화 없음 → 0', async () => {
    setupAuth();
    serverMock.addRpcResult({ data: 0, error: null });

    const result = await fetchUnreadConversationCount();

    expect(result).toBe(0);
  });
});

// =============================================================================
// createConversation
// =============================================================================

describe('createConversation', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('잘못된 UUID → Zod 검증 실패', async () => {
    setupAuth();

    const result = await createConversation('not-a-uuid');

    expect(result).toEqual({ success: false, error: '유효하지 않은 사용자입니다.' });
  });

  it('본인에게 보내기 → error', async () => {
    setupAuth();

    const result = await createConversation(TEST_USER_ID);

    expect(result).toEqual({ success: false, error: '본인에게는 메시지를 보낼 수 없습니다.' });
  });

  it('존재하지 않는 수신자 → error', async () => {
    setupAuth();
    // admin: users 조회 → 없음
    adminMock.addResult({ data: null, error: null });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '존재하지 않는 사용자입니다.' });
  });

  it('비활성 수신자 → error', async () => {
    setupAuth();
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'OPS_ADMIN', status: 'INACTIVE' },
      error: null,
    });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '존재하지 않는 사용자입니다.' });
  });

  it('메시징 불가 역할 수신자 → error', async () => {
    setupAuth();
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'USER_PENDING', status: 'ACTIVE' },
      error: null,
    });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '메시지를 보낼 수 없는 사용자입니다.' });
  });

  it('역할 수신 권한 없음 → error', async () => {
    // CONSULTANT_APPROVED는 다른 컨설턴트에게 보낼 수 없음
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
      error: null,
    });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '해당 사용자에게 메시지를 보낼 권한이 없습니다.' });
  });

  it('기존 대화 있음 → 기존 대화 ID 반환', async () => {
    setupAuth();
    // admin: 수신자 존재 확인
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'OPS_ADMIN', status: 'ACTIVE' },
      error: null,
    });
    // server: 내 대화 목록
    serverMock.addResult({
      data: [{ conversation_id: CONV_ID }],
      error: null,
    });
    // admin: 공유 대화 검색 → 있음
    adminMock.addResult({
      data: [{ conversation_id: CONV_ID }],
      error: null,
    });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: true, data: { conversationId: CONV_ID } });
  });

  it('대화 INSERT 실패 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    // admin: 수신자 존재 확인
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'OPS_ADMIN', status: 'ACTIVE' },
      error: null,
    });
    // server: 내 대화 목록 (비어있음)
    serverMock.addResult({ data: [], error: null });
    // admin: conversations INSERT 실패 (single)
    adminMock.addResult({ data: null, error: { message: 'insert_failed' } });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '메시지를 시작할 수 없습니다.' });
    spy.mockRestore();
  });

  it('참여자 INSERT 실패 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'OPS_ADMIN', status: 'ACTIVE' },
      error: null,
    });
    serverMock.addResult({ data: [], error: null });
    // admin: 대화 INSERT 성공 (single)
    adminMock.addResult({ data: { id: 'new-conv-id' }, error: null });
    // admin: 참여자 INSERT 실패 (thenable)
    adminMock.addResult({ data: null, error: { message: 'fk_violation' } });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: '메시지를 시작할 수 없습니다.' });
    spy.mockRestore();
  });

  it('새 대화 생성 → conversationId 반환 + revalidatePath', async () => {
    const { revalidatePath } = await import('next/cache');
    setupAuth();
    const newConvId = '550e8400-e29b-41d4-a716-446655440020';

    // admin: 수신자 존재 확인
    adminMock.addResult({
      data: { id: OTHER_USER_ID, role: 'OPS_ADMIN', status: 'ACTIVE' },
      error: null,
    });
    // server: 내 대화 목록 (비어있음)
    serverMock.addResult({ data: [], error: null });
    // admin: 새 대화 INSERT (single)
    adminMock.addResult({ data: { id: newConvId }, error: null });
    // admin: 참여자 INSERT (thenable)
    adminMock.addResult({ data: null, error: null });

    const result = await createConversation(OTHER_USER_ID);

    expect(result).toEqual({ success: true, data: { conversationId: newConvId } });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/messages');
  });
});

// =============================================================================
// sendMessage
// =============================================================================

describe('sendMessage', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await sendMessage(CONV_ID, '안녕하세요');

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('빈 내용 → Zod 검증 실패', async () => {
    setupAuth();

    const result = await sendMessage(CONV_ID, '');

    expect(result.success).toBe(false);
  });

  it('잘못된 conversation_id → Zod 검증 실패', async () => {
    setupAuth();

    const result = await sendMessage('not-a-uuid', '안녕하세요');

    expect(result.success).toBe(false);
  });

  it('2000자 초과 → Zod 검증 실패', async () => {
    setupAuth();

    const result = await sendMessage(CONV_ID, 'a'.repeat(2001));

    expect(result.success).toBe(false);
  });

  it('메시지 INSERT 실패 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    // server: messages INSERT → 에러
    serverMock.addResult({ data: null, error: { message: 'RLS violation' } });

    const result = await sendMessage(CONV_ID, '안녕하세요');

    expect(result).toEqual({ success: false, error: '메시지를 전송할 수 없습니다.' });
    spy.mockRestore();
  });

  it('성공 → 메시지 반환 + last_message_at/last_read_at 갱신 + revalidatePath + 이메일 알림', async () => {
    const { revalidatePath } = await import('next/cache');
    const { notifyRecipientByEmail } = await import('@/lib/services/email');
    setupAuth();
    const createdAt = '2026-02-17T10:00:00Z';
    const messageData = {
      id: 'msg-1',
      conversation_id: CONV_ID,
      sender_id: TEST_USER_ID,
      content: '안녕하세요',
      created_at: createdAt,
    };

    // server: messages INSERT (single)
    serverMock.addResult({ data: messageData, error: null });
    // admin: conversations UPDATE (thenable)
    adminMock.addResult({ data: null, error: null });
    // server: conversation_participants UPDATE (thenable)
    serverMock.addResult({ data: null, error: null });

    const result = await sendMessage(CONV_ID, '안녕하세요');

    expect(result).toEqual({ success: true, data: messageData });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/messages');

    // admin에서 last_message_at 갱신 확인
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ last_message_at: createdAt });

    // server에서 last_read_at 갱신 확인
    expect(serverMock.chainable.update).toHaveBeenCalledWith({ last_read_at: createdAt });

    // 이메일 알림 호출 확인
    expect(notifyRecipientByEmail).toHaveBeenCalledWith(CONV_ID, TEST_USER_ID, '안녕하세요');
  });
});

// =============================================================================
// markConversationRead
// =============================================================================

describe('markConversationRead', () => {
  it('인증 실패 → error 반환', async () => {
    setupAuthFailure();

    const result = await markConversationRead(CONV_ID);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('DB 에러 → error 반환', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupAuth();
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await markConversationRead(CONV_ID);

    expect(result).toEqual({ success: false, error: '읽음 처리에 실패했습니다.' });
    spy.mockRestore();
  });

  it('성공 → { success: true }', async () => {
    setupAuth();
    serverMock.addResult({ data: null, error: null });

    const result = await markConversationRead(CONV_ID);

    expect(result).toEqual({ success: true });
  });
});
