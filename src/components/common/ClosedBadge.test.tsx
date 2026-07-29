import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClosedBadge } from './ClosedBadge';

describe('ClosedBadge', () => {
  it('"종결" 라벨 텍스트를 표시한다 (색상만으로 의미 전달 금지)', () => {
    render(<ClosedBadge />);
    expect(screen.getByText('종결')).toBeInTheDocument();
  });

  it('정식 확정(emerald/green)과 구분되는 slate 계열 스타일을 사용한다', () => {
    render(<ClosedBadge />);
    const badge = screen.getByText('종결');
    expect(badge.className).toContain('slate');
  });

  it('아이콘은 장식용으로 aria-hidden 처리한다', () => {
    const { container } = render(<ClosedBadge />);
    const icon = container.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('className을 병합한다', () => {
    render(<ClosedBadge className="ml-2" />);
    expect(screen.getByText('종결').className).toContain('ml-2');
  });
});
