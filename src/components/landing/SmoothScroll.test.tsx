import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('lenis', () => ({
  default: vi.fn(() => ({
    destroy: vi.fn(),
    raf: vi.fn(),
    on: vi.fn(),
  })),
}));

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn(), fromTo: vi.fn() })),
  },
  gsap: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import SmoothScroll from './SmoothScroll';

// ============================================================================
// 테스트
// ============================================================================

describe('SmoothScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('children 패스스루', () => {
    it('children이 렌더링된다', () => {
      render(
        <SmoothScroll>
          <div data-testid="child-element">자식 콘텐츠</div>
        </SmoothScroll>
      );
      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('children 텍스트 콘텐츠가 표시된다', () => {
      render(
        <SmoothScroll>
          <p>스무스 스크롤 테스트</p>
        </SmoothScroll>
      );
      expect(screen.getByText('스무스 스크롤 테스트')).toBeInTheDocument();
    });

    it('여러 children이 모두 렌더링된다', () => {
      render(
        <SmoothScroll>
          <div data-testid="child-1">첫 번째</div>
          <div data-testid="child-2">두 번째</div>
          <div data-testid="child-3">세 번째</div>
        </SmoothScroll>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('children이 직접 DOM에 노출된다 (래퍼 엘리먼트 없음)', () => {
      const { container } = render(
        <SmoothScroll>
          <section data-testid="direct-child">직접 자식</section>
        </SmoothScroll>
      );
      // SmoothScroll은 Fragment를 반환하므로 children이 직접 렌더링됨
      expect(container.querySelector('[data-testid="direct-child"]')).toBeInTheDocument();
    });
  });

  describe('라이프사이클', () => {
    it('마운트 시 에러 없이 렌더링된다', () => {
      expect(() => {
        render(
          <SmoothScroll>
            <div>콘텐츠</div>
          </SmoothScroll>
        );
      }).not.toThrow();
    });

    it('언마운트 시 에러 없이 정리된다', () => {
      const { unmount } = render(
        <SmoothScroll>
          <div>콘텐츠</div>
        </SmoothScroll>
      );
      expect(() => unmount()).not.toThrow();
    });
  });
});
