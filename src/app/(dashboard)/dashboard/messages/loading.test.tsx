import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('dashboard/messages/loading.tsx', () => {
  it('"메시지" 정적 텍스트를 노출하지 않는다 (cross-route 누출 방지)', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain('메시지');
  });

  it('animate-shimmer 또는 animate-pulse 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    const hasSkeleton =
      container.querySelector('.animate-shimmer') !== null ||
      container.querySelector('.animate-pulse') !== null;
    expect(hasSkeleton).toBe(true);
  });
});
