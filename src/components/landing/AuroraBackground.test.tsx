import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { AuroraBackground } from './AuroraBackground';

// ============================================================================
// 테스트
// ============================================================================

describe('AuroraBackground', () => {
  describe('기본 렌더링', () => {
    it('컴포넌트가 렌더링된다', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('aria-hidden 속성이 true로 설정된다', () => {
      const { container } = render(<AuroraBackground />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('visible prop', () => {
    it('기본값(visible=true)일 때 opacity-100 클래스가 적용된다', () => {
      const { container } = render(<AuroraBackground />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('opacity-100');
    });

    it('visible=true일 때 opacity-100 클래스가 적용된다', () => {
      const { container } = render(<AuroraBackground visible={true} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('opacity-100');
    });

    it('visible=false일 때 opacity-0 클래스가 적용된다', () => {
      const { container } = render(<AuroraBackground visible={false} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('opacity-0');
    });
  });

  describe('className prop', () => {
    it('추가 className이 전달되면 클래스에 포함된다', () => {
      const { container } = render(<AuroraBackground className="custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('custom-class');
    });

    it('className 없이도 정상 렌더링된다', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('내부 레이어', () => {
    it('aurora 효과 내부 div 레이어가 존재한다', () => {
      const { container } = render(<AuroraBackground />);
      const innerDiv = container.querySelector('div > div');
      expect(innerDiv).toBeInTheDocument();
    });
  });
});
