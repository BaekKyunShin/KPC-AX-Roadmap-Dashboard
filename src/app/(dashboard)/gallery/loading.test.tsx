import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('gallery/loading.tsx', () => {
  it('"로드맵 갤러리" 정적 텍스트를 노출하지 않는다 (실제 페이지 헤더와 불일치 방지)', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain('로드맵 갤러리');
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
