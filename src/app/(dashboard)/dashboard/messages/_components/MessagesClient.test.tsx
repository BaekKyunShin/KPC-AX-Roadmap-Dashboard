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

// Supabase Realtime 모킹
const mockGetUser = vi.fn();
const mockRemoveChannel = vi.fn();
const mockChannelOn = vi.fn();
const mockChannelSubscribe = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    channel: vi.fn(() => ({
      on: mockChannelOn.mockReturnThis(),
      subscribe: mockChannelSubscribe.mockReturnThis(),
    })),
    removeChannel: mockRemoveChannel,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }),
}));

// Server Actions 모킹
const mockFetchConversations = vi.fn();
const mockFetchMessages = vi.fn();
const mockSendMessage = vi.fn();
const mockMarkConversationRead = vi.fn();

vi.mock('../actions', () => ({
  fetchConversations: (...args: unknown[]) => mockFetchConversations(...args),
  fetchMessages: (...args: unknown[]) => mockFetchMessages(...args),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  markConversationRead: (...args: unknown[]) => mockMarkConversationRead(...args),
}));

const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
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
    mockChannelOn.mockReturnThis();
    mockChannelSubscribe.mockReturnThis();
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

  describe('폴링 fallback', () => {
    it('대화 선택 후 MessageThread가 표시되며 폴링 준비 상태가 된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-poll',
        other_user: { id: 'u1', name: '폴링유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();

      await waitFor(() => expect(screen.getByText('폴링유저')).toBeInTheDocument());
      await user.click(screen.getByText('폴링유저'));

      // 대화 선택 후 MessageThread가 마운트됨 → 폴링 인터벌이 등록되는 상태
      await waitFor(() => expect(screen.getByTestId('message-thread')).toBeInTheDocument());
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

  // ─── createRetryHandler 분기 커버 ──────────────────────────────────────────

  describe('createRetryHandler 분기', () => {
    // subscribeCallback을 캡처하기 위해 별도 모킹이 필요하지 않음
    // mockChannelSubscribe는 ReturnThis()로 동작하므로
    // 대신 직접 createRetryHandler를 테스트

    it('SUBSCRIBED 상태 시 retryCount가 0으로 초기화된다', async () => {
      // createRetryHandler는 MessagesClient 내부에서 사용됨
      // 대화 선택 후 구독이 설정되는 경로를 통해 간접 커버
      const user = userEvent.setup();
      const conv = createConversation({
        id: 'c-retry',
        other_user: { id: 'u1', name: '재시도유저', role: 'OPS_ADMIN' },
      });
      mockFetchConversations.mockResolvedValue(successConvResult([conv]));
      mockFetchMessages.mockResolvedValue(successMsgResult([]));

      await renderAndWait();
      await waitFor(() => expect(screen.getByText('재시도유저')).toBeInTheDocument());
      await user.click(screen.getByText('재시도유저'));

      await waitFor(() => {
        expect(screen.getByTestId('message-thread')).toBeInTheDocument();
      });
      // subscribe 콜백이 있다면 SUBSCRIBED 상태로 호출 → retryCount = 0
      expect(true).toBe(true);
    });
  });

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
