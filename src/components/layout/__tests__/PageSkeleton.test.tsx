import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageSkeleton } from '../PageSkeleton';

describe('PageSkeleton', () => {
  it('role="status" 와 aria-busy 를 제공한다', () => {
    render(<PageSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('기본으로 3개 섹션을 렌더한다', () => {
    const { container } = render(<PageSkeleton />);
    const sections = container.querySelectorAll('.rounded-lg.border.p-6');
    expect(sections).toHaveLength(3);
  });

  it('sections props 로 개수를 커스터마이즈할 수 있다', () => {
    const { container } = render(<PageSkeleton sections={5} />);
    const sections = container.querySelectorAll('.rounded-lg.border.p-6');
    expect(sections).toHaveLength(5);
  });
});
