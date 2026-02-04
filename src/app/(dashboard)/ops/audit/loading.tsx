import { Search } from 'lucide-react';
import { AuditLogTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

// 공통 스타일 상수
const DISABLED_INPUT_STYLES = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50';
const LABEL_STYLES = 'block text-xs font-medium text-gray-500 mb-1';

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="감사 로그"
        description="시스템 활동 내역을 확인합니다."
      />

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 검색 */}
          <div className="lg:col-span-2">
            <label className={LABEL_STYLES}>검색</label>
            <div className="relative">
              <input
                type="text"
                placeholder="사용자명, 이메일, 대상ID 검색..."
                className={`${DISABLED_INPUT_STYLES} pl-10`}
                disabled
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* 액션 유형 */}
          <div>
            <label className={LABEL_STYLES}>액션</label>
            <select className={DISABLED_INPUT_STYLES} disabled>
              <option value="">전체</option>
            </select>
          </div>

          {/* 대상 유형 */}
          <div>
            <label className={LABEL_STYLES}>대상</label>
            <select className={DISABLED_INPUT_STYLES} disabled>
              <option value="">전체</option>
            </select>
          </div>

          {/* 사용자 */}
          <div>
            <label className={LABEL_STYLES}>사용자</label>
            <select className={DISABLED_INPUT_STYLES} disabled>
              <option value="">전체</option>
            </select>
          </div>
        </div>

        {/* 날짜 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className={LABEL_STYLES}>시작일</label>
            <input type="date" className={DISABLED_INPUT_STYLES} disabled />
          </div>
          <div>
            <label className={LABEL_STYLES}>종료일</label>
            <input type="date" className={DISABLED_INPUT_STYLES} disabled />
          </div>
          <div className="flex items-end">
            <button
              className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50"
              disabled
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      <AuditLogTableSkeleton rows={10} />
    </div>
  );
}
