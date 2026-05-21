import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshButton } from './RefreshButton';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe('RefreshButton', () => {
  it('버튼 클릭 시 router.refresh 호출 (풀 페이지 리로드 대신)', async () => {
    mockRefresh.mockClear();
    const user = userEvent.setup();

    render(<RefreshButton />);
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('"다시 시도" 라벨과 RefreshCw 아이콘 노출', () => {
    render(<RefreshButton />);
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
  });
});
