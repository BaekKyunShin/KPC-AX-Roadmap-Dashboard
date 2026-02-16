import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="rounded-xl border bg-card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 opacity-70" />
          </div>
        </div>
        <Skeleton className="h-4 w-full opacity-70" />
        <Skeleton className="h-4 w-3/4 opacity-70" />
        <Skeleton className="h-10 w-32 mt-4" />
      </div>
    </div>
  );
}
