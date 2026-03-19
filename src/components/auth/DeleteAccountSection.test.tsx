import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

const mockDeleteAccount = vi.fn();
vi.mock('@/app/(auth)/actions', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

// AlertDialog를 순수 상태 mock으로 대체
vi.mock('@/components/ui/alert-dialog', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  function AlertDialog({ children, open, onOpenChange }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false);
    React.useEffect(() => {
      if (open !== undefined) setInternalOpen(open);
    }, [open]);

    return (
      <div data-testid="alert-dialog">
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ isOpen: boolean; setOpen: (v: boolean) => void; onOpenChange?: (v: boolean) => void }>, {
                isOpen: internalOpen,
                setOpen: (v: boolean) => {
                  setInternalOpen(v);
                  onOpenChange?.(v);
                },
                onOpenChange,
              })
            : child,
        )}
      </div>
    );
  }

  function AlertDialogTrigger({ children, asChild, isOpen: _isOpen, setOpen, ...props }: {
    children: React.ReactNode;
    asChild?: boolean;
    isOpen?: boolean;
    setOpen?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick: () => void }>, {
        onClick: () => setOpen?.(true),
      });
    }
    return <button onClick={() => setOpen?.(true)} {...props}>{children}</button>;
  }

  function AlertDialogContent({ children, isOpen, setOpen, onOpenChange, ...props }: {
    children: React.ReactNode;
    isOpen?: boolean;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    if (!isOpen) return null;
    return (
      <div role="alertdialog" {...props}>
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ setOpen: (v: boolean) => void; onOpenChange?: (v: boolean) => void }>, { setOpen, onOpenChange })
            : child,
        )}
      </div>
    );
  }

  function AlertDialogHeader({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }
  function AlertDialogTitle({ children }: { children: React.ReactNode }) {
    return <h2>{children}</h2>;
  }
  function AlertDialogDescription({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) {
    return <div>{children}</div>;
  }
  function AlertDialogFooter({ children, setOpen, onOpenChange, ...props }: {
    children: React.ReactNode;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    return (
      <div {...props}>
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ setOpen: (v: boolean) => void; onOpenChange?: (v: boolean) => void }>, { setOpen, onOpenChange })
            : child,
        )}
      </div>
    );
  }
  function AlertDialogCancel({ children, setOpen, onOpenChange, disabled, ...props }: {
    children: React.ReactNode;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) {
    return (
      <button
        onClick={() => {
          setOpen?.(false);
          onOpenChange?.(false);
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
  function AlertDialogAction({ children, onClick, disabled, setOpen: _setOpen, onOpenChange: _onOpenChange, variant: _variant, ...props }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    setOpen?: (v: boolean) => void;
    onOpenChange?: (v: boolean) => void;
    variant?: string;
    [key: string]: unknown;
  }) {
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }

  return {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
  };
});

// =============================================================================
// Import
// =============================================================================

import DeleteAccountSection from './DeleteAccountSection';

// =============================================================================
// 테스트
// =============================================================================

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('계정 삭제 제목을 표시한다', () => {
      render(<DeleteAccountSection />);
      expect(screen.getByText('계정 삭제')).toBeInTheDocument();
    });

    it('계정 삭제 경고 설명을 표시한다', () => {
      render(<DeleteAccountSection />);
      expect(
        screen.getByText(/계정을 삭제하면 모든 개인정보가 영구적으로 삭제되며/),
      ).toBeInTheDocument();
    });

    it('회원 탈퇴 버튼을 표시한다', () => {
      render(<DeleteAccountSection />);
      expect(screen.getByText('회원 탈퇴')).toBeInTheDocument();
    });
  });

  describe('확인 다이얼로그 열기/닫기', () => {
    it('회원 탈퇴 버튼 클릭 시 다이얼로그가 열린다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      expect(screen.getByText('정말 탈퇴하시겠습니까?')).toBeInTheDocument();
    });

    it('다이얼로그에 삭제 항목 리스트를 표시한다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      expect(screen.getByText(/이름, 이메일, 연락처 등 개인정보/)).toBeInTheDocument();
      expect(screen.getByText(/컨설턴트 프로필 정보/)).toBeInTheDocument();
      expect(screen.getByText(/담당 프로젝트 배정 해제/)).toBeInTheDocument();
    });

    it('취소 버튼 클릭 시 다이얼로그가 닫힌다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      expect(screen.getByText('정말 탈퇴하시겠습니까?')).toBeInTheDocument();

      await user.click(screen.getByText('취소'));
      await waitFor(() => {
        expect(screen.queryByText('정말 탈퇴하시겠습니까?')).not.toBeInTheDocument();
      });
    });
  });

  describe('입력 검증', () => {
    it('비밀번호와 확인 텍스트 입력 필드가 존재한다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('현재 비밀번호를 입력하세요')).toBeInTheDocument();
    });

    it('확인 텍스트 입력 없이는 탈퇴하기 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      const deleteBtn = screen.getByText('탈퇴하기');
      expect(deleteBtn).toBeDisabled();
    });

    it('비밀번호만 입력하면 탈퇴하기 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      await user.type(screen.getByPlaceholderText('현재 비밀번호를 입력하세요'), 'password123');
      expect(screen.getByText('탈퇴하기')).toBeDisabled();
    });

    it('비밀번호와 "회원탈퇴" 입력 시 탈퇴하기 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      await user.type(screen.getByPlaceholderText('현재 비밀번호를 입력하세요'), 'password123');
      await user.type(screen.getByPlaceholderText('회원탈퇴'), '회원탈퇴');

      await waitFor(() => {
        expect(screen.getByText('탈퇴하기')).not.toBeDisabled();
      });
    });
  });

  describe('Action 호출', () => {
    it('탈퇴하기 클릭 시 deleteAccount를 호출한다', async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      await user.type(screen.getByPlaceholderText('현재 비밀번호를 입력하세요'), 'mypassword');
      await user.type(screen.getByPlaceholderText('회원탈퇴'), '회원탈퇴');

      await waitFor(() => {
        expect(screen.getByText('탈퇴하기')).not.toBeDisabled();
      });

      await user.click(screen.getByText('탈퇴하기'));

      await waitFor(() => {
        expect(mockDeleteAccount).toHaveBeenCalledWith('mypassword', '회원탈퇴');
      });
    });

    it('deleteAccount 실패 시 에러 메시지를 표시한다', async () => {
      mockDeleteAccount.mockResolvedValue({ success: false, error: '비밀번호가 일치하지 않습니다.' });
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      await user.type(screen.getByPlaceholderText('현재 비밀번호를 입력하세요'), 'wrongpw');
      await user.type(screen.getByPlaceholderText('회원탈퇴'), '회원탈퇴');

      await waitFor(() => {
        expect(screen.getByText('탈퇴하기')).not.toBeDisabled();
      });

      await user.click(screen.getByText('탈퇴하기'));

      await waitFor(() => {
        expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
      });
    });

    it('deleteAccount 성공 시 /login으로 이동한다', async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(<DeleteAccountSection />);

      await user.click(screen.getByText('회원 탈퇴'));
      await user.type(screen.getByPlaceholderText('현재 비밀번호를 입력하세요'), 'mypassword');
      await user.type(screen.getByPlaceholderText('회원탈퇴'), '회원탈퇴');

      await waitFor(() => {
        expect(screen.getByText('탈퇴하기')).not.toBeDisabled();
      });

      await user.click(screen.getByText('탈퇴하기'));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });
});
