import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCountUp } from './useCountUp';

// motion/react 모킹
vi.mock('motion/react', () => {
  const motionValue = (initial: number) => {
    let current = initial;
    const listeners = new Set<(v: number) => void>();
    return {
      get: () => current,
      set: (v: number) => {
        current = v;
        listeners.forEach((fn) => fn(v));
      },
      on: (event: string, fn: (v: number) => void) => {
        if (event === 'change') listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
  };

  return {
    useMotionValue: (initial: number) => motionValue(initial),
    useSpring: (mv: ReturnType<typeof motionValue>) => mv,
    useInView: () => false, // SSR 시뮬레이션: 뷰포트 밖
  };
});

describe('useCountUp', () => {
  it('ref 객체를 반환한다', () => {
    const { result } = renderHook(() => useCountUp(10));
    expect(result.current.ref).toBeDefined();
    expect(result.current.ref).toHaveProperty('current');
  });

  it('display 문자열을 반환한다', () => {
    const { result } = renderHook(() => useCountUp(10));
    expect(typeof result.current.display).toBe('string');
  });

  it('target이 0이면 display가 "0"이다', () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current.display).toBe('0');
  });

  it('뷰포트 밖(useInView=false)이면 display가 "0"이다', () => {
    const { result } = renderHook(() => useCountUp(42));
    // mock에서 useInView가 false를 반환하므로 아직 0
    expect(result.current.display).toBe('0');
  });
});
