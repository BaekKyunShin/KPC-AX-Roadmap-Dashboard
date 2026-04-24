import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * 섹션 카드 내부의 부분 Suspense fallback.
 *
 * - 결과 탭 내 특정 섹션만 로딩 중일 때 SectionCard 내부에 배치.
 * - 라인별 너비가 점차 좁아져 자연스러운 본문 로딩 느낌을 준다.
 */
export interface SectionSkeletonProps {
  /** 라인 개수(기본 4). */
  lines?: number;
  /** 추가 className 합성. */
  className?: string;
}

const LINE_WIDTHS = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'] as const;

export function SectionSkeleton({
  lines = 4,
  className,
}: SectionSkeletonProps) {
  return (
    <div
      className={cn('space-y-3 animate-pulse', className)}
      role="status"
      aria-busy="true"
      aria-label="섹션 로딩 중"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', LINE_WIDTHS[i % LINE_WIDTHS.length])}
        />
      ))}
    </div>
  );
}
