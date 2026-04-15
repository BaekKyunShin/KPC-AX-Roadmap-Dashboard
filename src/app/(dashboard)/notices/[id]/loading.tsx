import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 공지 상세 로딩 스켈레톤.
 * 실제 구조(notices/[id]/page.tsx)와 1:1 매핑:
 * - PageHeader: backLink + title
 * - 메타 카드(bg-muted/30, rounded-lg border, p-4): 작성자·작성일·조회수
 * - 본문(article, min-h-[200px])
 * - 첨부 섹션(조건부) — 스켈레톤은 있다고 가정하고 렌더
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* PageHeader: backLink + 제목 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
      </div>

      {/* 메타 카드 */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* 본문 */}
      <div className="space-y-2 min-h-[200px]">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-9/12" />
        <Skeleton className="h-4 w-11/12" />
      </div>

      {/* 첨부 섹션 */}
      <div className="border-t pt-6 space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
