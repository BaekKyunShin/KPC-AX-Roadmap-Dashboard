import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// GSAP mock
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    fromTo: vi.fn(),
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

// Next.js Link mock
import '@/test/helpers/mock-next-link';

// Logo mock
vi.mock('@/components/ui/logo', () => ({
  Logo: ({ height }: { height?: number }) => (
    <div data-testid="footer-logo" data-height={height}>Logo</div>
  ),
}));

// Button mock
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

// cn mock
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Toast mock
vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
}));

// Dialog mock (간단한 passthrough)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

// FooterCredit mock
vi.mock('@/components/ui/FooterCredit', () => ({
  FooterCredit: ({ className }: { className?: string }) => (
    <div data-testid="footer-credit" className={className}>FooterCredit</div>
  ),
}));

import FooterSection from './FooterSection';

// ============================================================================
// 테스트
// ============================================================================

describe('FooterSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CTA 섹션', () => {
    it('"지금 시작하세요" 제목을 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('지금 시작하세요')).toBeInTheDocument();
    });

    it('"서비스 이용하기" 버튼을 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('서비스 이용하기')).toBeInTheDocument();
    });

    it('"데모 살펴보기" 버튼을 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('데모 살펴보기')).toBeInTheDocument();
    });

    it('서비스 이용하기 버튼이 /register 링크를 가진다', () => {
      render(<FooterSection />);
      const registerLink = screen.getByText('서비스 이용하기').closest('a');
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('데모 살펴보기 버튼이 #demo 앵커를 가진다', () => {
      render(<FooterSection />);
      const demoLink = screen.getByText('데모 살펴보기').closest('a');
      expect(demoLink).toHaveAttribute('href', '#demo');
    });
  });

  describe('푸터 로고 및 설명', () => {
    it('로고를 렌더링한다', () => {
      render(<FooterSection />);
      expect(screen.getByTestId('footer-logo')).toBeInTheDocument();
    });

    it('서비스 설명 텍스트를 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText(/기업 AI 교육 진단/)).toBeInTheDocument();
    });
  });

  describe('Product 링크', () => {
    it('"Product" 섹션 제목을 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('Product')).toBeInTheDocument();
    });

    it('서비스 소개 링크를 표시한다', () => {
      render(<FooterSection />);
      const links = screen.getAllByText('서비스 소개');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('워크플로우 링크를 표시한다', () => {
      render(<FooterSection />);
      const links = screen.getAllByText('워크플로우');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('데모 링크를 표시한다', () => {
      render(<FooterSection />);
      const links = screen.getAllByText('데모');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('외부 링크', () => {
    it('"Links" 섹션 제목을 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('Links')).toBeInTheDocument();
    });

    it('KPC 홈페이지 링크를 표시한다', () => {
      render(<FooterSection />);
      expect(screen.getByText('KPC 홈페이지')).toBeInTheDocument();
    });

    it('KPC 홈페이지 링크가 올바른 URL을 가진다', () => {
      render(<FooterSection />);
      const kpcLink = screen.getByText('KPC 홈페이지').closest('a');
      expect(kpcLink).toHaveAttribute('href', 'https://www.kpc.or.kr');
    });

    it('KPC 홈페이지 링크가 새 탭에서 열린다', () => {
      render(<FooterSection />);
      const kpcLink = screen.getByText('KPC 홈페이지').closest('a');
      expect(kpcLink).toHaveAttribute('target', '_blank');
      expect(kpcLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('문의하기 버튼을 표시한다', () => {
      render(<FooterSection />);
      // Dialog mock에 의해 trigger 버튼 텍스트 + DialogTitle 둘 다 "문의하기"가 나올 수 있음
      const matches = screen.getAllByText('문의하기');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('저작권', () => {
    it('FooterCredit 컴포넌트를 렌더링한다', () => {
      render(<FooterSection />);
      expect(screen.getByTestId('footer-credit')).toBeInTheDocument();
    });
  });
});
