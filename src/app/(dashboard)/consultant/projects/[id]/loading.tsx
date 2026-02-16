import { Skeleton } from '@/components/ui/Skeleton';

export default function ConsultantProjectDetailLoading() {
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <Skeleton className="h-4 w-28 mb-2 opacity-70" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36 mt-1 opacity-70" />
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20 mb-3" />
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠: 기업 정보 + 자가진단 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 기업 정보 카드 */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* 자가진단 결과 카드 */}
        <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full max-w-[200px]" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
