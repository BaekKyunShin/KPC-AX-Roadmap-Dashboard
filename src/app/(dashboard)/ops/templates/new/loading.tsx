import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function NewTemplateLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="새 템플릿 생성"
        description="자가진단 문항 템플릿을 생성합니다."
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로' }}
      />

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
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-28" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 opacity-70" />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
