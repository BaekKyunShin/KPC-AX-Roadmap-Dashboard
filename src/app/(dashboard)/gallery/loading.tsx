import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';
import { PAGE_TITLE } from './_meta';

/**
 * description 은 사용자 역할 (isAdmin) 별로 동적이라 loading 에서는 노출하지 않음.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} />
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg border" />
          ))}
        </div>
      </div>
    </div>
  );
}
