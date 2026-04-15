import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="공지사항"
        description="운영자가 공유한 공지와 양식 파일을 확인합니다."
      />
      <Skeleton className="h-24 w-full" />
      <div className="rounded-md border bg-white">
        <Skeleton className="h-12 w-full" />
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
