import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('notices/loading.tsx', () => {
  it('실제 page.tsx와 동일한 헤더 제목·설명을 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).toContain('공지사항');
    expect(text).toContain('운영자가 공유한 공지와 양식 파일을 확인합니다.');
  });

  it('animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
