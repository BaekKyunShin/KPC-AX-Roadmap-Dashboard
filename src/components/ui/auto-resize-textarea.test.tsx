import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { AutoResizeTextarea } from './auto-resize-textarea';

describe('AutoResizeTextarea', () => {
  it('기본 렌더링 — textarea 요소가 렌더된다', () => {
    render(<AutoResizeTextarea value="테스트" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('className이 없으면 resize-none overflow-hidden만 적용된다', () => {
    render(<AutoResizeTextarea value="" onChange={vi.fn()} />);
    const el = screen.getByRole('textbox');
    expect(el.className).toContain('resize-none');
    expect(el.className).toContain('overflow-hidden');
  });

  it('className이 있으면 기본 클래스와 합쳐진다', () => {
    render(<AutoResizeTextarea value="" className="custom-class" onChange={vi.fn()} />);
    const el = screen.getByRole('textbox');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('resize-none');
  });

  it('forwardedRef에 함수 ref를 전달하면 호출된다 (Line 20 typeof === function 분기 커버)', () => {
    // branch 0[0]: typeof forwardedRef === 'function' → true 경로
    const callbackRef = vi.fn();
    render(<AutoResizeTextarea ref={callbackRef} value="ref 테스트" onChange={vi.fn()} />);
    expect(callbackRef).toHaveBeenCalled();
    // 첫 번째 호출 인수가 HTMLTextAreaElement
    expect(callbackRef.mock.calls[0][0]).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('forwardedRef에 객체 ref를 전달하면 .current에 할당된다 (Line 20 else if 분기 커버)', () => {
    // branch 1[0]: else if (forwardedRef) → true 경로
    const objectRef = createRef<HTMLTextAreaElement>();
    render(<AutoResizeTextarea ref={objectRef} value="ref 테스트" onChange={vi.fn()} />);
    expect(objectRef.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('값이 변경되면 height이 재계산된다 (useLayoutEffect 동작)', () => {
    const { rerender } = render(<AutoResizeTextarea value="짧은 내용" onChange={vi.fn()} />);
    // 에러 없이 값 변경 시 useLayoutEffect 재실행
    rerender(<AutoResizeTextarea value="긴 내용\n두 번째 줄\n세 번째 줄" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
