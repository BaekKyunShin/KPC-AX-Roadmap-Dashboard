import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function NewProjectLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title="새 프로젝트 생성"
          description="기업 기본 정보를 입력하여 프로젝트를 생성합니다."
          backLink={{ href: '/ops/projects', label: '프로젝트 목록으로' }}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* 회사명, 기업 규모 */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* 업종 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full md:w-1/2" />
        </div>

        {/* 담당자 정보 */}
        <div className="border-t pt-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* 주소 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* 코멘트 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
