import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareToggle } from './ShareToggle';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockToggleShare = vi.fn();
const mockTogglePBLShare = vi.fn();
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/app/(dashboard)/gallery/actions', () => ({
  toggleShare: (...args: unknown[]) => mockToggleShare(...args),
  togglePBLShare: (...args: unknown[]) => mockTogglePBLShare(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('ShareToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleShare.mockResolvedValue({
      success: true,
      data: { isShared: true },
    });
    mockTogglePBLShare.mockResolvedValue({
      success: true,
      data: { isShared: true },
    });
  });

  describe('기본 렌더링', () => {
    it('갤러리에 공유 텍스트가 표시된다', () => {
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);
      expect(screen.getByText('갤러리에 공유')).toBeInTheDocument();
    });

    it('설명 텍스트가 표시된다', () => {
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);
      expect(
        screen.getByText('다른 컨설턴트가 이 로드맵을 열람하고 활용할 수 있습니다.')
      ).toBeInTheDocument();
    });

    it('스위치 역할의 버튼이 존재한다', () => {
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('초기 공유 상태가 false이면 aria-checked가 false이다', () => {
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('초기 공유 상태가 true이면 aria-checked가 true이다', () => {
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={true} />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('토글 동작', () => {
    it('공유 해제 → 공유 토글 시 toggleShare가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-42" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      expect(mockToggleShare).toHaveBeenCalledWith('rv-42');
    });

    // 특성화 — track 을 넘기지 않는 기존 호출부(RoadmapResultClient)가 계속 로드맵
    // 액션을 타는지 고정한다. 기본값이 잘못 바뀌면 로드맵 공유가 PBL 액션을 호출해
    // 조용히 실패하는데, 이 단언이 없으면 아무도 알아채지 못한다.
    it('track 미지정 시 PBL 액션은 호출되지 않는다 (기본값 = 로드맵)', async () => {
      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-42" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      expect(mockToggleShare).toHaveBeenCalledWith('rv-42');
      expect(mockTogglePBLShare).not.toHaveBeenCalled();
    });

    it('토글 성공 시 aria-checked가 업데이트된다', async () => {
      mockToggleShare.mockResolvedValue({
        success: true,
        data: { isShared: true },
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('공유 해제 토글 성공 시 aria-checked가 false로 변경된다', async () => {
      mockToggleShare.mockResolvedValue({
        success: true,
        data: { isShared: false },
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={true} />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      });
    });
  });

  describe('토스트 메시지', () => {
    it('공유 활성화 성공 시 성공 토스트가 표시된다', async () => {
      mockToggleShare.mockResolvedValue({
        success: true,
        data: { isShared: true },
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '공유 설정 변경',
          '갤러리에 공유되었습니다.'
        );
      });
    });

    it('공유 해제 성공 시 해제 토스트가 표시된다', async () => {
      mockToggleShare.mockResolvedValue({
        success: true,
        data: { isShared: false },
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={true} />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '공유 설정 변경',
          '갤러리 공유가 해제되었습니다.'
        );
      });
    });

    it('실패 시 에러 토스트가 표시된다', async () => {
      mockToggleShare.mockResolvedValue({
        success: false,
        error: '권한이 없습니다.',
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('공유 설정 변경 실패', '권한이 없습니다.');
      });
    });
  });

  describe('pending 상태', () => {
    it('서버 응답 대기 중에는 스위치가 비활성화된다', async () => {
      let resolveToggle: (value: unknown) => void;
      mockToggleShare.mockReturnValue(
        new Promise((resolve) => {
          resolveToggle = resolve;
        })
      );

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="rv-1" initialShared={false} />);

      await user.click(screen.getByRole('switch'));

      expect(screen.getByRole('switch')).toBeDisabled();

      await act(async () => {
        resolveToggle!({ success: true, data: { isShared: true } });
      });

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeDisabled();
      });
    });
  });

  // #011 — PBL 결과 화면에서도 같은 컴포넌트를 쓴다. LikeButton 과 동일하게
  // track prop 하나로 대상 액션과 설명 문구만 갈린다(스위치 동작·토스트는 공통).
  describe('PBL 트랙', () => {
    it('track="PBL" 이면 togglePBLShare 가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="pbl-7" initialShared={false} track="PBL" />);

      await user.click(screen.getByRole('switch'));

      expect(mockTogglePBLShare).toHaveBeenCalledWith('pbl-7');
      expect(mockToggleShare).not.toHaveBeenCalled();
    });

    it('PBL 설명 문구가 표시된다', () => {
      render(<ShareToggle roadmapVersionId="pbl-7" initialShared={false} track="PBL" />);

      expect(
        screen.getByText('다른 컨설턴트가 이 PBL 보고서를 열람하고 활용할 수 있습니다.')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('다른 컨설턴트가 이 로드맵을 열람하고 활용할 수 있습니다.')
      ).not.toBeInTheDocument();
    });

    it('제목과 스위치 동작은 로드맵과 동일하다', async () => {
      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="pbl-7" initialShared={false} track="PBL" />);

      expect(screen.getByText('갤러리에 공유')).toBeInTheDocument();

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
      });
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        '공유 설정 변경',
        '갤러리에 공유되었습니다.'
      );
    });

    it('실패 시 에러 토스트가 표시된다', async () => {
      mockTogglePBLShare.mockResolvedValue({
        success: false,
        error: '확정된 PBL 보고서만 공유할 수 있습니다.',
      });

      const user = userEvent.setup();
      render(<ShareToggle roadmapVersionId="pbl-7" initialShared={false} track="PBL" />);

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '공유 설정 변경 실패',
          '확정된 PBL 보고서만 공유할 수 있습니다.'
        );
      });
    });
  });
});
