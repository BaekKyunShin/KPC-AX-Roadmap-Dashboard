import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (cross-route 누출 방지) */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
      </div>

      {/* 검색바 스켈레톤: 세그먼트 탭 + 검색 입력 + 버튼 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* 테이블 스켈레톤: 헤더 1행 + 본문 기본 10행 */}
      <div className="rounded-md border bg-white overflow-hidden">
        <Skeleton className="h-11 w-full rounded-none" />
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
