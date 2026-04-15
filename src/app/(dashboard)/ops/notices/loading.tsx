import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="공지 관리"
        description="컨설턴트와 공유할 공지·양식 파일을 관리합니다."
      />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border">
          <Skeleton className="h-12 w-full" />
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border">
          <Skeleton className="h-12 w-full" />
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
