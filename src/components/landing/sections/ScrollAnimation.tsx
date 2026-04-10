'use client';

import { useRef, useEffect, type ReactNode } from 'react';

interface ScrollAnimationProps {
  children: ReactNode;
  className?: string;
  /** GSAP fromTo 시작값 (기본: { opacity: 0, y: 30 }) */
  initial?: Record<string, number>;
  /** 애니메이션 시간 (초, 기본: 1) */
  duration?: number;
  /** 자식 요소 간 시차 (초, 기본: 0.15) */
  stagger?: number;
  /** GSAP easing (기본: 'power2.out') */
  ease?: string;
  /** ScrollTrigger 시작점 (기본: 'top 70%') */
  scrollStart?: string;
}

/**
 * GSAP ScrollTrigger 기반 자식 요소 순차 등장 애니메이션 Client Island.
 *
 * 랜딩 페이지 Server Component 섹션(FeaturesSection, WorkflowSection 등)에서
 * 카드/스텝 그리드를 감싸 스크롤 진입 시 애니메이션을 적용한다.
 * GSAP는 useEffect 내에서 동적 import되므로 초기 번들에 포함되지 않는다.
 */
export default function ScrollAnimation({
  children,
  className,
  initial = { opacity: 0, y: 30 },
  duration = 1,
  stagger = 0.15,
  ease = 'power2.out',
  scrollStart = 'top 70%',
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    let cancelled = false;

    async function animate() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      // initial에서 반대값 자동 계산 (opacity: 0→1, y: 30→0, x: -50→0)
      const animateTo: Record<string, number> = {};
      for (const key of Object.keys(initial)) {
        animateTo[key] = key === 'opacity' ? 1 : 0;
      }

      gsap.fromTo(ref.current!.children, initial, {
        ...animateTo,
        duration,
        stagger,
        ease,
        scrollTrigger: {
          trigger: ref.current,
          start: scrollStart,
          toggleActions: 'play none none reverse' as const,
        },
      });
    }

    animate();
    return () => {
      cancelled = true;
    };
    // Props는 Server Component에서 전달되므로 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
