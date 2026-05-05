import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('dashboard/messages/loading.tsx', () => {
  it('실제 page.tsx와 동일한 헤더 제목·설명을 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).toContain('메시지');
    expect(text).toContain('멤버에게 메시지를 보내보세요.');
  });

  it('animate-pulse 또는 animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    const hasSkeleton =
      container.querySelector('.animate-shimmer') !== null ||
      container.querySelector('.animate-pulse') !== null;
    expect(hasSkeleton).toBe(true);
  });
});
