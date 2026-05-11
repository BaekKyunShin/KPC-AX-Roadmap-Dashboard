export default function ConsultantHomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Row 1: 인사말 + SummaryCards (5개, lg:grid-cols-5) */}
      <div>
        <div className="mb-4">
          <div className="h-8 w-72 bg-gray-200 rounded" />
          <div className="mt-2 h-4 w-56 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-300 ${
                // 5개(홀수)라 마지막 카드는 모바일 2열 차지 (실제 SummaryCards.tsx:94)
                i === 4 ? 'col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-5 w-5 bg-gray-200 rounded" />
              </div>
              <div className="mt-2 h-8 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: 도넛 차트 + 최근 프로젝트 (lg:grid-cols-5, 2:3 분할) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 좌측: 상태 분포 도넛 차트 (2col) */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          {/* 도넛 차트 영역 — aspect-square w-full max-w-[180px] 미러 */}
          <div className="flex items-center justify-center mb-5">
            <div className="aspect-square w-full max-w-[180px] bg-gray-200 rounded-full" />
          </div>
          {/* 범례 — space-y-2.5 (StatusDistributionChart.tsx:136 와 동일) */}
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full shrink-0" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-4 w-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 최근 프로젝트 (3col) */}
        <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          {/* 열 제목 */}
          <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
            <div className="flex-1"><div className="h-3 w-12 bg-gray-200 rounded" /></div>
            <div className="hidden md:block w-28"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="hidden md:block w-20"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="w-24 flex justify-center"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="w-20 flex justify-end"><div className="h-3 w-12 bg-gray-200 rounded" /></div>
          </div>
          {/* 데이터 행 — hover 영역(-mx-2 px-2 rounded-lg) + 회사명 옆 TrackBadge */}
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg"
              >
                {/* 컬럼 1: 회사명 + TrackBadge (flex-wrap, gap-2) — RecentProjects.tsx:76-82 미러 */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-12 bg-gray-200 rounded-full" />
                </div>
                <div className="hidden md:block w-28">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="hidden md:block w-20">
                  <div className="h-4 w-14 bg-gray-200 rounded" />
                </div>
                <div className="w-24 flex justify-center">
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                </div>
                <div className="w-20 flex justify-end">
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: 최근 활동 (풀 너비) */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-20 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg"
            >
              {/* 아바타 — 컬러 배경 원에 작은 아이콘 자리 (RecentActivity.tsx:47-49) */}
              <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0 flex items-center justify-center">
                <div className="h-4 w-4 bg-gray-300 rounded" />
              </div>
              {/* 멘트 — flex-1 min-w-0 (반응형, 고정 w-48 제거) */}
              <div className="flex-1 min-w-0">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
              {/* 타입 배지 */}
              <div className="hidden md:flex w-20 justify-center shrink-0">
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
              </div>
              {/* 시간 */}
              <div className="w-20 flex justify-end shrink-0">
                <div className="h-3 w-14 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
