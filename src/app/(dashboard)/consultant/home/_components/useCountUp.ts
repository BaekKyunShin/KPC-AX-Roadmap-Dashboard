'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';

/**
 * 뷰포트 진입 시 0→target으로 spring 카운트업 애니메이션을 수행하는 훅.
 * target이 0이면 애니메이션을 스킵한다.
 */
export function useCountUp(target: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState('0');

  // 뷰포트 진입 시 target으로 애니메이션 시작
  useEffect(() => {
    if (isInView && target > 0) {
      motionVal.set(target);
    }
  }, [isInView, target, motionVal]);

  // spring 값 변화를 구독하여 display 갱신
  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(Math.round(latest).toString());
    });
    return unsubscribe;
  }, [spring]);

  return { ref, display };
}
