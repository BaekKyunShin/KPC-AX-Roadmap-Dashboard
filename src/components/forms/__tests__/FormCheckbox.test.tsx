import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormCheckbox } from '../FormCheckbox';

type TestValue = 'A' | 'B' | 'C';

const options: ReadonlyArray<{ value: TestValue; label: string }> = [
  { value: 'A', label: '선택지 A' },
  { value: 'B', label: '선택지 B' },
  { value: 'C', label: '선택지 C' },
];

describe('FormCheckbox', () => {
  it('single 모드: 옵션 클릭 시 onChange(단일값)이 호출된다', () => {
    const onChange = vi.fn();
    render(
      <FormCheckbox<TestValue>
        mode="single"
        options={[...options]}
        value={undefined}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('선택지 A'));
    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('single 모드: value 와 일치하는 옵션은 ☑ 심볼을 표시한다', () => {
    render(
      <FormCheckbox<TestValue>
        mode="single"
        options={[...options]}
        value="B"
        onChange={() => {}}
      />,
    );
    // ☑ 심볼이 1회 렌더, □ 심볼이 2회 렌더
    const checkedSymbols = screen.getAllByText('☑');
    const uncheckedSymbols = screen.getAllByText('□');
    expect(checkedSymbols).toHaveLength(1);
    expect(uncheckedSymbols).toHaveLength(2);
  });

  it('multi 모드: 옵션 추가 클릭 시 배열에 추가되어 onChange 호출', () => {
    const onChange = vi.fn();
    render(
      <FormCheckbox<TestValue>
        mode="multi"
        options={[...options]}
        value={['A']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('선택지 C'));
    expect(onChange).toHaveBeenCalledWith(['A', 'C']);
  });

  it('multi 모드: 이미 체크된 옵션 클릭 시 배열에서 제거되어 onChange 호출', () => {
    const onChange = vi.fn();
    render(
      <FormCheckbox<TestValue>
        mode="multi"
        options={[...options]}
        value={['A', 'B']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('선택지 A'));
    expect(onChange).toHaveBeenCalledWith(['B']);
  });

  it('readOnly 이면 클릭해도 onChange 가 호출되지 않는다', () => {
    const onChange = vi.fn();
    render(
      <FormCheckbox<TestValue>
        mode="single"
        options={[...options]}
        value={undefined}
        onChange={onChange}
        readOnly
      />,
    );
    fireEvent.click(screen.getByText('선택지 A'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('체크된 옵션은 ☑, 나머지는 □ 심볼을 표시한다 (multi 모드)', () => {
    render(
      <FormCheckbox<TestValue>
        mode="multi"
        options={[...options]}
        value={['A', 'C']}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByText('☑')).toHaveLength(2);
    expect(screen.getAllByText('□')).toHaveLength(1);
  });
});
