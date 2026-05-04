import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import RootError from './error';

describe('app/error.tsx — 루트 segment error boundary (최후의 방어선)', () => {
  it('"일시적인 오류가 발생했습니다" 안내 + "다시 시도" 버튼이 노출된다', () => {
    render(<RootError error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByText('일시적인 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('"다시 시도" 버튼 클릭 시 reset() 이 호출된다', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<RootError error={new Error('boom')} reset={reset} />);
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
