import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionSkeleton } from '../SectionSkeleton';

describe('SectionSkeleton', () => {
  it('role="status" 와 aria-busy 를 제공한다', () => {
    render(<SectionSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('기본으로 4 라인을 렌더한다', () => {
    const { container } = render(<SectionSkeleton />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines).toHaveLength(4);
  });

  it('lines props 로 개수를 커스터마이즈할 수 있다', () => {
    const { container } = render(<SectionSkeleton lines={7} />);
    expect(container.querySelectorAll('.h-4')).toHaveLength(7);
  });
});
