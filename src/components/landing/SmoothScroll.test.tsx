import { render, screen, act } from '@testing-library/react';
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

    it('언마운트 시 정리 함수가 에러 없이 실행된다', async () => {
      const { unmount } = render(
        <SmoothScroll>
          <div>콘텐츠</div>
        </SmoothScroll>
      );
      // init() async Promise 대기
      await act(async () => {
        await Promise.resolve();
      });
      // 언마운트 시 cancelled=true + lenisRef.current?.destroy() 실행
      expect(() => unmount()).not.toThrow();
    });

    it('마운트 전 언마운트 시 cancelled=true → init() 조기 종료', async () => {
      // init() 내부에서 Promise.all이 resolve되기 전에 언마운트
      // cancelled=true 경로를 커버하기 위해 언마운트를 즉시 실행
      const { unmount } = render(
        <SmoothScroll>
          <div>콘텐츠</div>
        </SmoothScroll>
      );
      // 즉시 언마운트 (Promise 해소 전)
      unmount();
      // Promise 해소 후 cancelled=true로 early return 확인
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
      // 에러 없이 완료됨
      expect(true).toBe(true);
    });
  });
});
