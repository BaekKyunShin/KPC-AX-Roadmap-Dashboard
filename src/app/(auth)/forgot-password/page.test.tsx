/**
 * forgot-password page 테스트
 *
 * - 입력 폼 렌더 + "비밀번호 찾기" 헤더, "재설정 메일 받기" 버튼
 * - 빈 이메일 제출 시 인라인 에러 + Server Action 미호출
 * - 정상 이메일 → requestPasswordReset 호출, sent=1 화면 전환
 * - sent=1 진입 시 완료 안내 + "다시 보내기" 버튼 노출
 * - 로그인으로 돌아가기 링크 노출
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRequestPasswordReset = vi.fn();
vi.mock('../actions', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
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

import ForgotPasswordPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsState.value = '';
});

describe('ForgotPasswordPage — 입력 화면', () => {
  it('헤더 텍스트와 폼 요소를 렌더한다', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: '비밀번호 찾기' })).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재설정 메일 받기' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인으로 돌아가기/ })).toBeInTheDocument();
  });

  it('빈 이메일 제출 시 Server Action 미호출 + 토스트 노출', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.click(screen.getByRole('button', { name: '재설정 메일 받기' }));

    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  it('정상 이메일 → requestPasswordReset 호출 + 성공 토스트', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('이메일'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: '재설정 메일 받기' }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
    });
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it('Server Action 실패 → 에러 메시지 노출', async () => {
    mockRequestPasswordReset.mockResolvedValueOnce({
      success: false,
      error: '이메일 전송 한도를 초과했습니다.',
    });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('이메일'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: '재설정 메일 받기' }));

    await waitFor(() => {
      expect(screen.getByText(/이메일 전송 한도/)).toBeInTheDocument();
    });
    expect(mockShowError).toHaveBeenCalled();
  });
});

describe('ForgotPasswordPage — sent=1 완료 화면', () => {
  beforeEach(() => {
    searchParamsState.value = 'sent=1';
  });

  it('완료 헤더와 다시 보내기 버튼을 렌더한다', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: '메일을 보냈습니다' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다시 보내기/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인으로 돌아가기/ })).toBeInTheDocument();
  });
});
