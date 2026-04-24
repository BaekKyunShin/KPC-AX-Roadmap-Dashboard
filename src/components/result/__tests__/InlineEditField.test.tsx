import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditField } from '../InlineEditField';

describe('InlineEditField', () => {
  it('view 모드에서 value 를 표시한다', () => {
    render(<InlineEditField value="hello" onSave={vi.fn()} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('value 가 비어있으면 placeholder 를 표시한다', () => {
    render(
      <InlineEditField value="" onSave={vi.fn()} placeholder="입력하세요" />,
    );
    expect(screen.getByText('입력하세요')).toBeInTheDocument();
  });

  it('클릭하면 edit 모드로 전환된다', async () => {
    const user = userEvent.setup();
    render(<InlineEditField value="hi" onSave={vi.fn()} />);
    await user.click(screen.getByText('hi'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('readOnly 면 클릭해도 edit 모드로 가지 않는다', async () => {
    const user = userEvent.setup();
    render(<InlineEditField value="hi" onSave={vi.fn()} readOnly />);
    await user.click(screen.getByText('hi'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('저장 클릭 시 onSave 를 새 값으로 호출하고 view 모드로 돌아간다', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineEditField value="old" onSave={onSave} />);
    await user.click(screen.getByText('old'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'new');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(onSave).toHaveBeenCalledWith('new');
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('저장 실패 시 value 가 롤백되고 error 상태를 표시한다', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('network'));
    render(<InlineEditField value="old" onSave={onSave} />);
    await user.click(screen.getByText('old'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'new');
    await user.click(screen.getByRole('button', { name: '저장' }));
    // 실패 시 edit 모드 유지, localValue 롤백
    await waitFor(() => {
      expect(input).toHaveValue('old');
    });
    // 에러 인디케이터는 view/edit 공통 영역에서 표현되므로, "저장 실패" 텍스트 존재 확인
    expect(await screen.findByText(/저장 실패/)).toBeInTheDocument();
  });
});
