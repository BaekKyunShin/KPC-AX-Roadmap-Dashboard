import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateEmailNotifySetting = vi.fn();
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('../actions', () => ({
  updateEmailNotifySetting: (...args: unknown[]) => mockUpdateEmailNotifySetting(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

import React from 'react';
import EmailNotifyToggle from './EmailNotifyToggle';

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('EmailNotifyToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEmailNotifySetting.mockResolvedValue({ success: true });
  });

  describe('기본 렌더링', () => {
    it('"메시지 알림 설정" 카드 제목이 표시된다', () => {
      render(<EmailNotifyToggle initialEnabled={false} />);
      expect(screen.getByText('메시지 알림 설정')).toBeInTheDocument();
    });

    it('토글 스위치가 표시된다', () => {
      render(<EmailNotifyToggle initialEnabled={false} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeInTheDocument();
    });

    it('initialEnabled가 false이면 토글이 꺼진 상태이다', () => {
      render(<EmailNotifyToggle initialEnabled={false} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
    });

    it('initialEnabled가 true이면 토글이 켜진 상태이다', () => {
      render(<EmailNotifyToggle initialEnabled={true} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
    });
  });

  describe('토글 On/Off', () => {
    it('토글 클릭 시 updateEmailNotifySetting이 호출된다', async () => {
      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));
      await waitFor(() => {
        expect(mockUpdateEmailNotifySetting).toHaveBeenCalledTimes(1);
      });
    });

    it('꺼진 상태에서 클릭 시 updateEmailNotifySetting(true)가 호출된다', async () => {
      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));
      await waitFor(() => {
        expect(mockUpdateEmailNotifySetting).toHaveBeenCalledWith(true);
      });
    });

    it('켜진 상태에서 클릭 시 updateEmailNotifySetting(false)가 호출된다', async () => {
      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={true} />);
      await user.click(screen.getByRole('switch'));
      await waitFor(() => {
        expect(mockUpdateEmailNotifySetting).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('낙관적 업데이트', () => {
    it('꺼진 상태에서 클릭하면 즉시 켜진 상태로 바뀐다', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateEmailNotifySetting.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();

      await user.click(toggle);

      // 낙관적 업데이트: 즉시 checked 상태로 변경
      expect(screen.getByRole('switch')).toBeChecked();

      // 서버 응답 완료
      await act(async () => {
        resolveUpdate!({ success: true });
      });
    });

    it('켜진 상태에서 클릭하면 즉시 꺼진 상태로 바뀐다', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateEmailNotifySetting.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={true} />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();

      await user.click(toggle);

      // 낙관적 업데이트: 즉시 unchecked 상태로 변경
      expect(screen.getByRole('switch')).not.toBeChecked();

      await act(async () => {
        resolveUpdate!({ success: true });
      });
    });
  });

  describe('성공 처리', () => {
    it('활성화 성공 시 성공 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));
      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '알림 설정 변경',
          '이메일 알림이 활성화되었습니다.'
        );
      });
    });

    it('비활성화 성공 시 성공 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={true} />);
      await user.click(screen.getByRole('switch'));
      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          '알림 설정 변경',
          '이메일 알림이 비활성화되었습니다.'
        );
      });
    });
  });

  describe('롤백 (서버 실패)', () => {
    it('서버 에러 시 원래 상태로 롤백된다', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateEmailNotifySetting.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);

      await user.click(screen.getByRole('switch'));
      // 낙관적: 켜짐
      expect(screen.getByRole('switch')).toBeChecked();

      // 서버 실패
      await act(async () => {
        resolveUpdate!({ success: false, error: '설정 변경에 실패했습니다.' });
      });

      // 롤백: 꺼짐 상태로 복구
      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });
    });

    it('서버 에러 시 에러 토스트가 표시된다', async () => {
      mockUpdateEmailNotifySetting.mockResolvedValue({
        success: false,
        error: '설정 변경에 실패했습니다.',
      });

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '설정 변경 실패',
          '설정 변경에 실패했습니다.'
        );
      });
    });

    it('네트워크 오류 시 원래 상태로 롤백된다', async () => {
      mockUpdateEmailNotifySetting.mockRejectedValue(new Error('Network'));

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={true} />);

      await user.click(screen.getByRole('switch'));

      // 롤백: true 상태로 복구
      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeChecked();
      });
    });

    it('네트워크 오류 시 에러 토스트가 표시된다', async () => {
      mockUpdateEmailNotifySetting.mockRejectedValue(new Error('Network'));

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('설정 변경 실패', expect.any(String));
      });
    });
  });

  describe('업데이트 중 상태', () => {
    it('업데이트 중에 토글이 비활성화된다', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateEmailNotifySetting.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));

      // 업데이트 중에 disabled 상태
      expect(screen.getByRole('switch')).toBeDisabled();

      await act(async () => {
        resolveUpdate!({ success: true });
      });

      // 업데이트 완료 후 활성화
      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeDisabled();
      });
    });

    it('업데이트 중에 로딩 스피너가 표시된다', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateEmailNotifySetting.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      const user = userEvent.setup();
      render(<EmailNotifyToggle initialEnabled={false} />);
      await user.click(screen.getByRole('switch'));

      // Loader2 아이콘 확인 (animate-spin 클래스)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();

      await act(async () => {
        resolveUpdate!({ success: true });
      });

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeTruthy();
      });
    });
  });
});
