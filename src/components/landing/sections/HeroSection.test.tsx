import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// GSAP 동적 import mock (useEntranceAnimation 내부 await import('gsap'))
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      play: vi.fn(),
    })),
  },
  gsap: {
    to: vi.fn(),
    from: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn(), refresh: vi.fn() },
}));

// AuroraBackground mock
vi.mock('../AuroraBackground', () => ({
  AuroraBackground: ({ visible }: { visible: boolean }) => (
    <div data-testid="aurora-background" data-visible={visible} />
  ),
}));

// LogoBadge mock
vi.mock('@/components/ui/logo', () => ({
  LogoBadge: () => <div data-testid="logo-badge">LogoBadge</div>,
}));

// Next.js Link mock
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Button mock
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

import HeroSection from './HeroSection';

// ============================================================================
// 테스트
// ============================================================================

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('기본 렌더링', () => {
    it('HeroSection이 렌더링된다', () => {
      render(<HeroSection />);
      // section 요소가 있어야 함
      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('LogoBadge를 렌더링한다', () => {
      render(<HeroSection />);
      expect(screen.getByTestId('logo-badge')).toBeInTheDocument();
    });

    it('AuroraBackground를 렌더링한다', () => {
      render(<HeroSection />);
      expect(screen.getByTestId('aurora-background')).toBeInTheDocument();
    });

    it('스크롤 인디케이터 텍스트가 표시된다', () => {
      render(<HeroSection />);
      expect(screen.getByText('스크롤하여 더 알아보기')).toBeInTheDocument();
    });
  });

  describe('타이핑 효과', () => {
    it('초기에는 타이핑 커서가 표시된다', () => {
      render(<HeroSection />);
      // 타이핑 진행 중에는 커서(animate-blink)가 표시됨
      const cursor = document.querySelector('.animate-blink');
      expect(cursor).toBeInTheDocument();
    });

    it('타이핑이 진행되면서 텍스트가 채워진다', async () => {
      render(<HeroSection />);

      // 150ms 간격으로 타이핑됨 - 일부 글자 타이핑 후 확인
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150 * 3);
      });

      // h1이 렌더링되어 있고 일부 텍스트가 채워짐
      const heading = document.querySelector('h1');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent?.length).toBeGreaterThan(0);
    });

    it('타이핑 완료 후 전체 제목이 표시된다', async () => {
      render(<HeroSection />);

      // 'AI 훈련의 새로운 기준' = 12글자, 150ms * 12 = 1800ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150 * 20);
      });

      const heading = document.querySelector('h1');
      expect(heading?.textContent).toContain('AI 훈련의 새로운 기준');
    });

    it('타이핑 완료 후 커서가 사라진다', async () => {
      render(<HeroSection />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(150 * 20);
      });

      const cursor = document.querySelector('.animate-blink');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  describe('서브타이틀 텍스트', () => {
    it('서브타이틀 텍스트가 DOM에 존재한다', () => {
      render(<HeroSection />);
      expect(
        screen.getByText(/기업 진단부터 컨설턴트 매칭/)
      ).toBeInTheDocument();
    });
  });

  describe('CTA 버튼 href', () => {
    it('"서비스 이용하기" 버튼이 /register로 연결된다', () => {
      render(<HeroSection />);
      const registerLink = screen.getByText('서비스 이용하기').closest('a');
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('"데모 살펴보기" 버튼이 #demo 앵커로 연결된다', () => {
      render(<HeroSection />);
      const demoLink = screen.getByText('데모 살펴보기').closest('a');
      expect(demoLink).toHaveAttribute('href', '#demo');
    });
  });

  describe('AuroraBackground visible 상태', () => {
    it('타이핑 중에는 AuroraBackground가 visible=false이다', () => {
      render(<HeroSection />);
      const aurora = screen.getByTestId('aurora-background');
      expect(aurora).toHaveAttribute('data-visible', 'false');
    });

    it('타이핑 완료 후 AuroraBackground가 visible=true로 변경된다', async () => {
      render(<HeroSection />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(150 * 20);
      });

      const aurora = screen.getByTestId('aurora-background');
      expect(aurora).toHaveAttribute('data-visible', 'true');
    });
  });
});
