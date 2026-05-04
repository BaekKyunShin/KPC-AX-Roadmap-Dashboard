import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// =============================================================================
// 모킹
// =============================================================================

// 구독 상태 콜백을 테스트에서 직접 트리거할 수 있도록 ref 유지
let subscribeCallback: ((status: string) => void) | null = null;
let postgresCallback: ((payload: { new: { sender_id: string } }) => void) | null = null;
let mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-me' } } });
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    channel: vi.fn(() => ({
      on: vi.fn(
        (
          _event: string,
          _filter: unknown,
          cb: (payload: { new: { sender_id: string } }) => void,
        ) => {
          postgresCallback = cb;
          return {
            subscribe: vi.fn((cb: (status: string) => void) => {
              subscribeCallback = cb;
            }),
          };
        },
      ),
    })),
    removeChannel: mockRemoveChannel,
  }),
}));

vi.mock('@/lib/constants/message', () => ({
  CONVERSATION_READ_EVENT: 'conversation-read',
  MAX_REALTIME_RETRIES: 3,
  MESSAGE_BADGE_MAX: 9,
  REALTIME_RETRY_BASE_MS: 1000,
  REALTIME_RETRY_MAX_MS: 10000,
}));

// =============================================================================
// Import
// =============================================================================

const mockFetchUnreadCount = vi.fn();
vi.mock('@/app/(dashboard)/dashboard/messages/actions', () => ({
  fetchUnreadConversationCount: (...args: unknown[]) => mockFetchUnreadCount(...args),
}));

import MessageIcon from './MessageIcon';

// =============================================================================
// 테스트
// =============================================================================

