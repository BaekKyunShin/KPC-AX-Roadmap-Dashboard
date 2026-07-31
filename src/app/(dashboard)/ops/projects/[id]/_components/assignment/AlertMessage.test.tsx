import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Import ──────────────────────────────────────────────────────────────────

import AlertMessage from './AlertMessage';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AlertMessage', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('메시지 텍스트', () => {
    it('message prop이 렌더링된다', () => {
      render(<AlertMessage message="경고 메시지입니다." />);
      expect(screen.getByText('경고 메시지입니다.')).toBeInTheDocument();
    });

    it('빈 문자열 message도 렌더링된다', () => {
      render(<AlertMessage message="" />);
      // p 태그가 존재하는지 확인
      expect(document.querySelector('p')).toBeInTheDocument();
    });
  });

  describe('variant별 스타일', () => {
    it('variant가 없으면 기본값 warning으로 amber 스타일이 적용된다', () => {
      render(<AlertMessage message="경고" />);
      const container = screen.getByText('경고').closest('div');
      expect(container?.className).toContain('bg-amber-50');
      expect(container?.className).toContain('border-amber-200');
      expect(container?.className).toContain('text-amber-800');
    });

    it('variant=warning일 때 amber 스타일이 적용된다', () => {
      render(<AlertMessage message="경고 메시지" variant="warning" />);
      const container = screen.getByText('경고 메시지').closest('div');
      expect(container?.className).toContain('bg-amber-50');
      expect(container?.className).toContain('border-amber-200');
    });

    it('variant=error일 때 red 스타일이 적용된다', () => {
      render(<AlertMessage message="에러 메시지" variant="error" />);
      const container = screen.getByText('에러 메시지').closest('div');
      expect(container?.className).toContain('bg-red-50');
      expect(container?.className).toContain('border-red-200');
      expect(container?.className).toContain('text-red-700');
    });
  });

  describe('아이콘 렌더링', () => {
    it('warning variant일 때 WarningIcon이 렌더링된다 (svg 존재)', () => {
      render(<AlertMessage message="경고" variant="warning" />);
      // Icons.tsx의 WarningIcon은 SVG를 렌더링
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('warning variant 아이콘에 amber 색상 클래스가 적용된다', () => {
      render(<AlertMessage message="경고" variant="warning" />);
      const svg = document.querySelector('svg');
      // SVG className은 SVGAnimatedString이므로 getAttribute로 확인
      expect(svg?.getAttribute('class')).toContain('text-amber-500');
    });

    it('error variant 아이콘에 red 색상 클래스가 적용된다', () => {
      render(<AlertMessage message="에러" variant="error" />);
      const svg = document.querySelector('svg');
      // SVG className은 SVGAnimatedString이므로 getAttribute로 확인
      expect(svg?.getAttribute('class')).toContain('text-red-500');
    });
  });

  describe('onDismiss 콜백', () => {
    it('onDismiss가 없으면 닫기 버튼이 렌더링되지 않는다', () => {
      render(<AlertMessage message="경고" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('onDismiss가 있으면 닫기 버튼이 렌더링된다', () => {
      render(<AlertMessage message="경고" onDismiss={mockOnDismiss} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('닫기 버튼 클릭 시 onDismiss가 호출된다', () => {
      render(<AlertMessage message="경고" onDismiss={mockOnDismiss} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnDismiss).toHaveBeenCalledOnce();
    });

    it('warning variant일 때 닫기 버튼에 amber 색상 클래스가 적용된다', () => {
      render(<AlertMessage message="경고" variant="warning" onDismiss={mockOnDismiss} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-amber-600');
    });

    it('error variant일 때 닫기 버튼에 red 색상 클래스가 적용된다', () => {
      render(<AlertMessage message="에러" variant="error" onDismiss={mockOnDismiss} />);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-red-600');
    });
  });
});
