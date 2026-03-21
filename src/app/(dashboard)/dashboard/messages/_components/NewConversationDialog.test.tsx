import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

const mockFetchAvailableRecipients = vi.fn();
const mockCreateConversation = vi.fn();

vi.mock('../actions', () => ({
  fetchAvailableRecipients: (...args: unknown[]) => mockFetchAvailableRecipients(...args),
  createConversation: (...args: unknown[]) => mockCreateConversation(...args),
}));

const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// Dialog를 순수 상태 기반 mock으로 대체
vi.mock('@/components/ui/dialog', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  function Dialog({ children, open }: { children: React.ReactNode; open?: boolean }) {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'dialog' }, children);
  }

  function DialogContent({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'dialog-content' }, children);
  }

  function DialogHeader({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  }

  function DialogTitle({ children }: { children: React.ReactNode }) {
    return React.createElement('h2', null, children);
  }

  return { Dialog, DialogContent, DialogHeader, DialogTitle };
});

// =============================================================================
// Import
// =============================================================================

import NewConversationDialog from './NewConversationDialog';
import type { RecipientGroup } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function createGroup(overrides: Partial<RecipientGroup> = {}): RecipientGroup {
  return {
    role: 'OPS_ADMIN',
    role_label: '운영관리자',
    users: [
      { id: 'u1', name: '김운영' },
      { id: 'u2', name: '이운영' },
    ],
    ...overrides,
  };
}

function renderDialog({
  open = true,
  onOpenChange = vi.fn(),
  onCreated = vi.fn(),
} = {}) {
  render(
    <NewConversationDialog
      open={open}
      onOpenChange={onOpenChange}
      onCreated={onCreated}
    />,
  );
  return { onOpenChange, onCreated };
}

// =============================================================================
// 테스트
// =============================================================================

