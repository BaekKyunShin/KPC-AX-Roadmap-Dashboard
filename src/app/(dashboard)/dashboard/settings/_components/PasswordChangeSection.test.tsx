import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockChangePassword = vi.fn();
const mockShowErrorToast = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('@/app/(auth)/actions', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

vi.mock('@/components/ui/field-error', () => ({
  FieldError: ({ message }: { message?: string }) =>
    message ? <p role="alert">{message}</p> : null,
}));

import React from 'react';
import PasswordChangeSection from './PasswordChangeSection';

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('PasswordChangeSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangePassword.mockResolvedValue({ success: true });
  });

  describe('기본 렌더링', () => {
    it('"비밀번호 변경" 카드 제목이 표시된다', () => {
      render(<PasswordChangeSection />);
      // 카드 제목과 버튼 두 군데에 있으므로 getAllByText 사용
      const elements = screen.getAllByText('비밀번호 변경');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('현재 비밀번호 입력 필드가 표시된다', () => {
      render(<PasswordChangeSection />);
      expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument();
    });

    it('새 비밀번호 입력 필드가 표시된다', () => {
      render(<PasswordChangeSection />);
      expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
    });

    it('새 비밀번호 확인 입력 필드가 표시된다', () => {
      render(<PasswordChangeSection />);
      expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument();
    });

    it('"비밀번호 변경" 제출 버튼이 표시된다', () => {
      render(<PasswordChangeSection />);
      expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument();
    });

    it('모든 입력 필드의 타입이 기본적으로 password이다', () => {
      render(<PasswordChangeSection />);
      const passwordInputs = screen.getAllByDisplayValue('');
      passwordInputs.forEach((input) => {
        if (input.tagName === 'INPUT') {
          expect(input).toHaveAttribute('type', 'password');
        }
      });
    });
  });

  describe('비밀번호 보기 토글', () => {
    it('눈 아이콘 버튼이 각 필드에 표시된다', () => {
      render(<PasswordChangeSection />);
      // 3개의 PasswordField가 있으므로 3개의 토글 버튼
      const toggleButtons = screen.getAllByRole('button', { name: '' });
      // 토글 버튼들이 존재 (버튼 타입이 button인 것들 중 텍스트 없는 것)
      expect(toggleButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('현재 비밀번호 필드 토글 클릭 시 text 타입으로 바뀐다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      const inputs = document.querySelectorAll('input[type="password"]');
      const firstInput = inputs[0] as HTMLInputElement;
      // 해당 input 옆의 toggle 버튼 찾기
      const toggleBtn = firstInput.parentElement?.querySelector('button[type="button"]');
      expect(toggleBtn).toBeTruthy();
      await user.click(toggleBtn!);
      expect(firstInput).toHaveAttribute('type', 'text');
    });
  });

  describe('유효성 검증 (클라이언트)', () => {
    it('현재 비밀번호를 입력하지 않으면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(screen.getByText('현재 비밀번호를 입력해주세요.')).toBeInTheDocument();
      });
    });

    it('새 비밀번호가 8자 미만이면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'abc1');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(screen.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeInTheDocument();
      });
    });

    it('새 비밀번호에 영문자가 없으면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), '12345678');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(screen.getByText('비밀번호에 영문자가 포함되어야 합니다.')).toBeInTheDocument();
      });
    });

    it('새 비밀번호에 숫자가 없으면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'currentpass');
      await user.type(screen.getByLabelText('새 비밀번호'), 'abcdefghi');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(screen.getByText('비밀번호에 숫자가 포함되어야 합니다.')).toBeInTheDocument();
      });
    });

    it('새 비밀번호가 현재 비밀번호와 같으면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'current123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(
          screen.getByText('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
        ).toBeInTheDocument();
      });
    });

    it('새 비밀번호 확인이 일치하지 않으면 에러가 표시된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'differentPass1');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
      });
    });

    it('유효성 에러 시 showErrorToast가 호출된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalled();
      });
    });
  });

  describe('성공 처리', () => {
    it('비밀번호 변경 성공 시 로그인 페이지로 이동 (router.replace) — 세션 무효화 대응', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login?password-changed=1');
      });
    });

    it('changePassword에 올바른 인수가 전달된다', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith('current123', 'newPass123', 'newPass123');
      });
    });

    it('실패 응답 시 router.replace 호출되지 않는다', async () => {
      mockChangePassword.mockResolvedValue({
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.',
      });
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'wrongPass123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(
          screen.getByText('현재 비밀번호가 올바르지 않습니다.')
        ).toBeInTheDocument();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('서버 에러 처리', () => {
    it('서버 에러 응답 시 에러 메시지가 표시된다', async () => {
      mockChangePassword.mockResolvedValue({
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.',
      });
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'wrongPass123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(
          screen.getByText('현재 비밀번호가 올바르지 않습니다.')
        ).toBeInTheDocument();
      });
    });

    it('네트워크 오류 시 일반 에러 메시지가 표시된다', async () => {
      mockChangePassword.mockRejectedValue(new Error('Network Error'));
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      await waitFor(() => {
        expect(
          screen.getByText('서버와 통신 중 오류가 발생했습니다.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('로딩 상태', () => {
    it('제출 중에 "변경 중..." 텍스트가 표시된다', async () => {
      let resolveChange: (value: unknown) => void;
      mockChangePassword.mockReturnValue(
        new Promise((resolve) => {
          resolveChange = resolve;
        })
      );
      const user = userEvent.setup();
      render(<PasswordChangeSection />);
      await user.type(screen.getByLabelText('현재 비밀번호'), 'current123');
      await user.type(screen.getByLabelText('새 비밀번호'), 'newPass123');
      await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newPass123');
      await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
      expect(screen.getByText('변경 중...')).toBeInTheDocument();
      resolveChange!({ success: true });
    });
  });
});
