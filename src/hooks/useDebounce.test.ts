import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useSearchInput } from './useDebounce';

describe('useDebounce', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── 초기값 ────────────────────────────────────────────────────────────────

  test('초기값을 그대로 반환한다', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  // ─── delay 후 업데이트 ─────────────────────────────────────────────────────

  test('지정된 delay 후 값이 업데이트된다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // 아직 변경 안 됨

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  // ─── 타이머 취소 ───────────────────────────────────────────────────────────

  test('delay 이전에 값이 변경되면 이전 타이머가 취소된다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } },
    );

    // 첫 번째 변경
    rerender({ value: 'b', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a'); // 아직 반영 안 됨

    // 200ms 시점에 다시 변경 → 이전 타이머 취소
    rerender({ value: 'c', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // 'b'의 타이머(300ms)가 만료될 시점이지만 취소되었으므로 반영 안 됨
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 'c'의 타이머(300ms) 만료
    expect(result.current).toBe('c');
  });

  // ─── 언마운트 시 정리 ──────────────────────────────────────────────────────

  test('컴포넌트 언마운트 시 타이머가 정리된다', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'start', delay: 500 } },
    );

    rerender({ value: 'changed', delay: 500 });

    const callCountBeforeUnmount = clearTimeoutSpy.mock.calls.length;
    unmount();

    // 언마운트 시 clearTimeout이 한 번 더 호출됨
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callCountBeforeUnmount);
  });

  // ─── 기본 delay 값 ─────────────────────────────────────────────────────────

  test('delay 미지정 시 기본값 300ms가 적용된다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'first' } },
    );

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });
});

// ─── useSearchInput ────────────────────────────────────────────────────────

describe('useSearchInput', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('inputValue와 debouncedValue의 초기값은 빈 문자열이다', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSearchInput());
    expect(result.current.inputValue).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });

  test('setInputValue로 inputValue가 즉시 변경되고 debouncedValue는 delay 후 변경된다', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSearchInput(200));

    act(() => {
      result.current.setInputValue('검색어');
    });

    expect(result.current.inputValue).toBe('검색어');
    expect(result.current.debouncedValue).toBe(''); // 아직 반영 안 됨

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedValue).toBe('검색어');
  });
});
