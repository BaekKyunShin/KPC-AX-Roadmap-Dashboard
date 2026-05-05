import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('dashboard/loading.tsx', () => {
  it('"로딩 중..." spinner+텍스트 fallback을 사용하지 않는다', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain('로딩 중');
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다 (PendingApprovalCard 윤곽)', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('max-w-2xl 컨테이너로 PendingApprovalCard 폭을 미러링한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
  });
});
