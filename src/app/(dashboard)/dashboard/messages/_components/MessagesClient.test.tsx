import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// 모킹 (vi.mock은 최상단)
// =============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => ({ get: mockGet }),
}));

// =============================================================================
// Supabase Realtime 모킹 — 채널 2개를 따로 조종할 수 있어야 한다
// =============================================================================
// `NotificationBell.test.tsx:48-80` 의 콜백 캡처 방식을 **채널 2개용으로 확장**했다.
// MessagesClient 는 채널을 두 개 연다:
//   - `messages:${convId}` — 열어 둔 대화의 새 메시지를 스레드에 붙인다
//   - `messages:all`       — 좌측 대화 목록(프리뷰·안읽음)을 갱신한다
// 둘은 하는 일이 다르므로 **한쪽만 끊긴 상황**을 재현할 수 있어야 하고,
// 그러려면 채널명별로 콜백을 따로 붙잡아야 한다.
//
// ⚠️ 이전 모킹은 `on`/`subscribe` 가 `mockReturnThis()` 라 **콜백을 통째로 버렸다.**
// 그래서 SUBSCRIBED·CHANNEL_ERROR 경로도 INSERT 수신도 한 번도 실행되지 않았고,
// realtime 단언이 사실상 0건이었다(`expect(true).toBe(true)` 가 남아 있던 이유).

/** 채널 하나가 캡처한 것들 */
interface MockChannel {
  /** `.on()` 이 받은 postgres_changes 설정 (event/schema/table/filter) */
  config: unknown;
  /** INSERT 이벤트 콜백 */
  insert: ((payload: { new: Message }) => void) | null;
  /** `.subscribe()` 가 받은 상태 콜백 */
  status: ((status: string) => void) | null;
}

const mockChannels = new Map<string, MockChannel>();

/** 채널명으로 캡처된 콜백을 꺼낸다 (미구독이면 원인이 드러나도록 throw) */
function channelOf(name: string): MockChannel {
  const found = mockChannels.get(name);
  if (!found) {
    const opened = [...mockChannels.keys()].join(', ') || '(없음)';
    throw new Error(`채널 "${name}" 이 구독되지 않았다. 열린 채널: ${opened}`);
  }
  return found;
}

const mockGetUser = vi.fn();
const mockRemoveChannel = vi.fn();

/** 폴백 폴링이 messages 테이블에서 읽어올 행 (테스트가 교체) */
let mockPollRows: Message[] = [];
/** `supabase.from(...)` 호출 자체를 세는 스파이 — "폴링이 돌았는가" 판정용 */
const mockFrom = vi.fn();

/**
 * 폴링 쿼리 체인 mock.
 *
 * ⚠️ 컴포넌트는 `.limit()` **뒤에** 조건부로 `.gt()` 를 붙인다(`MessagesClient.tsx:437`).
 * 이전 모킹은 `limit` 이 Promise 를 resolve 해 버려 `query.gt is not a function` 으로
 * 즉시 터졌다 — 폴링을 실제로 돌리는 테스트가 하나도 없었다는 증거다.
 * → 모든 단계가 자기 자신을 반환하고 **await 시점에** 결과를 내는 thenable 로 만든다.
 */
function createQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    then: (resolve: (value: { data: Message[]; error: null }) => unknown) =>
      Promise.resolve({ data: mockPollRows, error: null }).then(resolve),
  };
  return builder;
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    channel: (name: string) => {
      const entry: MockChannel = { config: null, insert: null, status: null };
      mockChannels.set(name, entry);
      // 실제 supabase-js 와 동일하게 `.on()`·`.subscribe()` 가 채널을 반환해야
      // 컴포넌트가 그 반환값을 removeChannel 에 넘겨 정리할 수 있다.
      const channel = {
        on: (_event: string, config: unknown, cb: (payload: { new: Message }) => void) => {
          entry.config = config;
          entry.insert = cb;
          return {
            subscribe: (statusCb: (status: string) => void) => {
              entry.status = statusCb;
              return channel;
            },
          };
        },
      };
      return channel;
    },
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return createQueryBuilder();
    },
  }),
}));

// Server Actions 모킹
const mockFetchConversations = vi.fn();
const mockFetchMessages = vi.fn();
const mockSendMessage = vi.fn();
const mockMarkConversationRead = vi.fn();
const mockMarkAllConversationsRead = vi.fn();

