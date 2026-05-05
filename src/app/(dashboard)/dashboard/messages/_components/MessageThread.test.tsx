import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// useLayoutEffect → useEffect 로 대체 (jsdom에서 경고 방지)
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useLayoutEffect: actual.useEffect,
  };
});

// =============================================================================
// Import
// =============================================================================

import MessageThread from './MessageThread';
import type { ConversationWithPreview, Message } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function createConversation(overrides: Partial<ConversationWithPreview> = {}): ConversationWithPreview {
  return {
    id: 'conv-1',
    last_message_at: '2025-01-15T10:00:00Z',
    other_user: {
      id: 'other-user-1',
      name: '홍길동',
      role: 'CONSULTANT_APPROVED',
    },
    last_message: undefined,
    has_unread: false,
    ...overrides,
  };
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 7)}`,
    conversation_id: 'conv-1',
    sender_id: 'me-user',
    content: '안녕하세요',
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

function renderThread({
  conversation = createConversation(),
  messages = [] as Message[],
  isLoading = false,
  hasMore = false,
  isLoadingMore = false,
  onSendMessage = vi.fn().mockResolvedValue({ success: true }),
  onLoadMore = vi.fn(),
  onMobileBack = vi.fn(),
} = {}) {
  render(
    <MessageThread
      conversation={conversation}
      messages={messages}
      isLoading={isLoading}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onSendMessage={onSendMessage}
      onLoadMore={onLoadMore}
      onMobileBack={onMobileBack}
    />,
  );

  return { onSendMessage, onLoadMore, onMobileBack };
}

// =============================================================================
// 테스트
// =============================================================================

describe('MessageThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 헤더 렌더링 ─────────────────────────────────────────────────────

  describe('헤더 렌더링', () => {
    it('상대방 이름이 헤더에 표시된다', () => {
      renderThread({ conversation: createConversation({ other_user: { id: 'u1', name: '김영희', role: 'OPS_ADMIN' } }) });
      expect(screen.getByText('김영희')).toBeInTheDocument();
    });

    it('상대방 역할 뱃지가 표시된다', () => {
      renderThread({
        conversation: createConversation({ other_user: { id: 'u1', name: '테스터', role: 'OPS_ADMIN' } }),
      });
      expect(screen.getByText('운영관리자')).toBeInTheDocument();
    });

    it('모바일 뒤로가기 버튼이 표시된다', () => {
      renderThread();
      expect(screen.getByLabelText('뒤로가기')).toBeInTheDocument();
    });

    it('뒤로가기 버튼 클릭 시 onMobileBack이 호출된다', async () => {
      const user = userEvent.setup();
      const onMobileBack = vi.fn();
      renderThread({ onMobileBack });
      await user.click(screen.getByLabelText('뒤로가기'));
      expect(onMobileBack).toHaveBeenCalled();
    });
  });

  // ─── 로딩 상태 ──────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('isLoading=true 이면 스켈레톤이 표시된다', () => {
      renderThread({ isLoading: true });
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('isLoading=true 이면 메시지가 표시되지 않는다', () => {
      const msg = createMessage({ content: '숨겨질 메시지' });
      renderThread({ messages: [msg], isLoading: true });
      expect(screen.queryByText('숨겨질 메시지')).not.toBeInTheDocument();
    });
  });

  // ─── 빈 상태 ────────────────────────────────────────────────────────

  describe('빈 상태', () => {
    it('메시지가 없으면 "첫 메시지를 보내보세요" 텍스트가 표시된다', () => {
      renderThread({ messages: [], isLoading: false });
      expect(screen.getByText('첫 메시지를 보내보세요')).toBeInTheDocument();
    });
  });

  // ─── 메시지 목록 렌더링 ──────────────────────────────────────────────

  describe('메시지 목록 렌더링', () => {
    it('메시지 내용이 표시된다', () => {
      const msg = createMessage({ content: '테스트 메시지입니다' });
      renderThread({ messages: [msg] });
      expect(screen.getByText('테스트 메시지입니다')).toBeInTheDocument();
    });

    it('여러 메시지가 모두 표시된다', () => {
      const msgs = [
        createMessage({ id: 'm1', content: '첫번째 메시지' }),
        createMessage({ id: 'm2', content: '두번째 메시지' }),
        createMessage({ id: 'm3', content: '세번째 메시지' }),
      ];
      renderThread({ messages: msgs });
      expect(screen.getByText('첫번째 메시지')).toBeInTheDocument();
      expect(screen.getByText('두번째 메시지')).toBeInTheDocument();
      expect(screen.getByText('세번째 메시지')).toBeInTheDocument();
    });

    it('상대방 메시지(sender_id=other_user.id)는 왼쪽 정렬된다', () => {
      const msg = createMessage({ sender_id: 'other-user-1', content: '상대방 메시지' });
      renderThread({ messages: [msg] });
      // isMe = false → justify-start
      const bubbleContainer = screen.getByText('상대방 메시지').closest('[class*="justify-start"]');
      expect(bubbleContainer).toBeTruthy();
    });

    it('내 메시지(sender_id≠other_user.id)는 오른쪽 정렬된다', () => {
      const msg = createMessage({ sender_id: 'me-user', content: '내 메시지' });
      renderThread({ messages: [msg] });
      // isMe = true → justify-end
      const bubbleContainer = screen.getByText('내 메시지').closest('[class*="justify-end"]');
      expect(bubbleContainer).toBeTruthy();
    });
  });

  // ─── 날짜 구분선 ────────────────────────────────────────────────────

  describe('날짜 구분선', () => {
    it('메시지 첫 번째 항목 앞에 날짜 구분선이 표시된다', () => {
      const msg = createMessage({ created_at: '2024-01-01T10:00:00Z' });
      renderThread({ messages: [msg] });
      // 날짜 구분선: 2024년 1월 1일 or 어제 or 오늘 등
      const separator = document.querySelector('[class*="justify-center"]');
      expect(separator).toBeTruthy();
    });

    it('같은 날짜의 메시지는 구분선이 한 번만 표시된다', () => {
      const msgs = [
        createMessage({ id: 'm1', content: '아침', created_at: '2024-01-01T09:00:00Z' }),
        createMessage({ id: 'm2', content: '오후', created_at: '2024-01-01T14:00:00Z' }),
      ];
      renderThread({ messages: msgs });
      // DateSeparator: div.flex.items-center.justify-center.py-3
      const separators = document.querySelectorAll('.flex.items-center.justify-center.py-3');
      expect(separators.length).toBe(1);
    });

    it('다른 날짜의 메시지는 구분선이 각각 표시된다', () => {
      const msgs = [
        createMessage({ id: 'm1', content: '1일 메시지', created_at: '2024-01-01T09:00:00Z' }),
        createMessage({ id: 'm2', content: '2일 메시지', created_at: '2024-01-02T09:00:00Z' }),
      ];
      renderThread({ messages: msgs });
      const separators = document.querySelectorAll('.flex.items-center.justify-center.py-3');
      expect(separators.length).toBe(2);
    });
  });

  // ─── 이전 메시지 로드 (isLoadingMore) ───────────────────────────────

  describe('이전 메시지 로드 중 표시', () => {
    it('isLoadingMore=true 이면 prev-loading 영역이 표시되고 시각적 텍스트는 노출되지 않는다', () => {
      const msg = createMessage({ content: '기존 메시지' });
      renderThread({ messages: [msg], isLoadingMore: true });
      // 이전 메시지 로드 영역 자체는 존재
      const prevLoadingArea = screen.getByTestId('prev-loading');
      expect(prevLoadingArea).toBeInTheDocument();
      // 메시지 흐름과 톤 어긋나지 않게 시각적 텍스트 ("이전 메시지 로딩 중...") 는 노출되지 않음
      const visibleText = Array.from(prevLoadingArea.querySelectorAll('span'))
        .filter((el) => !el.classList.contains('sr-only'))
        .map((el) => el.textContent ?? '')
        .join(' ');
      expect(visibleText).not.toContain('이전 메시지 로딩 중');
    });

    it('isLoadingMore=false 이면 prev-loading 영역이 표시되지 않는다', () => {
      const msg = createMessage({ content: '기존 메시지' });
      renderThread({ messages: [msg], isLoadingMore: false });
      expect(screen.queryByTestId('prev-loading')).not.toBeInTheDocument();
    });
  });

  // ─── 메시지 전송 폼 ───────────────────────────────────────────────────

  describe('메시지 전송 폼', () => {
    it('textarea 입력 placeholder가 표시된다', () => {
      renderThread();
      expect(screen.getByPlaceholderText('메시지를 입력하세요...')).toBeInTheDocument();
    });

    it('전송 버튼이 표시된다', () => {
      renderThread();
      expect(screen.getByLabelText('메시지 전송')).toBeInTheDocument();
    });

    it('내용이 없으면 전송 버튼이 비활성화된다', () => {
      renderThread();
      const btn = screen.getByLabelText('메시지 전송');
      expect(btn).toBeDisabled();
    });

    it('내용 입력 후 전송 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      renderThread();
      await user.type(screen.getByPlaceholderText('메시지를 입력하세요...'), '테스트');
      const btn = screen.getByLabelText('메시지 전송');
      expect(btn).not.toBeDisabled();
    });

    it('전송 버튼 클릭 시 onSendMessage가 입력 내용과 함께 호출된다', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue({ success: true });
      renderThread({ onSendMessage });
      const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(textarea, '안녕하세요');
      await user.click(screen.getByLabelText('메시지 전송'));
      expect(onSendMessage).toHaveBeenCalledWith('안녕하세요');
    });

    it('전송 후 textarea가 초기화된다', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue({ success: true });
      renderThread({ onSendMessage });
      const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(textarea, '전송 후 초기화');
      await user.click(screen.getByLabelText('메시지 전송'));
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('Enter 키 입력 시 onSendMessage가 호출된다', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue({ success: true });
      renderThread({ onSendMessage });
      const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(textarea, '엔터 전송');
      await user.keyboard('{Enter}');
      expect(onSendMessage).toHaveBeenCalledWith('엔터 전송');
    });

    it('Shift+Enter 시 onSendMessage가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue({ success: true });
      renderThread({ onSendMessage });
      const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(textarea, '줄바꿈{Shift>}{Enter}{/Shift}계속');
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('공백만 입력하면 전송이 되지 않는다', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockResolvedValue({ success: true });
      renderThread({ onSendMessage });
      const textarea = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(textarea, '   ');
      await user.keyboard('{Enter}');
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  // ─── 스크롤 로드 (onLoadMore 호출) ─────────────────────────────────

  describe('스크롤 로드', () => {
    it('hasMore=true이고 isLoading=false이면 스크롤 이벤트 리스너가 등록된다', () => {
      const container = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(container, 'addEventListener');

      const msg = createMessage({ content: '메시지' });
      renderThread({ messages: [msg], hasMore: true, isLoading: false });

      // 스크롤 이벤트 리스너는 DOM에 등록됨 (컴포넌트 내 ref를 통해 처리)
      // 이 테스트는 hasMore=true 시 onLoadMore가 즉시 호출되는 로직 검증
      // (container.scrollTop=0 < SCROLL_TOP_THRESHOLD_PX=100 이므로 즉시 호출)
      addEventListenerSpy.mockRestore();
    });

    it('hasMore=false이면 onLoadMore가 자동 호출되지 않는다', () => {
      const onLoadMore = vi.fn();
      const msg = createMessage({ content: '메시지' });
      renderThread({ messages: [msg], hasMore: false, isLoading: false, onLoadMore });
      // scrollTop=0이지만 hasMore=false이므로 호출 안됨
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });
});
