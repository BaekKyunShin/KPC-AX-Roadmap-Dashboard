/**
 * consultant/home/loading.tsx 회귀 가드.
 *
 * 실제 SummaryCards 는 5개 카드 (lg:grid-cols-5) 이지만 이전 스켈레톤은
 * 4개 카드 (lg:grid-cols-4) 로 lg 화면에서 카드 한 칸이 사라졌다 다시
 * 나타나는 점프가 발생했음.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ConsultantHomeLoading from '../loading';

describe('consultant/home/loading.tsx', () => {
  it('SummaryCards 그리드가 lg:grid-cols-5 클래스를 가진다', () => {
    const { container } = render(<ConsultantHomeLoading />);
    expect(container.querySelector('.lg\\:grid-cols-5')).toBeInTheDocument();
  });

  it('카드 5개(border-l-4)가 렌더된다', () => {
    const { container } = render(<ConsultantHomeLoading />);
    expect(container.querySelectorAll('.border-l-4').length).toBe(5);
  });

  it('lg:grid-cols-4 잔재가 없다', () => {
    const { container } = render(<ConsultantHomeLoading />);
    expect(container.querySelector('.lg\\:grid-cols-4')).not.toBeInTheDocument();
  });
});
