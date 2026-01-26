import Link from 'next/link';
import { QuotaTableSkeleton } from '@/components/ui/Skeleton';

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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">쿼터 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            사용자별 LLM 호출 한도를 관리합니다.
          </p>
        </div>
        <Link
          href="/ops/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 프로젝트 관리로 돌아가기
        </Link>
      </div>

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
            <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </p>
        </div>
      </div>

      <QuotaTableSkeleton rows={5} />
    </div>
  );
}
