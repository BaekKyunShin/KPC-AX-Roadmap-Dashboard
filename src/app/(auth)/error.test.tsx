import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import AuthError from './error';

describe('(auth)/error.tsx — 인증 영역 segment error boundary', () => {
  it('"일시적인 오류가 발생했습니다" 안내 + "다시 시도" 버튼이 노출된다', () => {
    render(<AuthError error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByText('일시적인 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('"다시 시도" 버튼 클릭 시 reset() 이 호출된다', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<AuthError error={new Error('boom')} reset={reset} />);
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('error.digest 가 있을 때 오류 코드를 노출한다', () => {
    const err = Object.assign(new Error('with digest'), { digest: 'abc-123' });
    render(<AuthError error={err} reset={vi.fn()} />);
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });
});
