import { PageHeader } from '@/components/ui/page-header';

/**
 * 페이지 헤더 텍스트 — page.tsx 와 일치해야 함.
 * (page.tsx 변경 시 본 텍스트도 함께 갱신할 것)
 */
const PAGE_TITLE = '메시지';
const PAGE_DESCRIPTION = '멤버에게 메시지를 보내보세요.';

export default function Loading() {
  return (
    <div className="flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <div className="flex flex-1 min-h-0 pt-6 bg-white rounded-lg shadow overflow-hidden">
        {/* 좌측 목록 스켈레톤 */}
        <div className="w-full md:w-80 lg:w-96 border-r">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측 빈 영역 */}
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-300">
          <div className="h-12 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
