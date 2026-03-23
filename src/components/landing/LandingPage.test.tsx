import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹 — 하위 섹션 컴포넌트 경량 모킹
// ============================================================================

vi.mock('./SmoothScroll', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="smooth-scroll">{children}</div>
  ),
}));

vi.mock('./sections/Navbar', () => ({
  default: () => <header><nav data-testid="navbar">Navbar</nav></header>,
}));

vi.mock('./sections/HeroSection', () => ({
  default: () => <section data-testid="hero-section">HeroSection</section>,
}));

vi.mock('./sections/FeaturesSection', () => ({
  default: () => <section data-testid="features-section">FeaturesSection</section>,
}));

vi.mock('./sections/WorkflowSection', () => ({
  default: () => <section data-testid="workflow-section">WorkflowSection</section>,
}));

vi.mock('./sections/DemoSection', () => ({
  default: () => <section data-testid="demo-section">DemoSection</section>,
}));

vi.mock('./sections/FooterSection', () => ({
  default: () => <footer data-testid="footer-section">FooterSection</footer>,
}));

import LandingPage from './LandingPage';

// ============================================================================
// 테스트
// ============================================================================

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('LandingPage가 렌더링된다', () => {
      render(<LandingPage />);
      const wrapper = document.querySelector('.landing-page');
      expect(wrapper).toBeInTheDocument();
    });

    it('SmoothScroll 래퍼가 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('smooth-scroll')).toBeInTheDocument();
    });
  });

  describe('섹션 컴포넌트 조합', () => {
    it('Navbar가 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('HeroSection이 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    });

    it('FeaturesSection이 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('features-section')).toBeInTheDocument();
    });

    it('WorkflowSection이 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('workflow-section')).toBeInTheDocument();
    });

    it('DemoSection이 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('demo-section')).toBeInTheDocument();
    });

    it('FooterSection이 렌더링된다', () => {
      render(<LandingPage />);
      expect(screen.getByTestId('footer-section')).toBeInTheDocument();
    });
  });

  describe('레이아웃 구조', () => {
    it('main 태그가 존재한다', () => {
      render(<LandingPage />);
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('main 태그가 SmoothScroll 내부에 위치한다', () => {
      render(<LandingPage />);
      const smoothScroll = screen.getByTestId('smooth-scroll');
      const main = smoothScroll.querySelector('main');
      expect(main).toBeInTheDocument();
    });
  });
});
