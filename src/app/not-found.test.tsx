import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import NotFound from './not-found';

describe('NotFound (404 페이지)', () => {
  it('404 상태 코드를 표시한다', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('페이지를 찾을 수 없다는 메시지를 표시한다', () => {
    render(<NotFound />);
    expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument();
  });

  it('홈으로 돌아가는 링크를 제공한다', () => {
    render(<NotFound />);
    const homeLink = screen.getByRole('link', { name: /홈으로 돌아가기/ });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
