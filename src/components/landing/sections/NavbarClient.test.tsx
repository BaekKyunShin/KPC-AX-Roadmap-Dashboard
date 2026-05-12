import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// Next.js Link mock
import '@/test/helpers/mock-next-link';

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

import NavbarClient from './NavbarClient';

// ============================================================================
// 테스트
// ============================================================================

describe('NavbarClient', () => {
  describe('로고', () => {
    it('로고를 렌더링한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('로고가 홈으로의 링크를 가진다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      const logoLink = screen.getByTestId('logo').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('네비게이션 링크', () => {
    it('"서비스 소개" 링크를 표시한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getAllByText('서비스 소개').length).toBeGreaterThanOrEqual(1);
    });

    it('"워크플로우" 링크를 표시한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getAllByText('워크플로우').length).toBeGreaterThanOrEqual(1);
    });

    it('"데모" 링크를 표시한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getAllByText('데모').length).toBeGreaterThanOrEqual(1);
    });

    it('각 네비게이션 링크가 올바른 앵커 href를 가진다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('#features');
      expect(hrefs).toContain('#workflow');
      expect(hrefs).toContain('#demo');
    });
  });

  describe('CTA 버튼 (비로그인 상태)', () => {
    it('로그인/회원가입 버튼을 표시한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getAllByText('로그인').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('회원가입').length).toBeGreaterThanOrEqual(1);
    });

    it('로그인 버튼이 /login으로의 링크를 가진다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      const loginLinks = screen.getAllByText('로그인').map((el) => el.closest('a'));
      const loginLink = loginLinks.find((a) => a?.getAttribute('href') === '/login');
      expect(loginLink).toBeTruthy();
    });

    it('회원가입 버튼이 /register로의 링크를 가진다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      const registerLinks = screen.getAllByText('회원가입').map((el) => el.closest('a'));
      const registerLink = registerLinks.find((a) => a?.getAttribute('href') === '/register');
      expect(registerLink).toBeTruthy();
    });
  });

  describe('CTA 버튼 (로그인 상태)', () => {
    it('로그인 상태에서 대시보드 버튼을 표시한다', () => {
      render(<NavbarClient isLoggedIn={true} />);
      expect(screen.getAllByText('대시보드').length).toBeGreaterThanOrEqual(1);
    });

    it('dashboardHref 미지정 시 대시보드 버튼이 /dashboard fallback 으로 링크된다', () => {
      render(<NavbarClient isLoggedIn={true} />);
      const dashLinks = screen.getAllByText('대시보드').map((el) => el.closest('a'));
      const dashLink = dashLinks.find((a) => a?.getAttribute('href') === '/dashboard');
      expect(dashLink).toBeTruthy();
    });

    it('OPS_ADMIN dashboardHref (/ops/projects) 가 전달되면 대시보드 버튼이 해당 경로로 링크된다', () => {
      render(<NavbarClient isLoggedIn={true} dashboardHref="/ops/projects" />);
      const dashLinks = screen.getAllByText('대시보드').map((el) => el.closest('a'));
      const dashLink = dashLinks.find((a) => a?.getAttribute('href') === '/ops/projects');
      expect(dashLink).toBeTruthy();
    });

    it('CONSULTANT_APPROVED dashboardHref (/consultant/home) 가 전달되면 대시보드 버튼이 해당 경로로 링크된다', () => {
      render(<NavbarClient isLoggedIn={true} dashboardHref="/consultant/home" />);
      const dashLinks = screen.getAllByText('대시보드').map((el) => el.closest('a'));
      const dashLink = dashLinks.find((a) => a?.getAttribute('href') === '/consultant/home');
      expect(dashLink).toBeTruthy();
    });

    it('로그인 상태에서 로그인/회원가입 버튼이 표시되지 않는다', () => {
      render(<NavbarClient isLoggedIn={true} />);
      expect(screen.queryByText('로그인')).not.toBeInTheDocument();
      expect(screen.queryByText('회원가입')).not.toBeInTheDocument();
    });
  });

  describe('모바일 메뉴 토글', () => {
    it('메뉴 열기 버튼이 존재한다', () => {
      render(<NavbarClient isLoggedIn={false} />);
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });

    it('메뉴 버튼 클릭 시 aria-label이 "메뉴 닫기"로 변경된다', async () => {
      const user = userEvent.setup();
      render(<NavbarClient isLoggedIn={false} />);

      await user.click(screen.getByLabelText('메뉴 열기'));
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });

    it('메뉴 버튼을 두 번 클릭하면 다시 닫힌다 (토글)', async () => {
      const user = userEvent.setup();
      render(<NavbarClient isLoggedIn={false} />);

      await user.click(screen.getByLabelText('메뉴 열기'));
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();

      await user.click(screen.getByLabelText('메뉴 닫기'));
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });

    it('모바일 메뉴 내 네비게이션 링크 클릭 시 메뉴가 닫힌다', async () => {
      const user = userEvent.setup();
      render(<NavbarClient isLoggedIn={false} />);

      await user.click(screen.getByLabelText('메뉴 열기'));
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();

      // mobile-menu 내부의 "#features" 링크 클릭 (desktop/mobile 둘 다 존재하므로 scope로 한정)
      const mobileMenu = screen.getByTestId('mobile-menu');
      const featuresLink = Array.from(mobileMenu.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === '#features',
      );
      expect(featuresLink).toBeTruthy();
      if (featuresLink) await user.click(featuresLink);

      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });
  });

  describe('모바일 메뉴 로그인 상태', () => {
    it('로그인 상태에서 모바일 메뉴에도 대시보드 버튼이 포함된다 (fallback /dashboard)', async () => {
      const user = userEvent.setup();
      render(<NavbarClient isLoggedIn={true} />);

      await user.click(screen.getByLabelText('메뉴 열기'));

      const mobileMenu = screen.getByTestId('mobile-menu');
      const dashLink = Array.from(mobileMenu.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === '/dashboard',
      );
      expect(dashLink).toBeTruthy();
    });

    it('OPS_ADMIN dashboardHref 가 전달되면 모바일 메뉴 대시보드 버튼도 동일 경로로 링크된다', async () => {
      const user = userEvent.setup();
      render(<NavbarClient isLoggedIn={true} dashboardHref="/ops/projects" />);

      await user.click(screen.getByLabelText('메뉴 열기'));

      const mobileMenu = screen.getByTestId('mobile-menu');
      const dashLink = Array.from(mobileMenu.querySelectorAll('a')).find(
        (a) => a.getAttribute('href') === '/ops/projects',
      );
      expect(dashLink).toBeTruthy();
    });
  });
});
