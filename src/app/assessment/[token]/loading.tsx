import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-lg mx-auto">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (외부 사용자가 잘못된 안내문구 보지 않도록) */}
      <div className="text-center mb-8 space-y-2">
        <Skeleton className="h-7 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto opacity-70" />
      </div>

      {/* 진단 정보 카드 윤곽 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16 opacity-70" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* CTA 버튼 윤곽 */}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}