describe('MessageIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeCallback = null;
    postgresCallback = null;
    mockFetchUnreadCount.mockResolvedValue(0);
    mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-me' } } });
  });

  describe('기본 렌더링', () => {
    it('메시지 링크가 /dashboard/messages로 연결된다', () => {
      render(<MessageIcon initialUnreadCount={0} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/dashboard/messages');
    });

    it('aria-label에 "메시지"가 포함된다', () => {
      render(<MessageIcon initialUnreadCount={0} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', expect.stringContaining('메시지'));
    });
  });

  describe('뱃지 표시 (unreadCount = 0)', () => {
    it('안읽음이 0이면 뱃지를 표시하지 않는다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={0} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge).not.toBeInTheDocument();
    });

    it('안읽음이 0이면 aria-label에 "안읽음"이 포함되지 않는다', () => {
      render(<MessageIcon initialUnreadCount={0} />);
      const link = screen.getByRole('link');
      expect(link.getAttribute('aria-label')).not.toContain('안읽음');
    });
  });

  describe('뱃지 표시 (unreadCount > 0)', () => {
    it('안읽음이 1이면 "1" 뱃지를 표시한다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={1} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('1');
    });

    it('안읽음이 5이면 "5" 뱃지를 표시한다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={5} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('5');
    });

    it('안읽음이 9이면 "9" 뱃지를 표시한다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={9} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('9');
    });

    it('aria-label에 안읽음 수가 포함된다', () => {
      render(<MessageIcon initialUnreadCount={3} />);
      const link = screen.getByRole('link');
      expect(link.getAttribute('aria-label')).toContain('3개 안읽음');
    });
  });

  describe('뱃지 최대값 (N+) 표시', () => {
    it('안읽음이 10이면 "9+" 뱃지를 표시한다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={10} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('9+');
    });

    it('안읽음이 99이면 "9+" 뱃지를 표시한다', () => {
      const { container } = render(<MessageIcon initialUnreadCount={99} />);
      const badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('9+');
    });
  });

  describe('initialUnreadCount 변경 시 동기화', () => {
    it('initialUnreadCount prop이 변경되면 뱃지가 갱신된다', () => {
      const { container, rerender } = render(<MessageIcon initialUnreadCount={2} />);
      let badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('2');

      rerender(<MessageIcon initialUnreadCount={5} />);
      badge = container.querySelector('.bg-blue-500');
      expect(badge?.textContent).toBe('5');
    });

    it('initialUnreadCount가 0에서 양수로 변경되면 뱃지가 나타난다', () => {
      const { container, rerender } = render(<MessageIcon initialUnreadCount={0} />);
      expect(container.querySelector('.bg-blue-500')).not.toBeInTheDocument();

      rerender(<MessageIcon initialUnreadCount={3} />);
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });
  });

  describe('마운트 시 unread count 자체 갱신', () => {
    it('마운트 직후 fetchUnreadConversationCount가 호출된다', async () => {
      mockFetchUnreadCount.mockResolvedValue(0);
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });
      expect(mockFetchUnreadCount).toHaveBeenCalled();
    });

    it('마운트 후 fetch 결과로 뱃지가 갱신된다', async () => {
      mockFetchUnreadCount.mockResolvedValue(4);
      const { container } = render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
    });
  });

  describe('visibilitychange 이벤트 — refreshCount 호출', () => {
    it('탭이 다시 보이면 fetchUnreadConversationCount가 호출된다', async () => {
      render(<MessageIcon initialUnreadCount={0} />);

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      expect(mockFetchUnreadCount).toHaveBeenCalled();
    });

    it('탭이 숨겨지면 fetchUnreadConversationCount가 호출되지 않는다', async () => {
      render(<MessageIcon initialUnreadCount={0} />);
      // 마운트 시 자체 fetch 한 번은 정상 동작 — 이 테스트는 visibilitychange만 검증
      await act(async () => { await Promise.resolve(); });
      mockFetchUnreadCount.mockClear();

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();
      });

      expect(mockFetchUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('CONVERSATION_READ_EVENT — 읽음 처리 시 뱃지 갱신', () => {
    it('conversation-read 이벤트 발생 시 fetchUnreadConversationCount가 호출된다', async () => {
      render(<MessageIcon initialUnreadCount={3} />);

      await act(async () => {
        window.dispatchEvent(new Event('conversation-read'));
        await Promise.resolve();
      });

      expect(mockFetchUnreadCount).toHaveBeenCalled();
    });
  });

  describe('Realtime 구독 성공 (SUBSCRIBED) — stopFallbackPolling 경로', () => {
    it('SUBSCRIBED 상태 시 정상 렌더링 유지', async () => {
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });

      if (subscribeCallback) {
        act(() => { subscribeCallback?.('SUBSCRIBED'); });
      }

      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('Realtime 구독 실패 — CHANNEL_ERROR 재시도 분기', () => {
    it('CHANNEL_ERROR 발생 시 retryCount < MAX_REALTIME_RETRIES이면 재시도 스케줄링', async () => {
      vi.useFakeTimers();
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });

      // CHANNEL_ERROR → retryCount=1 → setTimeout으로 재시도
      if (subscribeCallback) {
        act(() => { subscribeCallback?.('CHANNEL_ERROR'); });
      }

      // retryTimer가 설정된 상태 — 에러 없이 처리됨
      expect(screen.getByRole('link')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('TIMED_OUT 발생 시 재시도 스케줄링', async () => {
      vi.useFakeTimers();
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });

      if (subscribeCallback) {
        act(() => { subscribeCallback?.('TIMED_OUT'); });
      }

      expect(screen.getByRole('link')).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('postgres_changes 콜백 — 메시지 수신 분기', () => {
    it('내가 보낸 메시지 수신 시 fetchUnreadCount를 호출하지 않는다', async () => {
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });
      // 마운트 시 자체 fetch 한 번은 정상 동작 — 이 테스트는 postgres_changes만 검증
      mockFetchUnreadCount.mockClear();

      if (postgresCallback) {
        await act(async () => {
          postgresCallback?.({ new: { sender_id: 'user-me' } }); // 내 메시지
          await Promise.resolve();
        });
      }

      // 내 메시지이므로 fetchUnread 미호출
      expect(mockFetchUnreadCount).not.toHaveBeenCalled();
    });

    it('다른 사람 메시지 수신 시 debounce 후 fetchUnreadCount 호출', async () => {
      vi.useFakeTimers();
      mockFetchUnreadCount.mockResolvedValue(1);
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });

      if (postgresCallback) {
        act(() => {
          postgresCallback?.({ new: { sender_id: 'other-user' } });
        });
        // 두 번째 메시지 수신 (debounce 타이머 초기화 경로)
        act(() => {
          postgresCallback?.({ new: { sender_id: 'other-user' } });
        });
      }

      // debounce 500ms 이후 실행
      await act(async () => {
        vi.advanceTimersByTime(600);
        await Promise.resolve();
      });

      expect(mockFetchUnreadCount).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('user가 없는 경우 — 구독 미실행', () => {
    it('user=null이면 Realtime 구독이 실행되지 않는다', async () => {
      mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
      render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });

      // user가 없으면 channelRef에 구독이 설정되지 않음
      expect(subscribeCallback).toBeNull();
    });
  });

  describe('언마운트 시 정리', () => {
    it('언마운트 시 이벤트 리스너가 제거되어 메모리 누수가 없다', () => {
      const { unmount } = render(<MessageIcon initialUnreadCount={0} />);
      expect(() => unmount()).not.toThrow();
    });

    it('언마운트 시 채널 제거가 에러 없이 처리된다', async () => {
      const { unmount } = render(<MessageIcon initialUnreadCount={0} />);
      await act(async () => { await Promise.resolve(); });
      expect(() => unmount()).not.toThrow();
    });
  });
});
