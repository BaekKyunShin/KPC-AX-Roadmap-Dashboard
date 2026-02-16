import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function TemplateDetailLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="템플릿 상세"
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 템플릿 편집 폼 */}
        <div>
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            {/* 문항 영역 */}
            <div className="space-y-3 border-t pt-4">
              <Skeleton className="h-5 w-16" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 opacity-70" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>

        {/* 우측: 미리보기 */}
        <div>
          <Skeleton className="h-6 w-20 mb-4" />
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 pb-4 border-b last:border-0">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-16 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
