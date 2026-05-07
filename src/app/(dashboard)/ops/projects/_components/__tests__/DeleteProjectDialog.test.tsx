import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteProjectDialog } from '../DeleteProjectDialog';
import type { SimpleActionResult } from '@/lib/types/action-result';

describe('DeleteProjectDialog', () => {
  function setup(overrides: Partial<React.ComponentProps<typeof DeleteProjectDialog>> = {}) {
    const onConfirm = vi.fn().mockResolvedValue({ success: true });
    const props = {
      projectId: 'proj-1',
      companyName: '테스트 주식회사',
      onConfirm,
      ...overrides,
    };
    render(<DeleteProjectDialog {...props} />);
    return { onConfirm };
  }

  it('트리거 버튼에 "삭제" 텍스트가 표시된다', () => {
    setup();
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
  });

  it('트리거 클릭 시 안내 문구와 입력란이 노출된다', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(
      screen.getByText(/'테스트 주식회사' 기업의 프로젝트를 삭제하시겠습니까/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/관련된 데이터는 모두 삭제되며 되돌릴 수 없습니다/)
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('확인 입력이 일치하지 않으면 모달 내 "삭제" 버튼은 비활성화', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: '삭제' }));
    const input = screen.getByRole('textbox');
    await user.type(input, '잘못된 텍스트');
    const confirmBtn = screen.getByRole('button', { name: /삭제 확정/ });
    expect(confirmBtn).toBeDisabled();
  });

  it('정확한 확인 문구 입력 시 "삭제 확정" 버튼이 활성화된다', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: '삭제' }));
    const input = screen.getByRole('textbox');
    await user.type(input, '테스트 주식회사 삭제');
    const confirmBtn = screen.getByRole('button', { name: /삭제 확정/ });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('삭제 확정 클릭 시 onConfirm 이 (projectId, confirmText) 와 함께 호출된다', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.type(screen.getByRole('textbox'), '테스트 주식회사 삭제');
    await user.click(screen.getByRole('button', { name: /삭제 확정/ }));
    expect(onConfirm).toHaveBeenCalledWith('proj-1', '테스트 주식회사 삭제');
  });

  it('삭제 처리 중에는 버튼 텍스트가 "삭제 중..." 으로 바뀌고 비활성화된다', async () => {
    const user = userEvent.setup();
    // onConfirm 을 수동 resolve 가능한 promise 로 만들어 pending 상태를 검증
    let resolveFn: ((value: SimpleActionResult) => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<SimpleActionResult>((resolve) => {
          resolveFn = resolve;
        })
    );
    render(
      <DeleteProjectDialog projectId="proj-1" companyName="테스트 주식회사" onConfirm={onConfirm} />
    );
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.type(screen.getByRole('textbox'), '테스트 주식회사 삭제');
    // pending promise 가 await 를 차단하므로 click 결과를 기다리지 않고 진행
    void user.click(screen.getByRole('button', { name: /삭제 확정/ }));

    // pending 상태: 버튼 라벨이 "삭제 중..." 으로 변경되고 disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /삭제 중/ })).toBeDisabled();
    });

    // 정리: pending promise resolve
    resolveFn?.({ success: true });
  });

  it('삭제 처리 중에는 취소 버튼도 비활성화된다 (이중 동작 차단)', async () => {
    const user = userEvent.setup();
    let resolveFn: ((value: SimpleActionResult) => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<SimpleActionResult>((resolve) => {
          resolveFn = resolve;
        })
    );
    render(
      <DeleteProjectDialog projectId="proj-1" companyName="테스트 주식회사" onConfirm={onConfirm} />
    );
    await user.click(screen.getByRole('button', { name: '삭제' }));
    await user.type(screen.getByRole('textbox'), '테스트 주식회사 삭제');
    void user.click(screen.getByRole('button', { name: /삭제 확정/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    });

    resolveFn?.({ success: true });
  });
});
