import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefreshButton } from './RefreshButton';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// 이 단위 테스트가 "다시 시도" 동작의 **유일한 안전망**이다.
// 같은 것을 검증하던 `e2e/scroll-ux/ops-users-refresh-button.spec.ts` 는 삭제했다 —
// 버튼은 `ops/users/page.tsx` 의 **DB 조회 실패 분기**에서만 렌더되고 그 조회는 서버
// admin 클라이언트라 Playwright 로 가로챌 수 없어, E2E 로는 영구 skip 이었다.
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
