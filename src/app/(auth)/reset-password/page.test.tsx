/**
 * reset-password page 테스트
 *
 * - 토큰 검증 중(checking) → 정상 세션(ready) 으로 전환되면 폼 노출
 * - getUser 가 null 이면 "링크가 유효하지 않습니다" 화면
 * - done=1 진입 시 완료 메시지 + "로그인 페이지로" 버튼
 * - 폼 제출 → setNewPasswordWithToken 호출
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSetNewPasswordWithToken = vi.fn();
vi.mock('../actions', () => ({
  setNewPasswordWithToken: (...args: unknown[]) => mockSetNewPasswordWithToken(...args),
}));

const mockGetUser = vi.fn();
const mockSetSession = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      signOut: () => mockSignOut(),
    },
  }),
}));

const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
vi.mock('@/lib/utils', () => ({
  showErrorToast: (...args: unknown[]) => mockShowError(...args),
  showSuccessToast: (...args: unknown[]) => mockShowSuccess(...args),
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

const searchParamsState: { value: string } = { value: '' };
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

import ResetPasswordPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsState.value = '';
  // 기본은 정상 세션
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'u@ex.com' } } });
  mockSetSession.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue(undefined);
});

describe('ResetPasswordPage — 정상 세션 폼', () => {
  it('세션 확인 후 비밀번호 입력 폼을 렌더한다', async () => {
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '새 비밀번호 설정' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/새 비밀번호/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호 확인/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비밀번호 재설정' })).toBeInTheDocument();
  });

  it('폼 제출 → setNewPasswordWithToken 호출', async () => {
    mockSetNewPasswordWithToken.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '비밀번호 재설정' })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/새 비밀번호/), 'NewPass1!');
    await user.type(screen.getByLabelText(/비밀번호 확인/), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    await waitFor(() => {
      expect(mockSetNewPasswordWithToken).toHaveBeenCalledWith('NewPass1!', 'NewPass1!');
    });
  });

  it('Server Action 실패 → 에러 메시지 노출', async () => {
    mockSetNewPasswordWithToken.mockResolvedValueOnce({
      success: false,
      error: '재설정 링크가 만료되었거나 유효하지 않습니다. 메일을 다시 요청해주세요.',
    });
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '비밀번호 재설정' })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/새 비밀번호/), 'NewPass1!');
    await user.type(screen.getByLabelText(/비밀번호 확인/), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    await waitFor(() => {
      expect(screen.getByText(/재설정 링크/)).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordPage — 토큰 무효', () => {
  it('getUser 가 null 이면 안내 + 비밀번호 찾기 다시 시도 링크', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '링크가 유효하지 않습니다' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: '비밀번호 찾기 다시 시도' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인으로 돌아가기' })).toBeInTheDocument();
  });
});

describe('ResetPasswordPage — done=1 완료 화면', () => {
  beforeEach(() => {
    searchParamsState.value = 'done=1';
  });

  it('완료 메시지와 로그인 페이지로 버튼을 렌더한다', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: '비밀번호가 재설정되었습니다' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인 페이지로/ })).toBeInTheDocument();
  });
});
