import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 페이지 제목 — page.tsx 와 일치해야 함.
 * description 은 사용자 역할(isAdmin) 에 따라 동적이라 정적 노출 불가 → 회색 박스로 처리.
 */
const PAGE_TITLE = '로드맵·PBL 갤러리';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} />
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg border" />
          ))}
        </div>
      </div>
    </div>
  );
}
