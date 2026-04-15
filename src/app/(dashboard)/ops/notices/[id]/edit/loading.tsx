import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="공지 수정" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="min-h-[400px] h-[400px] w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-40 ml-auto" />
      </div>
    </div>
  );
}
