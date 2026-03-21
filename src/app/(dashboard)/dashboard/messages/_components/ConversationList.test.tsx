import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/utils/consultant-home', () => ({
  formatRelativeTime: (date: string) => `${date} 전`,
}));

// =============================================================================
// Import
// =============================================================================

import ConversationList from './ConversationList';
import type { ConversationWithPreview } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function createConversation(overrides: Partial<ConversationWithPreview> = {}): ConversationWithPreview {
  return {
    id: `conv-${Math.random().toString(36).slice(2, 7)}`,
    last_message_at: '2025-01-15T10:00:00Z',
    other_user: {
      id: 'user-1',
      name: '홍길동',
      role: 'CONSULTANT_APPROVED',
    },
    last_message: {
      content: '안녕하세요',
      sender_id: 'user-1',
      created_at: '2025-01-15T10:00:00Z',
    },
    has_unread: false,
    ...overrides,
  };
}

function renderList(
  conversations: ConversationWithPreview[] = [],
  selectedId: string | null = null,
  isLoading = false,
) {
  const onSelect = vi.fn();
  const onNewConversation = vi.fn();

  render(
    <ConversationList
      conversations={conversations}
      selectedId={selectedId}
      isLoading={isLoading}
      onSelect={onSelect}
      onNewConversation={onNewConversation}
    />,
  );

  return { onSelect, onNewConversation };
}

// =============================================================================
// 테스트
// =============================================================================