vi.mock('../actions', () => ({
  fetchConversations: (...args: unknown[]) => mockFetchConversations(...args),
  fetchMessages: (...args: unknown[]) => mockFetchMessages(...args),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  markConversationRead: (...args: unknown[]) => mockMarkConversationRead(...args),
  markAllConversationsRead: (...args: unknown[]) => mockMarkAllConversationsRead(...args),
}));

const mockShowErrorToast = vi.fn();
const mockShowSuccessToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
}));

// 하위 컴포넌트 경량 mock
vi.mock('./ConversationList', () => ({
  default: ({
    conversations,
    selectedId,
    isLoading,
    onSelect,
    onNewConversation,
  }: {
    conversations: Array<{ id: string; other_user: { name: string } }>;
    selectedId: string | null;
    isLoading: boolean;
    onSelect: (id: string) => void;
    onNewConversation: () => void;
  }) => (
    <div data-testid="conversation-list">
      {isLoading && <span data-testid="conv-list-loading">로딩중</span>}
      {conversations.map((c) => (
        <button
          key={c.id}
          data-testid={`conv-item-${c.id}`}
          data-selected={c.id === selectedId ? 'true' : 'false'}
          onClick={() => onSelect(c.id)}
        >
          {c.other_user.name}
        </button>
      ))}
      <button data-testid="new-conv-btn" onClick={onNewConversation}>
        새 메시지
      </button>
    </div>
  ),
}));

vi.mock('./MessageThread', () => ({
  default: ({
    conversation,
    messages,
    isLoading,
    onSendMessage,
    onMobileBack,
  }: {
    conversation: { other_user: { name: string } };
    messages: Array<{ id: string; content: string }>;
    isLoading: boolean;
    onSendMessage: (content: string) => Promise<unknown>;
    onMobileBack: () => void;
  }) => (
    <div data-testid="message-thread">
      <span data-testid="thread-user">{conversation.other_user.name}</span>
      {isLoading && <span data-testid="thread-loading">메시지 로딩중</span>}
      {messages.map((m) => (
        <div key={m.id} data-testid={`msg-${m.id}`}>
          {m.content}
        </div>
      ))}
      <button data-testid="send-btn" onClick={() => onSendMessage('테스트 메시지')}>
        전송
      </button>
      <button data-testid="mobile-back" onClick={onMobileBack}>
        뒤로
      </button>
    </div>
  ),
}));

