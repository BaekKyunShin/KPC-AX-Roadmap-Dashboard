import { UserTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="사용자 관리"
        description="컨설턴트 승인/정지 및 상태를 관리합니다."
      />
      <UserTableSkeleton rows={5} />
    </div>
  );
}
