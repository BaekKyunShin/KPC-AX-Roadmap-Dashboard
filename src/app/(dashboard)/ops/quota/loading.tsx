import { QuotaTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

/**
 * 현재 월을 YYYY-MM 형식으로 반환
 */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function QuotaLoading() {
  const currentMonth = getCurrentMonth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="쿼터 관리"
        description="사용자별 LLM 호출 한도를 관리합니다."
      />

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">조회 월:</label>
            <select
              value={currentMonth}
              disabled
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
            >
              <option>{currentMonth}</option>
            </select>
          </div>
          <p className="text-sm text-gray-500">
            <span className="inline-block h-4 w-24 animate-shimmer rounded" />
          </p>
        </div>
      </div>

      <QuotaTableSkeleton rows={5} />
    </div>
  );
}
