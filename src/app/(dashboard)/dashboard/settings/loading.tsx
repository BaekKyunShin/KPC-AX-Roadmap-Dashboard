import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 헤더 영역 — 정적 텍스트 노출 금지 (cross-route 누출 방지) */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 opacity-70" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
      </div>

      {/* 이메일 알림 설정 카드 스켈레톤 */}
      <div className="rounded-xl border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-56 opacity-70" />
          </div>
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      </div>

      {/* 비밀번호 변경 카드 스켈레톤 */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-64 opacity-70" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 계정 삭제 카드 스켈레톤 */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-80 opacity-70" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
