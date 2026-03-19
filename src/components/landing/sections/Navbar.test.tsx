import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// Supabase mock
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// Next.js Link mock
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Logo mock
vi.mock('@/components/ui/logo', () => ({
  Logo: ({ height }: { height?: number }) => (
    <div data-testid="logo" data-height={height}>Logo</div>
  ),
}));

// Button mock (기본 passthrough)
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

import Navbar from './Navbar';

// ============================================================================
// 테스트
// ============================================================================

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  describe('로고', () => {
    it('로고를 렌더링한다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getByTestId('logo')).toBeInTheDocument();
      });
    });

    it('로고가 홈으로의 링크를 가진다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        const logoLink = screen.getByTestId('logo').closest('a');
        expect(logoLink).toHaveAttribute('href', '/');
      });
    });
  });

  describe('네비게이션 링크', () => {
    it('"서비스 소개" 링크를 표시한다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getAllByText('서비스 소개').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('"워크플로우" 링크를 표시한다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getAllByText('워크플로우').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('"데모" 링크를 표시한다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getAllByText('데모').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('각 네비게이션 링크가 올바른 앵커 href를 가진다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        const hrefs = links.map((l) => l.getAttribute('href'));
        expect(hrefs).toContain('#features');
        expect(hrefs).toContain('#workflow');
        expect(hrefs).toContain('#demo');
      });
    });
  });

  describe('CTA 버튼 (비로그인 상태)', () => {
    it('인증 확인 후 로그인/회원가입 버튼을 표시한다', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getAllByText('로그인').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('회원가입').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('로그인 버튼이 /login으로의 링크를 가진다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        const loginLinks = screen.getAllByText('로그인').map((el) => el.closest('a'));
        const loginLink = loginLinks.find((a) => a?.getAttribute('href') === '/login');
        expect(loginLink).toBeTruthy();
      });
    });

    it('회원가입 버튼이 /register로의 링크를 가진다', async () => {
      render(<Navbar />);
      await waitFor(() => {
        const registerLinks = screen.getAllByText('회원가입').map((el) => el.closest('a'));
        const registerLink = registerLinks.find((a) => a?.getAttribute('href') === '/register');
        expect(registerLink).toBeTruthy();
      });
    });
  });

  describe('CTA 버튼 (로그인 상태)', () => {
    it('로그인 상태에서 대시보드 버튼을 표시한다', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      render(<Navbar />);
      await waitFor(() => {
        expect(screen.getAllByText('대시보드').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('대시보드 버튼이 /dashboard로의 링크를 가진다', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      render(<Navbar />);
      await waitFor(() => {
        const dashLinks = screen.getAllByText('대시보드').map((el) => el.closest('a'));
        const dashLink = dashLinks.find((a) => a?.getAttribute('href') === '/dashboard');
        expect(dashLink).toBeTruthy();
      });
    });
  });

  describe('모바일 메뉴 토글', () => {
    it('메뉴 열기 버튼이 존재한다', () => {
      render(<Navbar />);
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });

    it('메뉴 버튼 클릭 시 aria-label이 "메뉴 닫기"로 변경된다', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      await user.click(screen.getByLabelText('메뉴 열기'));
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });
  });
});
