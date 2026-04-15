import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewAutoSave } from './useInterviewAutoSave';

describe('useInterviewAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('초기 상태: isAutoSaving=false, lastSaved=null, autoSaveError=null', () => {
    const save = vi.fn();
    const { result } = renderHook(() =>
      useInterviewAutoSave({ data: { foo: 'a' }, save }),
    );
    expect(result.current.isAutoSaving).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.autoSaveError).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('데이터 변경 시 debounceMs 후 save 호출', async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = renderHook(
      ({ data }) => useInterviewAutoSave({ data, save, debounceMs: 500 }),
      { initialProps: { data: { foo: 'a' } } },
    );

    rerender({ data: { foo: 'b' } });

    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ foo: 'b' });
  });

  it('debounce: 짧은 간격의 연속 변경은 타이머 리셋 후 마지막 값만 저장', async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = renderHook(
      ({ data }) => useInterviewAutoSave({ data, save, debounceMs: 500 }),
      { initialProps: { data: { foo: 'a' } } },
    );

    rerender({ data: { foo: 'b' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    rerender({ data: { foo: 'c' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ foo: 'c' });
  });

  it('save 성공 시 lastSaved 갱신 및 autoSaveError null', async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ data }) => useInterviewAutoSave({ data, save, debounceMs: 100 }),
      { initialProps: { data: { foo: 'a' } } },
    );

    rerender({ data: { foo: 'b' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.lastSaved).not.toBeNull();
    expect(result.current.autoSaveError).toBeNull();
  });

  it('save 실패 시 autoSaveError 세팅', async () => {
    const save = vi.fn().mockResolvedValue({ success: false, error: '네트워크 오류' });
    const { result, rerender } = renderHook(
      ({ data }) => useInterviewAutoSave({ data, save, debounceMs: 100 }),
      { initialProps: { data: { foo: 'a' } } },
    );

    rerender({ data: { foo: 'b' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.autoSaveError).toBe('네트워크 오류');
  });

  it('enabled=false일 때 save 호출 안 됨', async () => {
    const save = vi.fn();
    const { rerender } = renderHook(
      ({ data, enabled }) => useInterviewAutoSave({ data, save, debounceMs: 100, enabled }),
      { initialProps: { data: { foo: 'a' }, enabled: false } },
    );

    rerender({ data: { foo: 'b' }, enabled: false });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('동일 데이터(직렬화 기준) 연속 변경은 재저장 호출 안 함', async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = renderHook(
      ({ data }) => useInterviewAutoSave({ data, save, debounceMs: 100 }),
      { initialProps: { data: { foo: 'a' } } },
    );

    rerender({ data: { foo: 'b' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(1);

    rerender({ data: { foo: 'b' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
