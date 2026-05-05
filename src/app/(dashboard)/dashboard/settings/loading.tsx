import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 페이지 헤더 텍스트 — page.tsx 와 일치해야 함.
 * (page.tsx 변경 시 본 텍스트도 함께 갱신할 것)
 */
const PAGE_TITLE = '계정 설정';
const PAGE_DESCRIPTION = '비밀번호 변경 및 계정 관리';

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        backLink={{ href: '/dashboard', label: '대시보드', useBack: true }}
      />

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