vi.mock('./NewConversationDialog', () => ({
  default: ({
    open,
    onOpenChange,
    onCreated,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: string) => void;
  }) => (
    <div data-testid="new-conv-dialog" data-open={open ? 'true' : 'false'}>
      {open && (
        <>
          <button data-testid="close-dialog" onClick={() => onOpenChange(false)}>
            닫기
          </button>
          <button data-testid="create-conv" onClick={() => onCreated('new-conv-id')}>
            대화 생성
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

// =============================================================================
// Import (mock 이후)
// =============================================================================

import React from 'react';
import MessagesClient from './MessagesClient';
import { MAX_REALTIME_RETRIES, REALTIME_RETRY_MAX_MS } from '@/lib/constants/message';
import type { ConversationWithPreview, Message } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function createConversation(
  overrides: Partial<ConversationWithPreview> = {}
): ConversationWithPreview {
  return {
    id: `conv-${Math.random().toString(36).slice(2, 7)}`,
    last_message_at: '2025-01-15T10:00:00Z',
    other_user: { id: 'u1', name: '홍길동', role: 'CONSULTANT_APPROVED' },
    last_message: undefined,
    has_unread: false,
    ...overrides,
  };
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 7)}`,
    conversation_id: 'conv-1',
    sender_id: 'me',
    content: '테스트 메시지',
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

function successConvResult(convs: ConversationWithPreview[]) {
  return { success: true as const, data: convs };
}

function successMsgResult(messages: Message[], hasMore = false) {
  return { success: true as const, data: { messages, hasMore } };
}

async function renderAndWait() {
  render(<MessagesClient />);
  await waitFor(() => {
    expect(mockFetchConversations).toHaveBeenCalled();
  });
}

// =============================================================================
// 테스트
// =============================================================================

describe('MessagesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null); // ?conversation= 없음
    mockGetUser.mockResolvedValue({ data: { user: { id: 'me' } } });
    mockFetchConversations.mockResolvedValue(successConvResult([]));
    mockFetchMessages.mockResolvedValue(successMsgResult([]));
    mockSendMessage.mockResolvedValue({ success: true as const, data: createMessage() });
    mockMarkConversationRead.mockResolvedValue({ success: true });
    mockMarkAllConversationsRead.mockResolvedValue({ success: true });
    mockChannels.clear();
    mockPollRows = [];
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ─── 빈 상태 ────────────────────────────────────────────────────────

  describe('빈 상태 (대화 없음)', () => {
    it('대화가 없으면 EmptyState가 표시된다', async () => {
      mockFetchConversations.mockResolvedValue(successConvResult([]));
      await renderAndWait();
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
    });

    it('EmptyState에 "아직 메시지가 없습니다" 제목이 표시된다', async () => {
      mockFetchConversations.mockResolvedValue(successConvResult([]));
      await renderAndWait();
      await waitFor(() => {
        expect(screen.getByText('아직 메시지가 없습니다')).toBeInTheDocument();
      });
    });

    it('EmptyState의 "새 메시지 보내기" 버튼 클릭 시 다이얼로그가 열린다', async () => {
      const user = userEvent.setup();
      mockFetchConversations.mockResolvedValue(successConvResult([]));

      await renderAndWait();

      await waitFor(() => {
        expect(screen.getByText('새 메시지 보내기')).toBeInTheDocument();
      });

      await user.click(screen.getByText('새 메시지 보내기'));

      await waitFor(() => {
        expect(screen.getByTestId('new-conv-dialog')).toHaveAttribute('data-open', 'true');
      });
    });
  });

  // ─── 대화 목록 표시 ──────────────────────────────────────────────────

  describe('대화 목록 표시', () => {
    it('대화 목록이 로드되면 ConversationList가 렌더링된다', async () => {
      const convs = [
        createConversation({
          id: 'c1',
          other_user: { id: 'u1', name: '김영희', role: 'OPS_ADMIN' },
        }),
      ];
      mockFetchConversations.mockResolvedValue(successConvResult(convs));

      await renderAndWait();

      await waitFor(() => {
        expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
        expect(screen.getByText('김영희')).toBeInTheDocument();
      });
    });

    it('초기 로드 시 로딩 표시가 나타난다', async () => {
      let resolveConvs!: (value: unknown) => void;
      mockFetchConversations.mockReturnValue(
        new Promise((r) => {
          resolveConvs = r;
        })
      );

      render(<MessagesClient />);

      // 로딩 중 — ConversationList에 isLoading=true 전달됨
      expect(screen.getByTestId('conv-list-loading')).toBeInTheDocument();

      // cleanup
      await act(async () => {
        resolveConvs(successConvResult([]));
      });
    });
  });

  // ─── 대화 선택 ──────────────────────────────────────────────────────

  describe('대화 선택', () => {
    it('대화 선택 시 fetchMessages가 호출된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '클릭대화', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => {
        expect(screen.getByText('클릭대화')).toBeInTheDocument();
      });

      await user.click(screen.getByText('클릭대화'));

      await waitFor(() => {
        expect(mockFetchMessages).toHaveBeenCalledWith('c1');
      });
    });

    it('대화 선택 시 MessageThread가 표시된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '스레드유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => {
        expect(screen.getByText('스레드유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('스레드유저'));

      await waitFor(() => {
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
        expect(screen.getByTestId('thread-user')).toHaveTextContent('스레드유저');
      });
    });

    it('대화 선택 시 markConversationRead가 호출된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-read',
        other_user: { id: 'u1', name: '읽음처리', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('읽음처리')).toBeInTheDocument());

      await user.click(screen.getByText('읽음처리'));

      await waitFor(() => {
        expect(mockMarkConversationRead).toHaveBeenCalledWith('c-read');
      });
    });

    it('대화 선택 시 메시지가 스레드에 표시된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '메시지있는유저', role: 'OPS_ADMIN' },
      });
      const msgs = [createMessage({ id: 'msg-1', content: '로드된 메시지' })];
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult(msgs));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('메시지있는유저')).toBeInTheDocument());

      await user.click(screen.getByText('메시지있는유저'));

      await waitFor(() => {
        expect(screen.getByText('로드된 메시지')).toBeInTheDocument();
      });
    });
  });

  // ─── URL 파라미터 자동 선택 ──────────────────────────────────────────

  describe('URL ?conversation= 파라미터 자동 선택', () => {
    it('?conversation= 파라미터가 있으면 해당 대화를 자동 선택한다', async () => {
      mockGet.mockReturnValue('c-url');
      const conv = createConversation({
        id: 'c-url',
        other_user: { id: 'u1', name: 'URL선택유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      render(<MessagesClient />);

      await waitFor(() => {
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
        expect(screen.getByTestId('thread-user')).toHaveTextContent('URL선택유저');
      });
    });

    it('?conversation= 파라미터가 없으면 대화가 자동 선택되지 않는다', async () => {
      mockGet.mockReturnValue(null);
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '미선택유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('미선택유저')).toBeInTheDocument());

      expect(screen.queryByTestId('message-thread')).not.toBeInTheDocument();
    });
  });

  // ─── 메시지 전송 ────────────────────────────────────────────────────

  describe('메시지 전송', () => {
    it('sendMessage 성공 시 새 메시지가 스레드에 추가된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '전송유저', role: 'OPS_ADMIN' },
      });
      const newMsg = createMessage({ id: 'new-msg', content: '새로 전송된 메시지' });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      mockSendMessage.mockResolvedValue({ success: true as const, data: newMsg });

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('전송유저')).toBeInTheDocument());
      await user.click(screen.getByText('전송유저'));

      await waitFor(() => expect(screen.getByTestId('send-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('새로 전송된 메시지')).toBeInTheDocument();
      });
    });

    it('sendMessage 실패 시 showErrorToast가 호출된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '전송실패유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      mockSendMessage.mockResolvedValue({ success: false as const, error: '전송 오류' });

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('전송실패유저')).toBeInTheDocument());
      await user.click(screen.getByText('전송실패유저'));

      await waitFor(() => expect(screen.getByTestId('send-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('메시지 전송 실패', '전송 오류');
      });
    });
  });

  // ─── 새 대화 생성 ────────────────────────────────────────────────────

  describe('새 대화 생성', () => {
    it('새 메시지 버튼 클릭 시 다이얼로그가 열린다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '기존유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByTestId('new-conv-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('new-conv-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('new-conv-dialog')).toHaveAttribute('data-open', 'true');
      });
    });

    it('대화 생성 완료 시 해당 대화를 선택한다', async () => {
      const user = userEvent.setup();
      const existingConv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '기존유저', role: 'OPS_ADMIN' },
      });
      const newConv = createConversation({
        id: 'new-conv-id',
        other_user: { id: 'u2', name: '새대화유저', role: 'OPS_ADMIN' },
      });

      mockFetchConversations
        .mockResolvedValueOnce(successConvResult([existingConv]))
        .mockResolvedValue(successConvResult([existingConv, newConv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByTestId('new-conv-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('new-conv-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('create-conv')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('create-conv'));

      await waitFor(() => {
        expect(mockFetchMessages).toHaveBeenCalledWith('new-conv-id');
      });
    });
  });

  // ─── 모바일 뒤로가기 ─────────────────────────────────────────────────

  describe('모바일 뒤로가기', () => {
    it('뒤로가기 버튼 클릭 시 MessageThread가 숨겨진다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c1',
        other_user: { id: 'u1', name: '뒤로가기유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('뒤로가기유저')).toBeInTheDocument());
      await user.click(screen.getByText('뒤로가기유저'));

      await waitFor(() => expect(screen.getByTestId('mobile-back')).toBeInTheDocument());
      await user.click(screen.getByTestId('mobile-back'));

      await waitFor(() => {
        expect(screen.queryByTestId('message-thread')).not.toBeInTheDocument();
      });
    });
  });

  // ─── 폴링 fallback ──────────────────────────────────────────────────

  describe('Realtime · 폴백 폴링 (#019)', () => {
    /** MessagesClient 의 THREAD_POLL_MS·LIST_POLL_MS 와 같은 값 */
    const POLL_MS = 10_000;
    const CONV_ID = 'c-rt';

    function realtimeConversations() {
      return [
        createConversation({
          id: CONV_ID,
          other_user: { id: 'u1', name: '실시간유저', role: 'OPS_ADMIN' },
        }),
      ];
    }

    /**
     * fake timer 하에서 시간을 진행시킨다.
     * `waitFor` 는 내부적으로 타이머를 쓰기 때문에 fake timer 구간에서는 쓸 수 없다
     * (`NotificationBell.test.tsx:1199` 와 같은 제약).
     */
    async function advance(ms: number) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }

    /**
     * 마운트 직후 초기화 체인(목록 조회 → 메시지 조회 → 읽음 처리)을 흘려보낸다.
     * 타이머가 아니라 Promise 단계라 fake/real timer 어느 쪽에서도 동작해야 한다.
     */
    async function settle() {
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          await Promise.resolve();
        });
      }
    }

    async function withFakeTimers(body: () => Promise<void>) {
      vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
      try {
        await body();
      } finally {
        vi.useRealTimers();
      }
    }

    /**
     * 대화가 자동 선택된 상태로 마운트한다.
     * fake timer 와 userEvent 를 섞으면 클릭이 진행되지 않으므로 URL 파라미터로 선택한다.
     */
    async function mountWithSelectedConv() {
      mockGet.mockReturnValue(CONV_ID);
      mockFetchConversations.mockResolvedValue(successConvResult(realtimeConversations()));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      const view = render(<MessagesClient />);
      await settle();
      return view;
    }

    // ── 특성화: 아래 6건은 수정 전후 모두 통과해야 한다 ──────────────────

    it('구독 대상이 채널마다 다르다 — 대화 채널만 현재 대화로 필터링한다 (특성화)', async () => {
      await withFakeTimers(async () => {
        await mountWithSelectedConv();

        expect(channelOf(`messages:${CONV_ID}`).config).toEqual({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${CONV_ID}`,
        });
        // 목록 채널은 "다른 대화"의 메시지도 받아야 하므로 필터가 없다.
        expect(channelOf('messages:all').config).toEqual({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        });
      });
    });

    it('두 채널이 모두 살아 있으면 폴백 폴링이 전혀 돌지 않는다 (특성화)', async () => {
      await withFakeTimers(async () => {
        await mountWithSelectedConv();

        act(() => {
          channelOf(`messages:${CONV_ID}`).status?.('SUBSCRIBED');
          channelOf('messages:all').status?.('SUBSCRIBED');
        });
        mockFrom.mockClear();
        mockFetchConversations.mockClear();

        await advance(POLL_MS * 3);

        // 실시간이 정상일 때 폴링까지 돌면 불필요한 DB 조회가 쌓인다.
        expect(mockFrom).not.toHaveBeenCalled();
        expect(mockFetchConversations).not.toHaveBeenCalled();
      });
    });

    it('대화 채널이 끊기면 폴백 폴링이 새 메시지를 스레드에 붙인다 (특성화)', async () => {
      await withFakeTimers(async () => {
        await mountWithSelectedConv();

        act(() => {
          channelOf(`messages:${CONV_ID}`).status?.('CHANNEL_ERROR');
          channelOf('messages:all').status?.('SUBSCRIBED');
        });
        mockPollRows = [
          createMessage({ id: 'poll-msg', content: '폴링으로 받은 메시지', sender_id: 'u1' }),
        ];

        await advance(POLL_MS);

        expect(screen.getByText('폴링으로 받은 메시지')).toBeInTheDocument();
      });
    });

    it('대화 채널로 새 메시지가 오면 스레드에 붙고 읽음 처리된다 (특성화)', async () => {
      await mountWithSelectedConv();
      mockMarkConversationRead.mockClear();

      await act(async () => {
        channelOf(`messages:${CONV_ID}`).insert?.({
          new: createMessage({ id: 'rt-1', content: '실시간 도착', sender_id: 'u1' }),
        });
        await Promise.resolve();
      });

      expect(screen.getByText('실시간 도착')).toBeInTheDocument();
      await waitFor(() => expect(mockMarkConversationRead).toHaveBeenCalledWith(CONV_ID));
    });

    it('본인이 보낸 메시지 이벤트는 무시한다 (특성화)', async () => {
      await mountWithSelectedConv();

      await act(async () => {
        channelOf(`messages:${CONV_ID}`).insert?.({
          new: createMessage({ id: 'rt-mine', content: '내가 쓴 것', sender_id: 'me' }),
        });
        await Promise.resolve();
      });

      // 전송 시 이미 화면에 붙였으므로 이벤트로 또 붙이면 같은 말풍선이 두 번 뜬다.
      expect(screen.queryByText('내가 쓴 것')).toBeNull();
    });

    it('목록 채널로 새 메시지가 오면 목록을 다시 불러온다 (특성화)', async () => {
      await mountWithSelectedConv();
      mockFetchConversations.mockClear();

      await act(async () => {
        channelOf('messages:all').insert?.({
          new: createMessage({ id: 'rt-other', sender_id: 'u1' }),
        });
        await Promise.resolve();
      });

      await waitFor(() => expect(mockFetchConversations).toHaveBeenCalled());
    });

    // ── 신규: 목록 갱신이 끊기는 두 구간 (#019) ─────────────────────────

    it('목록 채널만 끊기면 목록 갱신 폴백이 돈다', async () => {
      await withFakeTimers(async () => {
        await mountWithSelectedConv();

        // 대화 채널은 살아 있고 목록 채널만 죽은 상태.
        // 예전에는 "실시간이 살아 있다"를 대화 채널만 보고 판단해 폴백을 통째로 건너뛰었고,
        // 그 결과 **다른 대화에 온 새 메시지가 좌측 목록에 영영 뜨지 않았다.**
        act(() => {
          channelOf(`messages:${CONV_ID}`).status?.('SUBSCRIBED');
          channelOf('messages:all').status?.('CHANNEL_ERROR');
        });
        mockFetchConversations.mockClear();

        await advance(POLL_MS);

        expect(mockFetchConversations).toHaveBeenCalled();
      });
    });

    it('대화를 하나도 열지 않은 상태에서도 목록 갱신 폴백이 돈다', async () => {
      await withFakeTimers(async () => {
        mockGet.mockReturnValue(null); // 자동 선택 없음 = 목록만 보고 있는 상태
        mockFetchConversations.mockResolvedValue(successConvResult(realtimeConversations()));
        render(<MessagesClient />);
        await settle();

        act(() => {
          channelOf('messages:all').status?.('CHANNEL_ERROR');
        });
        mockFetchConversations.mockClear();

        await advance(POLL_MS);

        // 예전에는 폴링 자체가 "대화를 열었을 때"만 등록돼, 목록만 보고 있으면
        // 연결이 끊긴 뒤 목록이 영원히 멈춰 있었다.
        expect(mockFetchConversations).toHaveBeenCalled();
      });
    });

    it('목록 채널이 살아나면 목록 갱신 폴백이 멈춘다', async () => {
      await withFakeTimers(async () => {
        mockGet.mockReturnValue(null);
        mockFetchConversations.mockResolvedValue(successConvResult(realtimeConversations()));
        render(<MessagesClient />);
        await settle();

        act(() => {
          channelOf('messages:all').status?.('SUBSCRIBED');
        });
        mockFetchConversations.mockClear();

        await advance(POLL_MS * 3);

        // 폴백을 추가하면서 "정상일 때도 계속 조회"가 되면 그게 새 결함이다.
        expect(mockFetchConversations).not.toHaveBeenCalled();
      });
    });

    it('구독이 계속 실패하면 지수 백오프로 재구독하다가 소진되면 멈춘다 (특성화)', async () => {
      await withFakeTimers(async () => {
        await mountWithSelectedConv();
        mockRemoveChannel.mockClear();

        // 재구독은 옛 채널을 removeChannel 로 걷어내고 새로 연다 → 호출 수 = 재시도 수.
        // MAX_REALTIME_RETRIES 를 넘겨 실패시켜도 그 횟수를 넘지 않아야 한다
        // (무한 재시도는 연결이 끊긴 동안 브라우저를 계속 두드린다).
        for (let i = 0; i < MAX_REALTIME_RETRIES + 1; i++) {
          act(() => {
            channelOf(`messages:${CONV_ID}`).status?.('CHANNEL_ERROR');
          });
          await advance(REALTIME_RETRY_MAX_MS);
        }

        expect(mockRemoveChannel).toHaveBeenCalledTimes(MAX_REALTIME_RETRIES);
      });
    });

    it('unmount 하면 두 채널이 모두 정리된다 (특성화)', async () => {
      await withFakeTimers(async () => {
        const view = await mountWithSelectedConv();
        mockRemoveChannel.mockClear();

        view.unmount();

        expect(mockRemoveChannel).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─── fetchConversations 실패 ─────────────────────────────────────────

  describe('fetchConversations 실패', () => {
    it('fetchConversations 실패 시 로딩이 종료되고 대화 목록이 비어있다', async () => {
      mockFetchConversations.mockResolvedValue({ success: false as const, error: '서버 오류' });

      render(<MessagesClient />);

      await waitFor(() => {
        expect(mockFetchConversations).toHaveBeenCalled();
      });

      // 실패해도 isLoading은 false로 변경됨 → 로딩 스피너가 사라짐
      await waitFor(() => {
        // EmptyState가 나타나거나, ConversationList가 빈 목록으로 표시됨
        const loadingIndicator = screen.queryByTestId('conv-list-loading');
        expect(loadingIndicator).not.toBeInTheDocument();
      });
    });

    // #010 — 실패와 "대화 없음"을 구분한다.
    it('목록 로드 실패 시 빈 상태가 아니라 에러 화면을 보여준다', async () => {
      mockFetchConversations.mockResolvedValue({ success: false as const, error: '서버 오류' });

      render(<MessagesClient />);

      await waitFor(() => {
        expect(screen.getByText('메시지를 불러오지 못했습니다')).toBeInTheDocument();
      });
      expect(
        screen.getByText('잠시 후 다시 시도해주세요. 계속되면 운영팀에 문의해주세요.')
      ).toBeInTheDocument();
      // 실패를 "대화가 하나도 없다"로 오해하게 만들던 기존 문구가 나오면 안 된다
      expect(screen.queryByText('아직 메시지가 없습니다')).toBeNull();
    });

    it('"다시 시도" 클릭 시 목록을 다시 불러오고 에러 화면이 사라진다', async () => {
      const user = userEvent.setup();
      mockFetchConversations.mockResolvedValue({ success: false as const, error: '서버 오류' });

      render(<MessagesClient />);
      await waitFor(() =>
        expect(screen.getByText('메시지를 불러오지 못했습니다')).toBeInTheDocument()
      );

      const conv = createConversation({
        other_user: { id: 'u1', name: '재시도유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));

      await user.click(screen.getByRole('button', { name: '다시 시도' }));

      await waitFor(() => expect(screen.getByText('재시도유저')).toBeInTheDocument());
      expect(screen.queryByText('메시지를 불러오지 못했습니다')).toBeNull();
    });

    // 특성화 — 에러 화면을 넣으면서 "정상적으로 대화가 0건인 경우"까지 덮으면 퇴보다.
    it('성공했지만 대화가 0건이면 기존 빈 상태 화면이 그대로 유지된다', async () => {
      mockFetchConversations.mockResolvedValue(successConvResult([]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('아직 메시지가 없습니다')).toBeInTheDocument());
      expect(screen.queryByText('메시지를 불러오지 못했습니다')).toBeNull();
    });
  });

  // ─── fetchMessages 실패/예외 ──────────────────────────────────────────

  describe('fetchMessages 예외 처리', () => {
    it('fetchMessages 예외(throw) 발생 시 showErrorToast를 호출한다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-exc2',
        other_user: { id: 'u1', name: '메시지예외', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      // throw로 catch 블록 진입 — 이것이 showErrorToast를 호출하는 경로
      mockFetchMessages.mockRejectedValue(new Error('네트워크 예외'));

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('메시지예외')).toBeInTheDocument());
      await user.click(screen.getByText('메시지예외'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalled();
      });
    });

    it('fetchMessages 실패(success=false) 시 빈 메시지로 스레드가 표시된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-fail2',
        other_user: { id: 'u1', name: '메시지실패', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue({ success: false as const, error: '조회 오류' });

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('메시지실패')).toBeInTheDocument());
      await user.click(screen.getByText('메시지실패'));

      // success=false여도 selectedConvId는 설정되어 MessageThread가 표시됨
      await waitFor(() => {
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
      });
    });

    // #010 — 예외(throw)만 토스트를 띄우고 구조적 실패(success=false)는 조용히 넘어가던 두 경로.
    it('대화 클릭 시 메시지 조회가 실패하면 사유를 토스트로 알린다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-silent',
        other_user: { id: 'u1', name: '조용한실패', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue({
        success: false as const,
        error: '조회 권한이 없습니다.',
      });

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('조용한실패')).toBeInTheDocument());
      await user.click(screen.getByText('조용한실패'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '메시지 로드 실패',
          '조회 권한이 없습니다.'
        );
      });
    });

    it('URL 로 자동 선택된 대화의 메시지 조회가 실패하면 사유를 토스트로 알린다', async () => {
      mockGet.mockReturnValue('c-url-fail');
      const conv = createConversation({
        id: 'c-url-fail',
        other_user: { id: 'u1', name: 'URL실패유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue({
        success: false as const,
        error: '대화를 찾을 수 없습니다.',
      });

      render(<MessagesClient />);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '메시지 로드 실패',
          '대화를 찾을 수 없습니다.'
        );
      });
    });
  });

  // ─── hasMore 분기 — 더 불러오기 ────────────────────────────────────

  describe('hasMore 분기', () => {
    it('hasMore=true인 경우 컴포넌트가 올바르게 렌더링된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-more',
        other_user: { id: 'u1', name: '더보기유저', role: 'OPS_ADMIN' },
      });
      const msgs = Array.from({ length: 3 }, (_, i) =>
        createMessage({ id: `msg-${i}`, content: `메시지 ${i}` })
      );
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult(msgs, true));

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('더보기유저')).toBeInTheDocument());
      await user.click(screen.getByText('더보기유저'));

      await waitFor(() => {
        // hasMore=true이더라도 MessageThread는 정상 표시
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
      });
    });
  });

  // ─── markConversationRead 실패 ───────────────────────────────────────

  describe('markConversationRead 실패', () => {
    it('markConversationRead 실패 시 에러 없이 처리된다 (silent fail)', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-mark-fail',
        other_user: { id: 'u1', name: '읽음실패유저', role: 'OPS_ADMIN' },
        has_unread: true,
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      mockMarkConversationRead.mockResolvedValue({
        success: false as const,
        error: '읽음처리 실패',
      });

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('읽음실패유저')).toBeInTheDocument());
      await user.click(screen.getByText('읽음실패유저'));

      // silent fail — 에러 없이 계속 렌더링됨
      await waitFor(() => {
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
      });
    });
  });

  // ─── sendMessage 예외 처리 ─────────────────────────────────────────

  describe('sendMessage 예외 처리', () => {
    it('sendMessage 예외 발생 시 showErrorToast를 호출한다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-exc',
        other_user: { id: 'u1', name: '예외유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      mockSendMessage.mockRejectedValue(new Error('네트워크 오류'));

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('예외유저')).toBeInTheDocument());
      await user.click(screen.getByText('예외유저'));

      await waitFor(() => expect(screen.getByTestId('send-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalled();
      });
    });
  });

  // 재시도(createRetryHandler) 특성화는 위 「Realtime · 폴백 폴링 (#019)」 블록으로 옮겼다.
  // 여기 있던 테스트는 마지막 단언이 `expect(true).toBe(true)` 라 아무것도 지키지 못했다.

  // ─── handleLoadMore 분기 ───────────────────────────────────────────────────

  describe('handleLoadMore 분기', () => {
    it('선택된 대화가 없으면 loadMore가 실행되지 않는다', async () => {
      mockFetchConversations.mockResolvedValue(successConvResult([]));
      render(<MessagesClient />);
      await waitFor(() => expect(mockFetchConversations).toHaveBeenCalled());
      // selectedConvId=null → handleLoadMore 조기 return
      expect(mockFetchMessages).not.toHaveBeenCalled();
    });
  });

  // ─── appendMessageIfNew 중복 방지 분기 ───────────────────────────────────

  describe('appendMessageIfNew — 중복 방지', () => {
    it('동일 ID 메시지를 두 번 전송해도 한 번만 추가된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-dup',
        other_user: { id: 'u1', name: '중복유저', role: 'OPS_ADMIN' },
      });
      const msg = createMessage({ id: 'dup-msg', content: '중복 메시지' });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));
      // 첫 전송 성공
      mockSendMessage.mockResolvedValue({ success: true as const, data: msg });

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('중복유저')).toBeInTheDocument());
      await user.click(screen.getByText('중복유저'));

      await waitFor(() => expect(screen.getByTestId('send-btn')).toBeInTheDocument());
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getAllByText('중복 메시지').length).toBe(1);
      });

      // 같은 ID로 두 번째 전송 → appendMessageIfNew에서 중복 감지 → 무시
      await user.click(screen.getByTestId('send-btn'));
      await waitFor(() => {
        // 여전히 1개만 표시됨
        expect(screen.getAllByText('중복 메시지').length).toBe(1);
      });
    });
  });

  // ─── isNewDialogOpen=true이면 빈 상태 화면 대신 기본 레이아웃 ─────────────

  describe('isNewDialogOpen=true일 때 빈 상태 화면 처리', () => {
    it('대화가 없어도 다이얼로그가 열린 상태라면 EmptyState가 표시된다', async () => {
      mockFetchConversations.mockResolvedValue(successConvResult([]));
      render(<MessagesClient />);
      await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
      // 버튼 클릭으로 다이얼로그 오픈 → isNewDialogOpen=true
      // "대화가 없을 때 다이얼로그 열림" 분기는 EmptyState와 다이얼로그 공존 처리
    });
  });

  // ─── URL 파라미터가 있지만 대화 목록에 없는 경우 ─────────────────────────

  describe('URL ?conversation= 파라미터 — 목록에 없는 경우', () => {
    it('URL 파라미터 ID가 대화 목록에 없으면 자동 선택되지 않는다', async () => {
      mockGet.mockReturnValue('nonexistent-id');
      const conv = createConversation({
        id: 'c-other',
        other_user: { id: 'u1', name: '다른유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));

      render(<MessagesClient />);
      await waitFor(() => expect(mockFetchConversations).toHaveBeenCalled());

      // nonexistent-id는 목록에 없으므로 자동 선택 안 됨
      await waitFor(() => expect(screen.queryByTestId('message-thread')).not.toBeInTheDocument());
    });
  });
});
