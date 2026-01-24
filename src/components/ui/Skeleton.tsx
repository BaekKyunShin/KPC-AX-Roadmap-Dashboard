/**
 * 스켈레톤 로딩 UI 컴포넌트들
 */

interface SkeletonProps {
  className?: string;
}

// 기본 스켈레톤
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
    />
  );
}

// 테이블 행 스켈레톤
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// 프로젝트 목록 테이블 스켈레톤
export function ProjectTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['기업명', '업종', '상태', '배정 컨설턴트', '생성일', '작업'].map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded w-16" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="h-4 bg-gray-200 rounded w-16 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 카드 스켈레톤
export function CardSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

// 감사로그 테이블 스켈레톤
export function AuditLogTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['일시', '사용자', '액션', '대상', '상세', 'IP'].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="h-5 bg-gray-200 rounded w-24" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-16" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-32" />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 사용자 관리 테이블 스켈레톤
export function UserTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['사용자', '역할', '상태', '가입일', '작업'].map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="ml-4">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-5 bg-gray-200 rounded w-20" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-5 bg-gray-200 rounded w-16" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-8 bg-gray-200 rounded w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 상세 페이지 스켈레톤
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-48" />
        </div>
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* 정보 카드들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 통계 카드 스켈레톤
export function StatsCardSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  );
}

// 페이지네이션 스켈레톤
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32" />
      <div className="flex space-x-2">
        <div className="h-8 bg-gray-200 rounded w-16" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}
