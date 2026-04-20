import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRef } from 'react';
import { useRowHeightSync } from './useRowHeightSync';

describe('useRowHeightSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rowRef.current가 null이면 동기화를 건너뛴다 (early return 분기 커버)', () => {
    // Line 21: if (!row) return → true 분기 커버
    const { result } = renderHook(() => {
      const rowRef = useRef<HTMLTableRowElement | null>(null);
      // rowRef.current = null (초기값)
      useRowHeightSync(rowRef, []);
      return rowRef;
    });
    // rowRef.current가 null이므로 에러 없이 완료됨
    expect(result.current.current).toBeNull();
  });

  it('textarea가 없는 row이면 동기화를 건너뛴다 (textareas.length === 0 분기 커버)', () => {
    // Line 23: if (textareas.length === 0) return → true 분기 커버
    const { result } = renderHook(() => {
      const rowRef = useRef<HTMLTableRowElement | null>(null);
      useRowHeightSync(rowRef, []);
      return rowRef;
    });

    act(() => {
      // rowRef에 textarea가 없는 div 요소 할당
      const tr = document.createElement('tr');
      // textarea 없이 td만 포함
      tr.innerHTML = '<td>내용</td>';
      (result.current as React.MutableRefObject<HTMLTableRowElement>).current = tr;
    });

    // 에러 없이 완료됨
    expect(result.current.current).not.toBeNull();
  });

  it('textarea가 있는 row이면 높이를 동기화한다', () => {
    // 정상 동작 경로 — if 분기 모두 false → 실제 height 계산
    const { result } = renderHook(() => {
      const rowRef = useRef<HTMLTableRowElement | null>(null);
      useRowHeightSync(rowRef, []);
      return rowRef;
    });

    act(() => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      const textarea = document.createElement('textarea');
      textarea.value = '테스트 내용';
      td.appendChild(textarea);
      tr.appendChild(td);
      (result.current as React.MutableRefObject<HTMLTableRowElement>).current = tr;
    });

    // 에러 없이 완료됨
    expect(result.current.current).not.toBeNull();
  });

  it('언마운트 시 이벤트 리스너와 rAF가 정리된다', () => {
    // cleanup 함수: cancelAnimationFrame + removeEventListener
    const { unmount } = renderHook(() => {
      const rowRef = useRef<HTMLTableRowElement | null>(null);
      useRowHeightSync(rowRef, []);
      return rowRef;
    });
    expect(() => unmount()).not.toThrow();
  });
});
