import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
    priority,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-priority={priority ? 'true' : 'false'}
    />
  ),
}));

import { Logo, LogoBadge } from './logo';

// ============================================================================
// 테스트
// ============================================================================

describe('Logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('이미지 요소를 렌더링한다', () => {
      render(<Logo />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('alt 텍스트가 "KPC AI ROADMAP"이다', () => {
      render(<Logo />);
      expect(screen.getByAltText('KPC AI ROADMAP')).toBeInTheDocument();
    });

    it('기본 height(28px)를 적용한다', () => {
      render(<Logo />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('height', '28');
    });

    it('height에 맞는 width를 자동 계산한다 (비율 1000/140)', () => {
      render(<Logo />);
      const img = screen.getByRole('img');
      // height=28, ratio=1000/140 → width = Math.round(28 * 1000/140) = Math.round(200) = 200
      expect(img).toHaveAttribute('width', '200');
    });

    it('기본 priority=true를 적용한다', () => {
      render(<Logo />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-priority', 'true');
    });

    it('h-auto cursor-pointer 클래스를 포함한다', () => {
      render(<Logo />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('h-auto', 'cursor-pointer');
    });
  });

  describe('height prop', () => {
    it('height prop을 전달하면 해당 높이로 렌더링된다', () => {
      render(<Logo height={56} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('height', '56');
    });

    it('height에 비례하여 width가 자동 계산된다', () => {
      render(<Logo height={56} />);
      const img = screen.getByRole('img');
      // height=56, ratio=1000/140 → width = Math.round(56 * 1000/140) = Math.round(400) = 400
      expect(img).toHaveAttribute('width', '400');
    });
  });

  describe('className prop', () => {
    it('커스텀 className을 추가로 적용한다', () => {
      render(<Logo className="my-custom-class" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('my-custom-class');
    });

    it('기존 기본 클래스와 커스텀 className이 함께 적용된다', () => {
      render(<Logo className="extra-class" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('h-auto', 'cursor-pointer', 'extra-class');
    });
  });

  describe('priority prop', () => {
    it('priority=false를 전달하면 적용된다', () => {
      render(<Logo priority={false} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-priority', 'false');
    });
  });
});

describe('LogoBadge', () => {
  describe('기본 렌더링', () => {
    it('로고를 포함하는 배지를 렌더링한다', () => {
      render(<LogoBadge />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('배지 내부에 로고 이미지가 있다', () => {
      render(<LogoBadge />);
      const img = screen.getByAltText('KPC AI ROADMAP');
      expect(img).toBeInTheDocument();
    });

    it('배지 내 로고의 height가 24px이다', () => {
      render(<LogoBadge />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('height', '24');
    });
  });

  describe('className prop', () => {
    it('커스텀 className을 배지 wrapper에 적용한다', () => {
      const { container } = render(<LogoBadge className="badge-custom" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('badge-custom');
    });

    it('기존 기본 클래스(rounded-full 등)와 함께 적용된다', () => {
      const { container } = render(<LogoBadge className="badge-custom" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-full', 'badge-custom');
    });
  });
});
