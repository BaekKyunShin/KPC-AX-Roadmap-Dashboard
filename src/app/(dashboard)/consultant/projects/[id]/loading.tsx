import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 컨설턴트 프로젝트 상세 페이지 로딩 스켈레톤.
 *
 * 실제 구조(page.tsx + _components/)와 1:1 매핑:
 * - PageHeader: backLink + 제목(회사명) + description(업종·규모) + actions(인터뷰/로드맵 버튼 최대 2개)
 * - ProjectDetailTabs: 4개 탭 (기업 정보·사전 분석·인터뷰 기록·활동 일지)
 * - 기본 탭(기업 정보) 컨텐츠: 2-컬럼 그리드 (lg:grid-cols-5)
 *   - CompanyInfoEditableCard (lg:col-span-2): h2 + 수정 버튼 + 기본정보 3행 + divider
 *     + 담당자 3행 (아이콘 포함) + 내부 메모 자리 (마이그 073)
 *   - 자가진단 결과 카드 (lg:col-span-3): h2 + 날짜 + 레이더 차트 + 설문 상세 아코디언
 */
export default function ConsultantProjectDetailLoading() {
  return (
    <div className="space-y-4">
      {/* PageHeader */}
      <div>
        <Skeleton className="h-3.5 w-24 mb-2 opacity-70" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-40 opacity-70" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 (shadcn Tabs 구조) */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 border-b-2 ${
                i === 0 ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Skeleton
                className={`h-4 w-${i === 0 ? 20 : 16} ${i === 0 ? '' : 'opacity-70'}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 기본 탭(기업 정보) 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        {/* 기업 정보 카드 — 편집 가능 (제목 + 수정 버튼 + 정보 + 내부 메모) */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-7 w-16 rounded-md opacity-70" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-4 w-4 rounded shrink-0 opacity-70" />
                <Skeleton className="h-4 w-14 shrink-0 opacity-70" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <hr className="my-2 border-gray-100" />
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-4 w-4 rounded shrink-0 opacity-70" />
                <Skeleton className="h-4 w-14 shrink-0 opacity-70" />
                <Skeleton className={`h-4 ${i === 2 ? 'w-40' : 'w-28'}`} />
              </div>
            ))}
          </div>
          {/* 내부 메모 자리 (마이그 073) */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Skeleton className="h-3 w-32 mb-1.5 opacity-70" />
            <Skeleton className="h-10 w-full rounded-md opacity-50" />
          </div>
        </div>

        {/* 자가진단 결과 카드 */}
        <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-24 opacity-70" />
          </div>

          {/* 레이더 차트 영역 */}
          <div className="h-[220px] rounded-lg bg-gray-100 animate-shimmer mb-4" />

          {/* 설문 상세 아코디언 (접힌 상태) */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16 opacity-70" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-4 opacity-70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
