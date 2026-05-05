import { Skeleton } from '@/components/ui/Skeleton';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

/**
 * 외부 진단 페이지 로딩 스켈레톤 — PublicAssessmentClient.tsx (intro phase) 마크업 미러.
 */
export default function Loading() {
  return (
    <div className="max-w-lg mx-auto">
      {/* 헤더 — 즉시 텍스트 노출 (A안) */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{PAGE_TITLE}</h1>
        <p className="text-gray-600">{PAGE_DESCRIPTION}</p>
      </div>

      {/* 진단 정보 카드 윤곽 — 데이터 도착 후 채워짐 */}
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
