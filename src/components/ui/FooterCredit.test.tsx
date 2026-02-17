import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { FooterCredit } from './FooterCredit';

describe('FooterCredit', () => {
  it('저작권 텍스트를 표시한다', () => {
    render(<FooterCredit />);
    expect(screen.getByText(/© 2026 KPC 한국생산성본부/)).toBeInTheDocument();
  });

  it('개발자 이름을 표시한다', () => {
    render(<FooterCredit />);
    expect(screen.getByText(/Baek Kyun Shin/)).toBeInTheDocument();
  });

  it('기본 상태에서 "Developed by" 텍스트를 표시한다', () => {
    render(<FooterCredit />);
    expect(screen.getByText(/Developed by/)).toBeInTheDocument();
  });

  it('호버 시 "Crafted with" 텍스트로 전환된다', async () => {
    const user = userEvent.setup();
    render(<FooterCredit />);

    const creditArea = screen.getByTestId('footer-credit-interactive');
    await user.hover(creditArea);

    expect(screen.getByText(/Crafted with/)).toBeInTheDocument();
  });

  it('호버 시 하트 아이콘이 표시된다', async () => {
    const user = userEvent.setup();
    render(<FooterCredit />);

    const creditArea = screen.getByTestId('footer-credit-interactive');
    await user.hover(creditArea);

    expect(screen.getByTestId('footer-credit-heart')).toBeInTheDocument();
  });

  it('호버 해제 시 기본 상태로 복귀한다', async () => {
    const user = userEvent.setup();
    render(<FooterCredit />);

    const creditArea = screen.getByTestId('footer-credit-interactive');

    // 호버
    await user.hover(creditArea);
    expect(screen.getByText(/Crafted with/)).toBeInTheDocument();

    // 호버 해제
    await user.unhover(creditArea);
    expect(screen.getByText(/Developed by/)).toBeInTheDocument();
  });

  it('className prop으로 추가 스타일을 적용할 수 있다', () => {
    render(<FooterCredit className="custom-class" />);
    const container = screen.getByTestId('footer-credit');
    expect(container).toHaveClass('custom-class');
  });
});
