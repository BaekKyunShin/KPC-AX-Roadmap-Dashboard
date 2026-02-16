import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============================================================================
// 타입 정의
// ============================================================================

interface LogoProps {
  /** 추가 CSS 클래스 */
  className?: string;
  /** 로고 높이 (px). 너비는 원본 비율에 맞게 자동 계산됨 */
  height?: number;
  /** LCP/above-the-fold 로고인 경우 true (기본값: true) */
  priority?: boolean;
}

interface LogoBadgeProps {
  /** 추가 CSS 클래스 */
  className?: string;
}

// ============================================================================
// 상수
// ============================================================================

const LOGO_PATH = '/logo.png';
const LOGO_ALT = 'KPC AI ROADMAP';
const DEFAULT_HEIGHT = 28;
const BADGE_HEIGHT = 24;

/** 원본 이미지 비율 (1000×140) */
const LOGO_ASPECT_RATIO = 1000 / 140;

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * KPC AI 로드맵 로고
 *
 * next/image로 자동 최적화(WebP/AVIF, lazy loading) 적용.
 * 원본 비율(1000×140)을 기반으로 height에 맞는 width를 자동 계산
 */
export function Logo({ className, height = DEFAULT_HEIGHT, priority = true }: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  return (
    <Image
      src={LOGO_PATH}
      alt={LOGO_ALT}
      width={width}
      height={height}
      className={cn('h-auto cursor-pointer', className)}
      priority={priority}
    />
  );
}

/**
 * Hero 섹션용 로고 배지
 *
 * 둥근 테두리와 배경이 있는 배지 형태의 로고
 */
export function LogoBadge({ className }: LogoBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center px-5 py-3 rounded-full',
        'border border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-sm',
        className
      )}
    >
      <Logo height={BADGE_HEIGHT} />
    </div>
  );
}
