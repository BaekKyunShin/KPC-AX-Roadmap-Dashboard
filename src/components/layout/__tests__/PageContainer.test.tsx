import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PageContainer } from '../PageContainer';

describe('PageContainer', () => {
  it('children 을 max-w-5xl mx-auto 래퍼 안에 렌더한다', () => {
    const { container, getByText } = render(<PageContainer>안녕</PageContainer>);
    expect(getByText('안녕')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('max-w-5xl', 'mx-auto');
  });

  it('반응형 좌우 패딩 클래스를 적용한다 (px-4 sm:px-6 lg:px-8)', () => {
    const { container } = render(<PageContainer>x</PageContainer>);
    expect(container.firstChild).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
  });

  it('세로 섹션 간격 클래스를 적용한다 (space-y-8)', () => {
    const { container } = render(<PageContainer>x</PageContainer>);
    expect(container.firstChild).toHaveClass('space-y-8');
  });

  it('className props 를 기본 클래스에 병합한다', () => {
    const { container } = render(<PageContainer className="bg-red-100">x</PageContainer>);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('max-w-5xl');
    expect(root).toHaveClass('bg-red-100');
  });
});
