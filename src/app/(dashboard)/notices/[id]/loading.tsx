import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 공지 상세 로딩 스켈레톤.
 * 실제 구조(notices/[id]/page.tsx)와 1:1 매핑:
 * - PageHeader: backLink + title
 * - 메타 카드(bg-muted/30, rounded-lg border, p-4): 작성자·작성일·조회수
 * - 본문(article, min-h-[200px])
 * (첨부 섹션은 page.tsx에서 attachments.length > 0 조건부 렌더이므로
 *  로딩 스켈레톤에서는 렌더하지 않아 시각적 점프를 방지)
 */
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* PageHeader: backLink + 제목 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
      </div>

      {/* 메타 카드 — 각 항목: 아이콘(h-3.5 w-3.5) + 텍스트(작성자/작성일/조회수) */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-20" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-24" />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-16" />
          </span>
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
    </div>
  );
}
