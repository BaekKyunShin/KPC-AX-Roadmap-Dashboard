import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 페이지 헤더 텍스트 — page.tsx 와 일치해야 함.
 * (page.tsx 변경 시 본 텍스트도 함께 갱신할 것)
 */
const PAGE_TITLE = '공지 관리';
const PAGE_DESCRIPTION = '컨설턴트와 공유할 공지·양식 파일을 관리합니다.';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        actions={<Skeleton className="h-9 w-32 rounded-md" />}
      />

      {/* 상단 고정 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>

      {/* 일반 공지 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="rounded-md border overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
