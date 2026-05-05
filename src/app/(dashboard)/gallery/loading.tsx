import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (실제 페이지 헤더와 불일치 방지) */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg border" />
          ))}
        </div>
      </div>
    </div>
  );
}
