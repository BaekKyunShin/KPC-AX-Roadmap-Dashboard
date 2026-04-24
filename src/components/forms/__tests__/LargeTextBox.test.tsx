import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LargeTextBox } from '../LargeTextBox';

describe('LargeTextBox', () => {
  it('value prop 을 textarea 에 반영한다', () => {
    render(
      <LargeTextBox
        value="입력된 내용"
        onChange={() => {}}
        placeholder="입력란"
      />,
    );
    const textarea = screen.getByPlaceholderText('입력란') as HTMLTextAreaElement;
    expect(textarea.value).toBe('입력된 내용');
  });

  it('사용자가 타이핑하면 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <LargeTextBox value="" onChange={onChange} placeholder="입력란" />,
    );
    const textarea = screen.getByPlaceholderText('입력란');
    fireEvent.change(textarea, { target: { value: '새 값' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('기본 minHeight 클래스 min-h-[160px] 가 적용된다', () => {
    render(
      <LargeTextBox value="" onChange={() => {}} placeholder="입력란" />,
    );
    const textarea = screen.getByPlaceholderText('입력란');
    expect(textarea.className).toContain('min-h-[160px]');
  });

  it('minHeightClassName 커스터마이즈가 적용된다', () => {
    render(
      <LargeTextBox
        value=""
        onChange={() => {}}
        placeholder="입력란"
        minHeightClassName="min-h-[240px]"
      />,
    );
    const textarea = screen.getByPlaceholderText('입력란');
    expect(textarea.className).toContain('min-h-[240px]');
    expect(textarea.className).not.toContain('min-h-[160px]');
  });
});
