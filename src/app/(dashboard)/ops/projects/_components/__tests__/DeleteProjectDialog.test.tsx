import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteProjectDialog } from '../DeleteProjectDialog';

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
      screen.getByText(/'테스트 주식회사' 기업의 프로젝트를 삭제하시겠습니까/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/관련된 데이터는 모두 삭제되며 되돌릴 수 없습니다/),
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
});
