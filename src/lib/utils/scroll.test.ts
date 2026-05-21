/**
 * scroll.ts 테스트
 * - scrollToPageTop: 페이지 상단 스크롤
 * - scrollToElement: 특정 요소로 스크롤
 * - scrollToFirstError: 첫 번째 에러 필드 스크롤 + 포커스
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RefObject } from 'react';
import { scrollToPageTop, scrollToElement, scrollToFirstError, isNearBottom } from './scroll';

// ─── DOM 모킹 ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    scrollTo: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── scrollToPageTop ──────────────────────────────────────────────────────

describe('scrollToPageTop', () => {
  it('기본 지연(100ms) 후 window.scrollTo를 호출한다', () => {
    scrollToPageTop();

    expect(window.scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('커스텀 지연 시간을 사용한다', () => {
    scrollToPageTop(200);

    vi.advanceTimersByTime(100);
    expect(window.scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });

  it('지연 0ms이면 즉시(setTimeout 0) 호출한다', () => {
    scrollToPageTop(0);

    expect(window.scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
});

// ─── scrollToElement ──────────────────────────────────────────────────────

describe('scrollToElement', () => {
  it('ref.current가 있으면 scrollIntoView를 호출한다', () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement;

    const ref = { current: mockElement } as RefObject<HTMLElement>;

    scrollToElement(ref);
    vi.advanceTimersByTime(100);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('커스텀 ScrollIntoViewOptions를 전달한다', () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement;

    const ref = { current: mockElement } as RefObject<HTMLElement>;

    scrollToElement(ref, { behavior: 'auto', block: 'center' });
    vi.advanceTimersByTime(100);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    });
  });

  it('ref.current가 null이면 에러 없이 무시된다', () => {
    const ref = { current: null } as RefObject<HTMLElement | null>;

    scrollToElement(ref);
    vi.advanceTimersByTime(100);

    // 에러 발생하지 않음
  });

  it('커스텀 지연 시간을 사용한다', () => {
    const mockElement = {
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement;

    const ref = { current: mockElement } as RefObject<HTMLElement>;

    scrollToElement(ref, undefined, 300);

    vi.advanceTimersByTime(100);
    expect(mockElement.scrollIntoView).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(mockElement.scrollIntoView).toHaveBeenCalledOnce();
  });
});

// ─── scrollToFirstError ───────────────────────────────────────────────────

describe('scrollToFirstError', () => {
  it('에러 요소를 찾아 scrollIntoView + input focus를 호출한다', () => {
    const mockInput = { focus: vi.fn() };
    const mockErrorElement = {
      scrollIntoView: vi.fn(),
      querySelector: vi.fn().mockReturnValue(mockInput),
    };
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(mockErrorElement),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref);
    vi.advanceTimersByTime(100);

    expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-error="true"]');
    expect(mockErrorElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(mockInput.focus).toHaveBeenCalledOnce();
  });

  it('에러 요소 내에 input이 없으면 focus를 호출하지 않는다', () => {
    const mockErrorElement = {
      scrollIntoView: vi.fn(),
      querySelector: vi.fn().mockReturnValue(null),
    };
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(mockErrorElement),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref);
    vi.advanceTimersByTime(100);

    expect(mockErrorElement.scrollIntoView).toHaveBeenCalled();
    // focus는 호출되지 않음 (에러 없이 통과)
  });

  it('에러 요소가 없으면 scrollIntoView를 호출하지 않는다', () => {
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(null),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref);
    vi.advanceTimersByTime(100);

    expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-error="true"]');
    // scrollIntoView가 호출되지 않음 (에러 없이 통과)
  });

  it('containerRef.current가 null이면 에러 없이 무시된다', () => {
    const ref = { current: null } as RefObject<HTMLElement | null>;

    scrollToFirstError(ref);
    vi.advanceTimersByTime(100);

    // 에러 발생하지 않음
  });

  it('커스텀 errorSelector를 사용한다', () => {
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(null),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref, '.custom-error');
    vi.advanceTimersByTime(100);

    expect(mockContainer.querySelector).toHaveBeenCalledWith('.custom-error');
  });

  it('커스텀 지연 시간을 사용한다', () => {
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(null),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref, undefined, 500);

    vi.advanceTimersByTime(100);
    expect(mockContainer.querySelector).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(mockContainer.querySelector).toHaveBeenCalledOnce();
  });

  it('textarea 요소에도 focus를 호출한다', () => {
    const mockTextarea = { focus: vi.fn() };
    const mockErrorElement = {
      scrollIntoView: vi.fn(),
      querySelector: vi.fn().mockReturnValue(mockTextarea),
    };
    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(mockErrorElement),
    };

    const ref = { current: mockContainer } as unknown as RefObject<HTMLElement>;

    scrollToFirstError(ref);
    vi.advanceTimersByTime(100);

    expect(mockTextarea.focus).toHaveBeenCalledOnce();
  });
});

// ─── isNearBottom ─────────────────────────────────────────────────────────

describe('isNearBottom', () => {
  function makeEl(scrollHeight: number, clientHeight: number, scrollTop: number): HTMLElement {
    return { scrollHeight, clientHeight, scrollTop } as HTMLElement;
  }

  it('컨테이너가 정확히 하단이면 true (남은 거리 0 < 임계 150)', () => {
    const el = makeEl(1000, 400, 600); // 1000 - 600 - 400 = 0
    expect(isNearBottom(el)).toBe(true);
  });

  it('컨테이너가 위로 200px 떨어져 있으면 false (기본 임계 150)', () => {
    const el = makeEl(1000, 400, 400); // 1000 - 400 - 400 = 200
    expect(isNearBottom(el)).toBe(false);
  });

  it('컨테이너가 100px 떨어져 있으면 true (100 < 150)', () => {
    const el = makeEl(1000, 400, 500); // 1000 - 500 - 400 = 100
    expect(isNearBottom(el)).toBe(true);
  });

  it('임계값을 50 으로 낮추면 100px 떨어진 경우 false', () => {
    const el = makeEl(1000, 400, 500); // remaining = 100
    expect(isNearBottom(el, 50)).toBe(false);
  });

  it('임계값을 50, 거리 30 이면 true', () => {
    const el = makeEl(1000, 400, 570); // 1000 - 570 - 400 = 30
    expect(isNearBottom(el, 50)).toBe(true);
  });

  it('정확히 임계값과 같은 거리는 false (strict less-than)', () => {
    const el = makeEl(1000, 400, 450); // 1000 - 450 - 400 = 150
    expect(isNearBottom(el, 150)).toBe(false);
  });
});
