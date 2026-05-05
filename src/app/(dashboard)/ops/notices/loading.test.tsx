import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('ops/notices/loading.tsx', () => {
  it('"공지 관리" 정적 텍스트를 노출하지 않는다 (cross-route 누출 방지)', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain('공지 관리');
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
