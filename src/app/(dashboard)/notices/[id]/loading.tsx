import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="공지 상세" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
