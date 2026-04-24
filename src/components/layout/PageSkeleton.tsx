import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/**
 * Suspense fallback 으로 사용하는 페이지 전체 스켈레톤.
 *
 * - PageContainer 와 동일한 max-w-5xl + 좌우 패딩으로 레이아웃 점프 없음.
 * - 상단 헤더 스켈레톤 + N개 섹션 카드 스켈레톤.
 * - 기존 `src/components/ui/Skeleton.tsx` 의 `Skeleton` 베이스만 재사용(파일 확장 없음).
 */
export interface PageSkeletonProps {
  /** 렌더할 섹션 스켈레톤 개수(기본 3). */
  sections?: number;
  /** 추가 className 합성. */
  className?: string;
}

export function PageSkeleton({ sections = 3, className }: PageSkeletonProps) {
  return (
    <div
      className={cn(
        'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="페이지 로딩 중"
    >
      {/* 헤더 스켈레톤 */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {/* 섹션 스켈레톤 × N */}
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-6">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}
