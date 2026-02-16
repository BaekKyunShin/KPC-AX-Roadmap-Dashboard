import { Skeleton } from '@/components/ui/Skeleton';

export default function InterviewLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Skeleton className="h-4 w-36 mb-2 opacity-70" />
        <Skeleton className="h-8 w-44" />
      </div>

      {/* 스테퍼 */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-16 hidden md:block" />
              {i < 5 && <Skeleton className="h-0.5 w-8 opacity-50" />}
            </div>
          ))}
        </div>
      </div>

      {/* 폼 컨텐츠 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 min-h-[400px] space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
