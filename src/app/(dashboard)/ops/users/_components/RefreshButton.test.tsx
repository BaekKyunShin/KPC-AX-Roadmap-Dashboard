import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshButton } from './RefreshButton';

describe('RefreshButton', () => {
  it('버튼 클릭 시 window.location.reload 호출', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
      writable: true,
    });
    const user = userEvent.setup();

    render(<RefreshButton />);
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('"다시 시도" 라벨과 RefreshCw 아이콘 노출', () => {
    render(<RefreshButton />);
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
  });
});
