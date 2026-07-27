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
    render(<InlineEditField value="" onSave={vi.fn()} placeholder="입력하세요" />);
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

  it('저장 실패 시 사용자 입력은 보존되고 error 상태를 표시한다 (재시도용)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('network'));
    render(<InlineEditField value="old" onSave={onSave} />);
    await user.click(screen.getByText('old'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'new');
    await user.click(screen.getByRole('button', { name: '저장' }));
    // 실패해도 edit 모드 유지 + 사용자 입력 보존 — "다시 시도" 버튼이 같은 값으로 재호출하기 위해
    await waitFor(() => {
      expect(input).toHaveValue('new');
    });
    expect(await screen.findByText(/저장 실패/)).toBeInTheDocument();
  });

  // DoD #4: 박스 입력란 6~7줄 (한글 ≈ 160-190px)
  it('multiline=true 시 textarea 가 min-h-[160px] 을 가진다 (DoD #4)', async () => {
    const user = userEvent.setup();
    render(<InlineEditField value="hi" onSave={vi.fn()} multiline />);
    await user.click(screen.getByText('hi'));
    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.className).toContain('min-h-[160px]');
    expect(textarea.className).toContain('resize-y');
  });

  // 결과 페이지 editFiel 의 textarea 스타일을 테스트 페이지 LargeTextBox 와 시각 일관성 일치
  it('multiline=true 시 textarea 스타일이 LargeTextBox 와 일치한다 (padding/모서리/포커스 링)', async () => {
    const user = userEvent.setup();
    render(<InlineEditField value="hi" onSave={vi.fn()} multiline />);
    await user.click(screen.getByText('hi'));
    const textarea = screen.getByRole('textbox');
    // LargeTextBox(`src/components/forms/LargeTextBox.tsx`) 와 동일해야 하는 항목
    expect(textarea.className).toContain('px-3');
    expect(textarea.className).toContain('py-2');
    expect(textarea.className).toContain('rounded-md');
    expect(textarea.className).toContain('focus-visible:ring-2');
    expect(textarea.className).toContain('focus-visible:ring-ring');
    // 회귀 방지: 변경 전 컴팩트 스타일이 남아있지 않아야 함
    expect(textarea.className).not.toContain('px-2 ');
    expect(textarea.className).not.toContain('py-1');
  });

  it('multiline=false (단일행 input) 은 기존 컴팩트 스타일 유지', async () => {
    const user = userEvent.setup();
    render(<InlineEditField value="hi" onSave={vi.fn()} />);
    await user.click(screen.getByText('hi'));
    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
    // 단일행은 인라인 편집용 컴팩트 스타일 유지 (의도적 차이)
    expect(input.className).toContain('px-2');
    expect(input.className).toContain('py-1');
    expect(input.className).not.toContain('rounded-md');
    expect(input.className).not.toContain('px-3');
    expect(input.className).not.toContain('py-2');
  });

  it('Escape 키 입력 시 편집 취소 (input)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<InlineEditField value="old" onSave={onSave} />);
    await user.click(screen.getByText('old'));
    const input = screen.getByRole('textbox');
    await user.type(input, ' edit');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('multiline + Ctrl+Enter 입력 시 저장', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineEditField value="old" onSave={onSave} multiline />);
    await user.click(screen.getByText('old'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'new');
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).toHaveBeenCalledWith('new');
  });

  it('multiline + 단순 Enter 입력은 저장하지 않음 (줄바꿈으로 처리)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineEditField value="old" onSave={onSave} multiline />);
    await user.click(screen.getByText('old'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'line1');
    await user.keyboard('{Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('savingState 가 root div 의 data-saving-state 속성으로 노출된다 (#2 ResultTabs 연동)', async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    const { container } = render(<InlineEditField value="원본" onSave={onSave} />);

    // idle 상태에서도 마커 존재
    expect(container.querySelector('[data-saving-state="idle"]')).toBeInTheDocument();

    // saving 진입
    await user.click(screen.getByText('원본'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '수정');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(container.querySelector('[data-saving-state="saving"]')).toBeInTheDocument();

    // cleanup
    resolveSave?.();
  });

  describe('error 복구 동선 (#1)', () => {
    it('저장 실패 시 "다시 시도" 버튼이 노출되고 클릭 시 onSave 가 재호출된다', async () => {
      const user = userEvent.setup();
      const onSave = vi
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(undefined);

      render(<InlineEditField value="원본" onSave={onSave} />);

      await user.click(screen.getByText('원본'));
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '수정값');
      await user.click(screen.getByRole('button', { name: '저장' }));

      expect(await screen.findByText(/저장 실패/)).toBeInTheDocument();
      const retry = screen.getByRole('button', { name: '다시 시도' });
      expect(retry).toBeInTheDocument();

      await user.click(retry);
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
      expect(onSave).toHaveBeenLastCalledWith('수정값');
    });

    it('error 상태에서 취소 후 같은 셀을 다시 클릭해 편집 모드로 들어가면 빨간 표시가 자동으로 사라진다', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockRejectedValueOnce(new Error('network'));

      render(<InlineEditField value="원본" onSave={onSave} />);

      await user.click(screen.getByText('원본'));
      await user.clear(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '수정값');
      await user.click(screen.getByRole('button', { name: '저장' }));
      expect(await screen.findByText(/저장 실패/)).toBeInTheDocument();

      // 취소 → view 모드 → 같은 셀 재클릭 → edit 모드 (idle 로 복귀)
      await user.click(screen.getByRole('button', { name: '취소' }));
      await user.click(screen.getByText('원본'));

      expect(screen.queryByText(/저장 실패/)).not.toBeInTheDocument();
    });
  });

  describe('displayTransform (표시 전용 변환)', () => {
    it('displayTransform 가 view 모드 표시 텍스트를 변환한다', () => {
      render(
        <InlineEditField
          value="A\nB"
          onSave={vi.fn()}
          displayTransform={(raw) => raw.replace(/\\n/g, '|')}
        />
      );
      expect(screen.getByText('A|B')).toBeInTheDocument();
    });

    it('edit 모드 진입 시 textarea 에는 원본 value 가 들어간다 (변환 X)', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditField
          value="raw text"
          onSave={vi.fn()}
          multiline
          displayTransform={() => '변환된 텍스트'}
        />
      );
      await user.click(screen.getByText('변환된 텍스트'));
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('raw text');
    });

    it('multiline view 모드는 whitespace-pre-line 으로 줄바꿈을 시각화한다', () => {
      const { container } = render(<InlineEditField value={'1\n2'} onSave={vi.fn()} multiline />);
      const span = container.querySelector('span.whitespace-pre-line');
      expect(span).not.toBeNull();
    });
  });

  describe('ariaLabel (접근성 이름)', () => {
    it('ariaLabel 을 주면 view 모드 버튼의 접근성 이름이 된다', () => {
      render(<InlineEditField value="본문" onSave={vi.fn()} ariaLabel="수립 배경 편집" />);
      expect(screen.getByRole('button', { name: '수립 배경 편집' })).toBeInTheDocument();
    });

    it('ariaLabel 미지정 시 기존 동작 유지 (값 텍스트가 접근성 이름)', () => {
      render(<InlineEditField value="본문" onSave={vi.fn()} />);
      expect(screen.getByRole('button', { name: '본문' })).toBeInTheDocument();
    });

    it('readOnly 면 button role 이 없으므로 ariaLabel 도 노출되지 않는다', () => {
      render(<InlineEditField value="본문" onSave={vi.fn()} readOnly ariaLabel="수립 배경 편집" />);
      expect(screen.queryByRole('button', { name: '수립 배경 편집' })).toBeNull();
    });
  });
});