describe('ConversationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 기본 렌더링 ─────────────────────────────────────────────────────

  describe('기본 렌더링', () => {
    it('헤더에 "메시지" 텍스트가 표시된다', () => {
      renderList();
      expect(screen.getByText('메시지')).toBeInTheDocument();
    });

    it('새 메시지 버튼이 표시된다', () => {
      renderList();
      expect(screen.getByLabelText('새 메시지')).toBeInTheDocument();
    });
  });

  // ─── 로딩 상태 ──────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('isLoading=true 이면 스켈레톤이 표시된다', () => {
      renderList([], null, true);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('isLoading=true 이면 대화 항목이 표시되지 않는다', () => {
      const conv = createConversation({ other_user: { id: 'u1', name: '김철수', role: 'OPS_ADMIN' } });
      renderList([conv], null, true);
      expect(screen.queryByText('김철수')).not.toBeInTheDocument();
    });
  });

  // ─── 빈 상태 ────────────────────────────────────────────────────────

  describe('빈 상태', () => {
    it('대화가 없으면 "메시지가 없습니다" 텍스트가 표시된다', () => {
      renderList([], null, false);
      expect(screen.getByText('메시지가 없습니다')).toBeInTheDocument();
    });
  });

  // ─── 대화 목록 렌더링 ────────────────────────────────────────────────

  describe('대화 목록 렌더링', () => {
    it('대화 목록의 상대방 이름이 표시된다', () => {
      const convs = [
        createConversation({ id: 'c1', other_user: { id: 'u1', name: '홍길동', role: 'CONSULTANT_APPROVED' } }),
        createConversation({ id: 'c2', other_user: { id: 'u2', name: '김영희', role: 'OPS_ADMIN' } }),
      ];
      renderList(convs);
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('김영희')).toBeInTheDocument();
    });

    it('마지막 메시지 내용이 표시된다', () => {
      const conv = createConversation({
        last_message: { content: '내일 미팅 가능하신가요?', sender_id: 'u1', created_at: '2025-01-15T10:00:00Z' },
      });
      renderList([conv]);
      expect(screen.getByText('내일 미팅 가능하신가요?')).toBeInTheDocument();
    });

    it('마지막 메시지가 없으면 내용이 표시되지 않는다', () => {
      const conv = createConversation({ last_message: undefined });
      renderList([conv]);
      // 메시지 미리보기 영역이 없어야 함
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
    });

    it('역할 라벨 뱃지가 표시된다', () => {
      const conv = createConversation({
        other_user: { id: 'u1', name: '컨설턴트A', role: 'CONSULTANT_APPROVED' },
      });
      renderList([conv]);
      expect(screen.getByText('컨설턴트')).toBeInTheDocument();
    });

    it('마지막 메시지 시간이 formatRelativeTime을 통해 표시된다', () => {
      const conv = createConversation({
        last_message: {
          content: '안녕',
          sender_id: 'u1',
          created_at: '2025-01-15T10:00:00Z',
        },
      });
      renderList([conv]);
      expect(screen.getByText('2025-01-15T10:00:00Z 전')).toBeInTheDocument();
    });
  });

  // ─── 선택 상태 스타일 ────────────────────────────────────────────────

  describe('선택 상태 스타일', () => {
    it('선택된 대화 항목에 bg-blue-50 클래스가 적용된다', () => {
      const conv = createConversation({ id: 'c1', other_user: { id: 'u1', name: '선택된유저', role: 'OPS_ADMIN' } });
      renderList([conv], 'c1');
      const button = screen.getByText('선택된유저').closest('button');
      expect(button?.className).toContain('bg-blue-50');
    });

    it('선택되지 않은 대화 항목에는 bg-blue-50 클래스가 없다', () => {
      const conv = createConversation({ id: 'c1', other_user: { id: 'u1', name: '미선택유저', role: 'OPS_ADMIN' } });
      renderList([conv], 'c2');
      const button = screen.getByText('미선택유저').closest('button');
      expect(button?.className).not.toContain('bg-blue-50 ');
    });
  });

  // ─── 읽지 않은 메시지 뱃지 ───────────────────────────────────────────

  describe('읽지 않은 메시지 뱃지', () => {
    it('has_unread=true 이면 안읽음 도트가 표시된다', () => {
      const conv = createConversation({
        id: 'c1',
        has_unread: true,
        other_user: { id: 'u1', name: '안읽음유저', role: 'OPS_ADMIN' },
      });
      renderList([conv]);
      const button = screen.getByText('안읽음유저').closest('button');
      const dot = button?.querySelector('.bg-blue-500');
      expect(dot).toBeTruthy();
    });

    it('has_unread=false 이면 안읽음 도트가 표시되지 않는다', () => {
      const conv = createConversation({
        id: 'c1',
        has_unread: false,
        other_user: { id: 'u1', name: '읽음유저', role: 'OPS_ADMIN' },
      });
      renderList([conv]);
      const button = screen.getByText('읽음유저').closest('button');
      const dot = button?.querySelector('.bg-blue-500');
      expect(dot).toBeFalsy();
    });

    it('has_unread=true 이면 이름에 font-semibold 스타일이 적용된다', () => {
      const conv = createConversation({
        id: 'c1',
        has_unread: true,
        other_user: { id: 'u1', name: '굵은이름', role: 'OPS_ADMIN' },
      });
      renderList([conv]);
      const nameEl = screen.getByText('굵은이름');
      expect(nameEl.className).toContain('font-semibold');
    });

    it('has_unread=false 이면 이름에 font-medium 스타일이 적용된다', () => {
      const conv = createConversation({
        id: 'c1',
        has_unread: false,
        other_user: { id: 'u1', name: '보통이름', role: 'OPS_ADMIN' },
      });
      renderList([conv]);
      const nameEl = screen.getByText('보통이름');
      expect(nameEl.className).toContain('font-medium');
    });
  });

  // ─── 이벤트 핸들러 ────────────────────────────────────────────────────

  describe('이벤트 핸들러', () => {
    it('대화 항목 클릭 시 onSelect가 해당 id와 함께 호출된다', async () => {
      const user = userEvent.setup();
      const conv = createConversation({ id: 'c-123', other_user: { id: 'u1', name: '클릭유저', role: 'OPS_ADMIN' } });
      const { onSelect } = renderList([conv]);
      await user.click(screen.getByText('클릭유저'));
      expect(onSelect).toHaveBeenCalledWith('c-123');
    });

    it('새 메시지 버튼 클릭 시 onNewConversation이 호출된다', async () => {
      const user = userEvent.setup();
      const { onNewConversation } = renderList();
      await user.click(screen.getByLabelText('새 메시지'));
      expect(onNewConversation).toHaveBeenCalled();
    });
  });

  // ─── 40자 초과 메시지 트런케이션 ─────────────────────────────────────

  describe('메시지 트런케이션', () => {
    it('40자 이하 메시지는 그대로 표시된다', () => {
      const conv = createConversation({
        last_message: { content: '짧은 메시지', sender_id: 'u1', created_at: '2025-01-15T10:00:00Z' },
      });
      renderList([conv]);
      expect(screen.getByText('짧은 메시지')).toBeInTheDocument();
    });

    it('40자 초과 메시지는 잘려서 "…"가 붙는다', () => {
      const longContent = 'a'.repeat(45);
      const conv = createConversation({
        last_message: { content: longContent, sender_id: 'u1', created_at: '2025-01-15T10:00:00Z' },
      });
      renderList([conv]);
      expect(screen.getByText('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…')).toBeInTheDocument();
    });
  });
});
