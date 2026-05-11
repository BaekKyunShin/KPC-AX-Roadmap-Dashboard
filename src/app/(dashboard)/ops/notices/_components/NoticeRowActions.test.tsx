import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Server Actions
const mockTogglePinAction = vi.fn();
const mockDeleteNoticeAction = vi.fn();

vi.mock('@/app/(dashboard)/ops/notices/actions', () => ({
  togglePinAction: (...args: unknown[]) => mockTogglePinAction(...args),
  deleteNoticeAction: (...args: unknown[]) => mockDeleteNoticeAction(...args),
}));

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

// useTransition: 즉시 실행
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useTransition: () => [false, (fn: () => void | Promise<void>) => fn()],
  };
});

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { NoticeRowActions } from './NoticeRowActions';

// =============================================================================
// 테스트
// =============================================================================

describe('NoticeRowActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------
  describe('렌더링', () => {
    it('고정되지 않은 공지에서 "상단 고정" 버튼이 렌더링된다', () => {
      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );
      expect(screen.getByLabelText('상단 고정')).toBeInTheDocument();
    });

    it('고정된 공지에서 "상단 고정 해제" 버튼이 렌더링된다', () => {
      render(
        <NoticeRowActions noticeId="notice-1" isPinned={true} title="테스트 공지" />,
      );
      expect(screen.getByLabelText('상단 고정 해제')).toBeInTheDocument();
    });

    it('편집 링크가 올바른 href로 렌더링된다', () => {
      render(
        <NoticeRowActions noticeId="notice-123" isPinned={false} title="테스트 공지" />,
      );
      const editLink = screen.getByLabelText('편집');
      expect(editLink).toHaveAttribute('href', '/ops/notices/notice-123/edit');
    });

    it('삭제 버튼이 렌더링된다', () => {
      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );
      expect(screen.getByLabelText('삭제')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 핀 토글
  // ---------------------------------------------------------------------------
  describe('핀 토글', () => {
    it('고정 버튼 클릭 시 togglePinAction(noticeId, true)가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePinAction.mockResolvedValue({ success: true });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('상단 고정'));

      await waitFor(() => {
        expect(mockTogglePinAction).toHaveBeenCalledWith('notice-1', true);
      });
    });

    it('고정 해제 버튼 클릭 시 togglePinAction(noticeId, false)가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePinAction.mockResolvedValue({ success: true });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={true} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('상단 고정 해제'));

      await waitFor(() => {
        expect(mockTogglePinAction).toHaveBeenCalledWith('notice-1', false);
      });
    });

    it('핀 토글 성공 시 성공 토스트와 router.refresh가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePinAction.mockResolvedValue({ success: true });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('상단 고정'));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('상단 고정되었습니다.');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('핀 토글 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockTogglePinAction.mockResolvedValue({ success: false, error: '권한 없음' });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('상단 고정'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('상태 변경 실패', '권한 없음');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 삭제 (ConfirmDialog 흐름)
  // ---------------------------------------------------------------------------
  describe('삭제', () => {
    it('휴지통 트리거 클릭 시 ConfirmDialog 가 열린다', async () => {
      const user = userEvent.setup();

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      // 다이얼로그가 열리기 전에는 제목이 노출되지 않는다
      expect(screen.queryByText('공지를 삭제하시겠습니까?')).not.toBeInTheDocument();

      // 트리거(휴지통 아이콘 버튼) 클릭
      await user.click(screen.getByLabelText('삭제'));

      // 다이얼로그 제목이 노출된다
      expect(
        await screen.findByText('공지를 삭제하시겠습니까?'),
      ).toBeInTheDocument();
    });

    it('다이얼로그 취소 시 deleteNoticeAction이 호출되지 않는다', async () => {
      const user = userEvent.setup();

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      // 트리거 클릭 → 다이얼로그 오픈
      await user.click(screen.getByLabelText('삭제'));

      // 다이얼로그 안의 "취소" 버튼 클릭
      const cancelButton = await screen.findByRole('button', { name: '취소' });
      await user.click(cancelButton);

      expect(mockDeleteNoticeAction).not.toHaveBeenCalled();
    });

    it('다이얼로그 "삭제" 확인 후 deleteNoticeAction(noticeId)가 호출된다', async () => {
      const user = userEvent.setup();
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      // 트리거 클릭 → 다이얼로그 오픈
      await user.click(screen.getByLabelText('삭제'));

      // 다이얼로그 안의 "삭제" 액션 버튼 클릭
      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteNoticeAction).toHaveBeenCalledWith('notice-1');
      });
    });

    it('삭제 성공 시 성공 토스트와 router.refresh가 호출된다', async () => {
      const user = userEvent.setup();
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('삭제'));

      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('공지가 삭제되었습니다.');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('삭제 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockDeleteNoticeAction.mockResolvedValue({ success: false, error: '삭제 불가' });

      render(
        <NoticeRowActions noticeId="notice-1" isPinned={false} title="테스트 공지" />,
      );

      await user.click(screen.getByLabelText('삭제'));

      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('삭제 실패', '삭제 불가');
      });
    });
  });
});