describe('NewConversationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [] });
    mockCreateConversation.mockResolvedValue({ success: true, data: { conversationId: 'conv-new' } });
  });

  // ─── 다이얼로그 열기/닫기 ────────────────────────────────────────────

  describe('다이얼로그 열기/닫기', () => {
    it('open=true 이면 다이얼로그가 표시된다', async () => {
      renderDialog({ open: true });
      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });
    });

    it('open=false 이면 다이얼로그가 표시되지 않는다', () => {
      renderDialog({ open: false });
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('다이얼로그 제목 "새 메시지"가 표시된다', async () => {
      renderDialog();
      await waitFor(() => {
        expect(screen.getByText('새 메시지')).toBeInTheDocument();
      });
    });

    it('open=true 로 변경될 때 fetchAvailableRecipients가 호출된다', async () => {
      renderDialog({ open: true });
      await waitFor(() => {
        expect(mockFetchAvailableRecipients).toHaveBeenCalled();
      });
    });

    it('open=false 일 때 fetchAvailableRecipients가 호출되지 않는다', () => {
      renderDialog({ open: false });
      expect(mockFetchAvailableRecipients).not.toHaveBeenCalled();
    });
  });

  // ─── 로딩 상태 ──────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('수신자 로드 중 스켈레톤이 표시된다', async () => {
      let resolve!: (value: unknown) => void;
      mockFetchAvailableRecipients.mockReturnValue(new Promise((r) => { resolve = r; }));

      renderDialog();

      // 로딩 중 스켈레톤 확인
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);

      // cleanup
      resolve({ success: true, data: [] });
      await waitFor(() => {
        expect(document.querySelectorAll('.animate-pulse').length).toBe(0);
      });
    });
  });

  // ─── 수신자 목록 렌더링 ──────────────────────────────────────────────

  describe('수신자 목록 렌더링', () => {
    it('그룹 역할 라벨이 표시된다', async () => {
      const group = createGroup({ role: 'OPS_ADMIN', role_label: '운영관리자' });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        // 그룹 헤더 span (text-gray-500)이 하나 이상 있어야 함
        const labels = screen.getAllByText('운영관리자');
        expect(labels.length).toBeGreaterThan(0);
        // 그룹 헤더 라벨(uppercase tracking-wider)이 존재하는지 확인
        const headerLabel = labels.find((el) => el.className.includes('uppercase'));
        expect(headerLabel).toBeTruthy();
      });
    });

    it('사용자 이름이 표시된다', async () => {
      const group = createGroup({
        users: [{ id: 'u1', name: '박컨설턴트' }],
      });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('박컨설턴트')).toBeInTheDocument();
      });
    });

    it('여러 그룹의 사용자가 모두 표시된다', async () => {
      const groups = [
        createGroup({ role: 'OPS_ADMIN', role_label: '운영관리자', users: [{ id: 'u1', name: '운영자A' }] }),
        createGroup({ role: 'CONSULTANT_APPROVED', role_label: '컨설턴트', users: [{ id: 'u2', name: '컨설턴트B' }] }),
      ];
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: groups });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('운영자A')).toBeInTheDocument();
        expect(screen.getByText('컨설턴트B')).toBeInTheDocument();
      });
    });

    it('수신자가 없으면 "메시지를 보낼 수 있는 사용자가 없습니다" 텍스트가 표시된다', async () => {
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('메시지를 보낼 수 있는 사용자가 없습니다')).toBeInTheDocument();
      });
    });
  });

  // ─── 수신자 검색 ────────────────────────────────────────────────────

  describe('수신자 검색', () => {
    it('검색 입력창이 표시된다', async () => {
      renderDialog();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('이름으로 검색...')).toBeInTheDocument();
      });
    });

    it('검색어를 입력하면 해당 이름만 표시된다', async () => {
      const user = userEvent.setup();
      const group = createGroup({
        users: [
          { id: 'u1', name: '홍길동' },
          { id: 'u2', name: '김철수' },
        ],
      });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('이름으로 검색...'), '홍');

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
        expect(screen.queryByText('김철수')).not.toBeInTheDocument();
      });
    });

    it('검색 결과가 없으면 "검색 결과가 없습니다" 텍스트가 표시된다', async () => {
      const user = userEvent.setup();
      const group = createGroup({ users: [{ id: 'u1', name: '홍길동' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('이름으로 검색...'), '없는이름');

      await waitFor(() => {
        expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
      });
    });
  });

  // ─── 대화 생성 ──────────────────────────────────────────────────────

  describe('대화 생성', () => {
    it('사용자 클릭 시 createConversation이 해당 userId와 함께 호출된다', async () => {
      const user = userEvent.setup();
      const group = createGroup({ users: [{ id: 'target-user-1', name: '선택될유저' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('선택될유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('선택될유저'));

      expect(mockCreateConversation).toHaveBeenCalledWith('target-user-1');
    });

    it('대화 생성 성공 시 onCreated가 conversationId와 함께 호출된다', async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      const group = createGroup({ users: [{ id: 'u1', name: '성공유저' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });
      mockCreateConversation.mockResolvedValue({ success: true, data: { conversationId: 'conv-abc' } });

      renderDialog({ onCreated });

      await waitFor(() => {
        expect(screen.getByText('성공유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('성공유저'));

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith('conv-abc');
      });
    });

    it('대화 생성 실패 시 showErrorToast가 호출된다', async () => {
      const user = userEvent.setup();
      const group = createGroup({ users: [{ id: 'u1', name: '실패유저' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });
      mockCreateConversation.mockResolvedValue({ success: false, error: '권한이 없습니다.' });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('실패유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('실패유저'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('메시지 생성 실패', '권한이 없습니다.');
      });
    });

    it('생성 중 "메시지 준비 중..." 텍스트가 표시된다', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (value: unknown) => void;
      mockCreateConversation.mockReturnValue(new Promise((r) => { resolveCreate = r; }));

      const group = createGroup({ users: [{ id: 'u1', name: '준비중유저' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('준비중유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('준비중유저'));

      expect(screen.getByText('메시지 준비 중...')).toBeInTheDocument();

      // cleanup
      resolveCreate({ success: true, data: { conversationId: 'conv-1' } });
    });

    it('생성 중에는 사용자 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      let resolveCreate!: (value: unknown) => void;
      mockCreateConversation.mockReturnValue(new Promise((r) => { resolveCreate = r; }));

      const group = createGroup({ users: [{ id: 'u1', name: '비활유저' }] });
      mockFetchAvailableRecipients.mockResolvedValue({ success: true, data: [group] });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('비활유저')).toBeInTheDocument();
      });

      await user.click(screen.getByText('비활유저'));

      const btn = screen.getByText('비활유저').closest('button');
      expect(btn).toBeDisabled();

      // cleanup
      resolveCreate({ success: true, data: { conversationId: 'conv-1' } });
    });
  });
});
