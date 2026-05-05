import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      {/* PendingApprovalCard 윤곽 미러링 — Pending 사용자만 진입.
          승인 완료 사용자는 server에서 곧바로 redirect되므로 짧게만 노출됨. */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3 opacity-70" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 opacity-70" />
          <Skeleton className="h-4 w-4/6 opacity-70" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
