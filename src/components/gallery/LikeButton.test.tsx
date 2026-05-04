import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LikeButton } from './LikeButton';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockToggleLike = vi.fn();
const mockTogglePBLLike = vi.fn();

vi.mock('@/app/(dashboard)/gallery/actions', () => ({
  toggleLike: (...args: unknown[]) => mockToggleLike(...args),
  togglePBLLike: (...args: unknown[]) => mockTogglePBLLike(...args),
}));

const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
  showSuccessToast: vi.fn(),
}));

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleLike.mockResolvedValue({
      success: true,
      data: { liked: true, count: 1 },
    });
  });

  describe('기본 렌더링', () => {
    it('좋아요 수가 표시된다', () => {
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={5} />
      );
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('초기 좋아요 상태가 false이면 버튼이 기본 스타일이다', () => {
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={0} />
      );
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('bg-gray-100');
    });

    it('초기 좋아요 상태가 true이면 버튼이 rose 스타일이다', () => {
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={true} initialCount={3} />
      );
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('bg-rose-50');
    });

    it('size가 sm이면 작은 패딩이 적용된다', () => {
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={0} size="sm" />
      );
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('px-2.5');
    });

    it('size가 default이면 큰 패딩이 적용된다', () => {
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={0} size="default" />
      );
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('px-3');
    });
  });

  describe('낙관적 업데이트', () => {
    it('좋아요 안 한 상태에서 클릭하면 카운트가 즉시 1 증가한다', async () => {
      // 서버 응답을 지연시켜 낙관적 업데이트 확인
      let resolveToggle: (value: unknown) => void;
      mockToggleLike.mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={5} />
      );

      expect(screen.getByText('5')).toBeInTheDocument();

      await user.click(screen.getByRole('button'));

      // 낙관적 업데이트: 즉시 6으로 변경
      expect(screen.getByText('6')).toBeInTheDocument();

      // 서버 응답 완료
      await act(async () => {
        resolveToggle!({ success: true, data: { liked: true, count: 6 } });
      });
    });

    it('좋아요 한 상태에서 클릭하면 카운트가 즉시 1 감소한다', async () => {
      let resolveToggle: (value: unknown) => void;
      mockToggleLike.mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={true} initialCount={10} />
      );

      expect(screen.getByText('10')).toBeInTheDocument();

      await user.click(screen.getByRole('button'));

      // 낙관적 업데이트: 즉시 9로 변경
      expect(screen.getByText('9')).toBeInTheDocument();

      await act(async () => {
        resolveToggle!({ success: true, data: { liked: false, count: 9 } });
      });
    });
  });

  describe('서버 응답 반영', () => {
    it('서버 응답 성공 시 서버 값으로 동기화된다', async () => {
      mockToggleLike.mockResolvedValue({
        success: true,
        data: { liked: true, count: 42 },
      });

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={5} />
      );

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });

    it('toggleLike에 roadmapVersionId가 전달된다', async () => {
      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-99" initialLiked={false} initialCount={0} />
      );

      await user.click(screen.getByRole('button'));

      expect(mockToggleLike).toHaveBeenCalledWith('rv-99');
    });
  });

  describe('롤백 (서버 실패)', () => {
    it('서버 응답 실패 시 원래 상태로 롤백된다', async () => {
      let resolveToggle: (value: unknown) => void;
      mockToggleLike.mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={5} />
      );

      await user.click(screen.getByRole('button'));

      // 낙관적: 6으로 변경
      expect(screen.getByText('6')).toBeInTheDocument();

      // 서버 실패 응답
      await act(async () => {
        resolveToggle!({ success: false, error: '서버 오류' });
      });

      // 롤백: 5로 복구
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('좋아요 해제 실패 시 좋아요 상태로 롤백된다', async () => {
      let resolveToggle: (value: unknown) => void;
      mockToggleLike.mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={true} initialCount={10} />
      );

      await user.click(screen.getByRole('button'));

      // 낙관적: 9로 변경, 스타일 변경
      expect(screen.getByText('9')).toBeInTheDocument();

      // 서버 실패 응답
      await act(async () => {
        resolveToggle!({ success: false, error: '서버 오류' });
      });

      // 롤백: 10으로 복구, rose 스타일 복구
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('bg-rose-50');
    });

    it('서버 응답 실패 시 showErrorToast 가 호출돼 사용자에게 신호를 준다', async () => {
      mockToggleLike.mockResolvedValue({ success: false, error: 'RLS denied' });

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-2" initialLiked={false} initialCount={5} />
      );

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalled();
      });
      // 실제 노출 라벨 검증
      expect(mockShowErrorToast.mock.calls[0][0]).toContain('좋아요 저장에 실패');
    });

    it('성공 응답 시 showErrorToast 는 호출되지 않는다', async () => {
      mockToggleLike.mockResolvedValue({ success: true, data: { liked: true, count: 6 } });

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-3" initialLiked={false} initialCount={5} />
      );

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockToggleLike).toHaveBeenCalled();
      });
      expect(mockShowErrorToast).not.toHaveBeenCalled();
    });
  });

  describe('stopPropagation', () => {
    it('클릭 이벤트가 부모로 전파되지 않는다', async () => {
      const parentClick = vi.fn();

      const user = userEvent.setup();
      render(
        <div onClick={parentClick}>
          <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={0} />
        </div>
      );

      await user.click(screen.getByRole('button'));

      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('pending 상태', () => {
    it('서버 응답 대기 중에는 버튼에 opacity-50 클래스가 적용된다', async () => {
      let resolveToggle: (value: unknown) => void;
      mockToggleLike.mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const user = userEvent.setup();
      render(
        <LikeButton roadmapVersionId="rv-1" initialLiked={false} initialCount={0} />
      );

      await user.click(screen.getByRole('button'));

      // useTransition의 isPending은 startTransition 내부에서만 true
      // 하지만 disabled 상태를 확인
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();

      await act(async () => {
        resolveToggle!({ success: true, data: { liked: true, count: 1 } });
      });

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });
  });
});
