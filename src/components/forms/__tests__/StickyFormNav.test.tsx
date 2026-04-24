import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickyFormNav } from '../StickyFormNav';

describe('StickyFormNav', () => {
  it('이전·다음·저장 3개 버튼을 기본 렌더한다', () => {
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '이전 스텝' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 스텝' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수동 저장' })).toBeInTheDocument();
  });

  it('isFirstStep=true 이면 이전 버튼이 disabled 된다', () => {
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        isFirstStep
      />,
    );
    expect(screen.getByRole('button', { name: '이전 스텝' })).toBeDisabled();
  });

  it('isLastStep=true 이면 다음 버튼이 disabled 된다', () => {
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        isLastStep
      />,
    );
    expect(screen.getByRole('button', { name: '다음 스텝' })).toBeDisabled();
  });

  it('이전 버튼 클릭 시 onPrev 를 호출한다', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(
      <StickyFormNav
        onPrev={onPrev}
        onNext={() => {}}
        onSave={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: '이전 스텝' }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('다음 버튼 클릭 시 onNext 를 호출한다', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={onNext}
        onSave={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: '다음 스텝' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('저장 버튼 클릭 시 onSave 를 호출한다', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole('button', { name: '수동 저장' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('isSaving=true 이면 저장 버튼에 spinner 표시 + 모든 버튼 disabled', () => {
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        isSaving
      />,
    );
    const saveButton = screen.getByRole('button', { name: '수동 저장' });
    expect(saveButton).toBeDisabled();
    expect(saveButton.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.getByRole('button', { name: '이전 스텝' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 스텝' })).toBeDisabled();
  });

  it('saveIndicator prop 이 있으면 저장 상태 인디케이터를 렌더한다', () => {
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        saveIndicator="자동 저장됨"
      />,
    );
    expect(screen.getByText('자동 저장됨')).toBeInTheDocument();
  });

  it('isLastStep=true 이고 submit prop 이 있으면 다음 대신 submit 버튼이 렌더된다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        isLastStep
        submit={{ label: '최종 제출', onSubmit }}
      />,
    );
    // 다음 버튼은 렌더되지 않음 (submit 으로 교체)
    expect(screen.queryByRole('button', { name: '다음 스텝' })).not.toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: '최종 제출' });
    await user.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('className prop 이 root 에 cn() 으로 합성된다', () => {
    const { container } = render(
      <StickyFormNav
        onPrev={() => {}}
        onNext={() => {}}
        onSave={() => {}}
        className="custom-nav"
      />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/sticky/);
    expect(root.className).toMatch(/bottom-0/);
    expect(root.className).toMatch(/custom-nav/);
  });
});
