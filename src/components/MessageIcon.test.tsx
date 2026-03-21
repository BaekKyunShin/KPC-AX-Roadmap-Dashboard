import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  }),
}));

vi.mock('@/app/(dashboard)/dashboard/messages/actions', () => ({
  fetchUnreadConversationCount: vi.fn().mockResolvedValue(0),
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

import MessageIcon from './MessageIcon';

// =============================================================================
// 테스트
// =============================================================================

describe('MessageIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
