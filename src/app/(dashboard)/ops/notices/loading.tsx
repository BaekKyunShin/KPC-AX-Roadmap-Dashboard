import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="공지 관리"
        description="컨설턴트와 공유할 공지·양식 파일을 관리합니다."
        actions={<Skeleton className="h-9 w-32 rounded-md" />}
      />

      {/* 상단 고정 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>

      {/* 일반 공지 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
