import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RegenerateAccordion } from './RegenerateAccordion';

describe('RegenerateAccordion', () => {
  it('초기 접힘 상태, 트리거 클릭 시 펼쳐짐', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('textarea에 rows 속성이 충분히 크게 설정', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    const ta = await screen.findByRole('textbox');
    expect(Number(ta.getAttribute('rows'))).toBeGreaterThanOrEqual(6);
  });

  it('입력 시 onChange, 생성 시작 클릭 시 onSubmit 호출', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <RegenerateAccordion
        value={'기존 프롬프트'}
        onChange={onChange}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    await userEvent.type(screen.getByRole('textbox'), 'X');
    expect(onChange).toHaveBeenLastCalledWith('기존 프롬프트X');
    await userEvent.click(screen.getByRole('button', { name: /생성 시작/ }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('isLoading=true이면 생성 시작 버튼 비활성화', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    expect(screen.getByRole('button', { name: /생성 중|생성 시작/ })).toBeDisabled();
  });

  it('disabled prop 적용 시 트리거 버튼 disabled', () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: /새 버전 생성/ })).toBeDisabled();
  });

  it('aria-expanded가 초기 false, 클릭 후 true로 전환', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    const trigger = screen.getByRole('button', { name: /새 버전 생성/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
