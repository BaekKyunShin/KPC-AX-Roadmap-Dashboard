import { UserTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <UserTableSkeleton rows={5} />
    </div>
  );
}
