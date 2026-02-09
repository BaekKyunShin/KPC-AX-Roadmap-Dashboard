export default function ConsultantHomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Row 1: 인사말 + 숫자 카드 스켈레톤 */}
      <div>
        <div className="mb-4">
          <div className="h-8 w-72 bg-gray-200 rounded" />
          <div className="mt-2 h-4 w-56 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-5 w-5 bg-gray-200 rounded" />
              </div>
              <div className="mt-3 h-8 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: 차트 + 최근 프로젝트 스켈레톤 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="flex items-center justify-center mb-5">
            <div className="w-[160px] h-[160px] bg-gray-200 rounded-full" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-4 w-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          {/* 열 제목 스켈레톤 */}
          <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
            <div className="flex-1"><div className="h-3 w-12 bg-gray-200 rounded" /></div>
            <div className="hidden md:block w-28"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="hidden md:block w-20"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="w-24 flex justify-center"><div className="h-3 w-8 bg-gray-200 rounded" /></div>
            <div className="w-20 flex justify-end"><div className="h-3 w-12 bg-gray-200 rounded" /></div>
          </div>
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="flex-1"><div className="h-4 w-24 bg-gray-200 rounded" /></div>
                <div className="hidden md:block w-28"><div className="h-4 w-20 bg-gray-200 rounded" /></div>
                <div className="hidden md:block w-20"><div className="h-4 w-14 bg-gray-200 rounded" /></div>
                <div className="w-24 flex justify-center"><div className="h-5 w-16 bg-gray-200 rounded-full" /></div>
                <div className="w-20 flex justify-end"><div className="h-3 w-16 bg-gray-200 rounded" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: 최근 활동 스켈레톤 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-5 w-20 bg-gray-200 rounded mb-4" />
        <div className="divide-y divide-gray-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
              <div className="flex-1"><div className="h-4 w-48 bg-gray-200 rounded" /></div>
              <div className="hidden md:flex w-20 justify-center"><div className="h-5 w-14 bg-gray-200 rounded-full" /></div>
              <div className="w-20 flex justify-end"><div className="h-3 w-16 bg-gray-200 rounded" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
