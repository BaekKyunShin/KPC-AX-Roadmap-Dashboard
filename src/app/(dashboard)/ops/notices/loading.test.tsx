import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('ops/notices/loading.tsx', () => {
  it('실제 page.tsx와 동일한 헤더 제목·설명을 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).toContain('공지 관리');
    expect(text).toContain('컨설턴트와 공유할 공지·양식 파일을 관리합니다.');
  });

  it('animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
