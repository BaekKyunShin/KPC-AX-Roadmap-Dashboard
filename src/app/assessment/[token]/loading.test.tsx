import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('assessment/[token]/loading.tsx', () => {
  it('빈 화면 대신 스켈레톤 윤곽을 노출한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('실제 페이지 레이아웃을 미러링하는 max-w-lg 컨테이너를 갖는다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
  });

  it('정적 텍스트 ("기업 진단", "자가진단" 등)를 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('기업 진단');
    expect(text).not.toContain('자가진단');
  });
});
