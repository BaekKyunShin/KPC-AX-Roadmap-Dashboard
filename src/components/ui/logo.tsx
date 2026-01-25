import { cn } from '@/lib/utils';

// ============================================================================
// 타입 정의
// ============================================================================

interface LogoProps {
  /** 추가 CSS 클래스 */
  className?: string;
  /** 로고 높이 (px). 너비는 원본 비율에 맞게 자동 계산됨 */
  height?: number;
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

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * KPC AI 로드맵 로고
 *
 * 원본 이미지 비율을 정확히 유지하기 위해 height만 지정하고 width는 auto로 처리
 */
export function Logo({ className, height = DEFAULT_HEIGHT }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_PATH}
      alt={LOGO_ALT}
      style={{ height: `${height}px`, width: 'auto' }}
      className={cn('h-auto', className)}
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
