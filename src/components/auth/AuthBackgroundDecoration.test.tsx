import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { AuthBackgroundDecoration } from './AuthBackgroundDecoration';

// ============================================================================
// 테스트
// ============================================================================

describe('AuthBackgroundDecoration', () => {
  describe('기본 렌더링', () => {
    it('컴포넌트가 렌더링된다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('pointer-events-none을 가진 래퍼 div가 렌더링된다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('pointer-events-none');
    });

    it('두 개의 장식 원형 요소가 렌더링된다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const circles = container.querySelectorAll('.rounded-full');
      expect(circles).toHaveLength(2);
    });
  });

  describe('animated prop', () => {
    it('animated 기본값(false)일 때 animate-pulse 클래스가 없다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const animatedElements = container.querySelectorAll('.animate-pulse');
      expect(animatedElements).toHaveLength(0);
    });

    it('animated=false일 때 animate-pulse 클래스가 없다', () => {
      const { container } = render(<AuthBackgroundDecoration animated={false} />);
      const animatedElements = container.querySelectorAll('.animate-pulse');
      expect(animatedElements).toHaveLength(0);
    });

    it('animated=true일 때 두 원형 요소 모두 animate-pulse 클래스를 가진다', () => {
      const { container } = render(<AuthBackgroundDecoration animated={true} />);
      const animatedElements = container.querySelectorAll('.animate-pulse');
      expect(animatedElements).toHaveLength(2);
    });
  });

  describe('시각 요소 스타일', () => {
    it('파란색 원형 요소가 존재한다 (bg-blue-200)', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const blueCircle = container.querySelector('.bg-blue-200');
      expect(blueCircle).toBeInTheDocument();
    });

    it('인디고 원형 요소가 존재한다 (bg-indigo-200)', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const indigoCircle = container.querySelector('.bg-indigo-200');
      expect(indigoCircle).toBeInTheDocument();
    });

    it('두 원형 요소 모두 blur-3xl 클래스를 가진다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const blurElements = container.querySelectorAll('.blur-3xl');
      expect(blurElements).toHaveLength(2);
    });
  });

  describe('레이아웃', () => {
    it('래퍼가 absolute inset-0 overflow-hidden 클래스를 가진다', () => {
      const { container } = render(<AuthBackgroundDecoration />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('absolute');
      expect(wrapper.className).toContain('inset-0');
      expect(wrapper.className).toContain('overflow-hidden');
    });
  });
});
