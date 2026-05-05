import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (cross-route 누출 방지) */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3 opacity-70" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* 상단 고정 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>

      {/* 일반 공지 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
