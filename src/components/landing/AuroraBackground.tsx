'use client';

import { cn } from '@/lib/utils';
import React from 'react';

/**
 * Aurora 배경 CSS 변수
 * @see https://ui.aceternity.com/components/aurora-background
 */
const AURORA_CSS_VARIABLES = {
  '--aurora':
    'repeating-linear-gradient(100deg,#3b82f6_10%,#a5b4fc_15%,#93c5fd_20%,#ddd6fe_25%,#60a5fa_30%)',
  '--white-gradient':
    'repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)',
  '--blue-300': '#93c5fd',
  '--blue-400': '#60a5fa',
  '--blue-500': '#3b82f6',
  '--indigo-300': '#a5b4fc',
  '--violet-200': '#ddd6fe',
  '--white': '#fff',
  '--transparent': 'transparent',
} as React.CSSProperties;

/**
 * Aurora 효과 레이어 Tailwind 클래스
 */
const AURORA_LAYER_CLASSES = cn(
  // 기본 레이아웃
  'pointer-events-none absolute -inset-[10px]',
  // 시각 효과
  'opacity-50 blur-[10px] invert filter will-change-transform',
  // 배경 그라디언트
  '[background-image:var(--white-gradient),var(--aurora)]',
  '[background-size:300%,_200%]',
  '[background-position:50%_50%,50%_50%]',
  // CSS 변수 재정의
  '[--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]',
  '[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]',
  // ::after 가상 요소 (애니메이션)
  'after:absolute after:inset-0 after:content-[""]',
  'after:[background-image:var(--white-gradient),var(--aurora)]',
  'after:[background-size:200%,_100%]',
  'after:[background-attachment:fixed]',
  'after:mix-blend-difference',
  'after:animate-aurora',
  // 마스크 (우측 상단에서 퍼져나감)
  '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]'
);

interface AuroraBackgroundProps {
  /** Aurora 표시 여부 */
  visible?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * Aurora 배경 효과 컴포넌트
 *
 * Aceternity UI의 aurora-background를 기반으로 구현
 * 타이핑 완료 후 페이드인되는 배경 효과로 사용
 *
 * @example
 * ```tsx
 * <AuroraBackground visible={isTypingComplete} />
 * ```
 */
export function AuroraBackground({
  visible = true,
  className,
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        'transition-opacity duration-[1500ms] ease-out',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      aria-hidden="true"
      style={AURORA_CSS_VARIABLES}
    >
      <div className={AURORA_LAYER_CLASSES} />
    </div>
  );
}
