import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 페이지 헤더 텍스트 — page.tsx 와 일치해야 함.
 * (page.tsx 변경 시 본 텍스트도 함께 갱신할 것)
 */
const PAGE_TITLE = '공지사항';
const PAGE_DESCRIPTION = '운영자가 공유한 공지와 양식 파일을 확인합니다.';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      {/* 검색바 스켈레톤: 세그먼트 탭 + 검색 입력 + 버튼 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* 테이블 스켈레톤: 헤더 1행 + 본문 기본 10행 */}
      <div className="rounded-md border bg-white overflow-hidden">
        <Skeleton className="h-11 w-full rounded-none" />
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
