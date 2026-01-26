import { UserTableSkeleton } from '@/components/ui/Skeleton';

export default function UsersLoading() {
  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            컨설턴트 승인/정지 및 상태를 관리합니다.
          </p>
        </div>
      </div>

      <UserTableSkeleton rows={5} />
    </div>
  );
}
