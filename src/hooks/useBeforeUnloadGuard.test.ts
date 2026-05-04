import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeforeUnloadGuard } from './useBeforeUnloadGuard';

describe('useBeforeUnloadGuard', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isDirty=true 일 때 beforeunload 리스너 등록', () => {
    renderHook(() => useBeforeUnloadGuard(true));
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('isDirty=false 일 때 리스너 등록 안 함', () => {
    renderHook(() => useBeforeUnloadGuard(false));
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('unmount 시 리스너 해제', () => {
    const { unmount } = renderHook(() => useBeforeUnloadGuard(true));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('isDirty=true 상태에서 beforeunload 이벤트 발생 시 preventDefault 호출 + returnValue 설정', () => {
    renderHook(() => useBeforeUnloadGuard(true));
    const handler = addSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'beforeunload',
    )?.[1] as (e: BeforeUnloadEvent) => void;

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    // jsdom 의 BeforeUnloadEvent.returnValue 는 boolean 으로 캐스팅되므로
    // 핸들러가 실제로 returnValue 에 빈 문자열을 할당했는지 setter 로 가로채 검증한다.
    const setterSpy = vi.fn();
    Object.defineProperty(event, 'returnValue', {
      configurable: true,
      get: () => '',
      set: setterSpy,
    });
    const pdSpy = vi.spyOn(event, 'preventDefault');
    handler(event);
    expect(pdSpy).toHaveBeenCalled();
    expect(setterSpy).toHaveBeenCalledWith('');
  });

  it('isDirty true→false 전환 시 리스너 해제 후 재등록 안 함', () => {
    const { rerender } = renderHook(({ d }: { d: boolean }) => useBeforeUnloadGuard(d), {
      initialProps: { d: true },
    });
    addSpy.mockClear();
    removeSpy.mockClear();
    rerender({ d: false });
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
