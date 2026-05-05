import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (cross-route 누출 방지) */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
      </div>
      <div className="flex flex-1 min-h-0 pt-6 bg-white rounded-lg shadow overflow-hidden">
        {/* 좌측 목록 스켈레톤 */}
        <div className="w-full md:w-80 lg:w-96 border-r">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-3/4 opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측 빈 영역 */}
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-300">
          <Skeleton className="h-12 w-12" />
        </div>
      </div>
    </div>
  );
}
