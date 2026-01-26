/**
 * 스켈레톤 로딩 UI 컴포넌트
 *
 * 데이터 로딩 중 콘텐츠 구조를 미리 보여주어 체감 로딩 시간을 줄이고
 * 레이아웃 시프트를 방지합니다.
 */

// ============================================================================
// 타입 정의
// ============================================================================

interface SkeletonProps {
  className?: string;
}

interface TableSkeletonProps {
  /** 표시할 행 개수 */
  rows?: number;
}

// ============================================================================
// 공통 스타일 상수
// ============================================================================

const TABLE_WRAPPER_STYLES = 'bg-white shadow overflow-hidden rounded-lg animate-pulse';
const TABLE_STYLES = 'min-w-full divide-y divide-gray-200';
const THEAD_STYLES = 'bg-gray-50';
const TBODY_STYLES = 'bg-white divide-y divide-gray-200';
const TH_STYLES = 'text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const TD_STYLES = 'whitespace-nowrap';

// 셀 패딩 변형
const CELL_PADDING = {
  default: 'px-6 py-4',
  compact: 'px-4 py-3',
  header: 'px-6 py-3',
  headerCompact: 'px-4 py-3',
} as const;

// 스켈레톤 바 스타일
const SKELETON_BAR = {
  primary: 'bg-gray-200 rounded',
  secondary: 'bg-gray-100 rounded',
} as const;

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 테이블 헤더를 렌더링합니다.
 */
function renderTableHeaders(
  headers: readonly string[],
  cellPadding: string = CELL_PADDING.header
) {
  return (
    <thead className={THEAD_STYLES}>
      <tr>
        {headers.map((header) => (
          <th key={header} className={`${cellPadding} ${TH_STYLES}`}>
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * 지정된 개수만큼 행을 생성합니다.
 */
function renderRows(count: number, renderRow: (index: number) => React.ReactNode) {
  return Array.from({ length: count }, (_, i) => renderRow(i));
}

// ============================================================================
// 기본 스켈레톤 컴포넌트
// ============================================================================

/**
 * 기본 스켈레톤 컴포넌트
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse ${SKELETON_BAR.primary} ${className}`} />;
}

/**
 * 테이블 행 스켈레톤 (단일 행)
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }, (_, i) => (
        <td key={i} className={`${CELL_PADDING.default} ${TD_STYLES}`}>
          <div className={`h-4 w-3/4 ${SKELETON_BAR.primary}`} />
        </td>
      ))}
    </tr>
  );
}

// ============================================================================
// 테이블 스켈레톤 컴포넌트
// ============================================================================

const PROJECT_TABLE_HEADERS = ['기업명', '업종', '상태', '배정 컨설턴트', '생성일', '작업'] as const;

/**
 * 프로젝트 목록 테이블 스켈레톤
 */
export function ProjectTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className={TABLE_WRAPPER_STYLES}>
      <table className={TABLE_STYLES}>
        {renderTableHeaders(PROJECT_TABLE_HEADERS)}
        <tbody className={TBODY_STYLES}>
          {renderRows(rows, (i) => (
            <tr key={i}>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-32 mb-2 ${SKELETON_BAR.primary}`} />
                <div className={`h-3 w-40 ${SKELETON_BAR.secondary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-20 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-6 w-16 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-24 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-20 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES} text-right`}>
                <div className={`h-4 w-16 ml-auto ${SKELETON_BAR.primary}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const AUDIT_LOG_TABLE_HEADERS = ['일시', '사용자', '액션', '대상', '상세', 'IP'] as const;

/**
 * 감사로그 테이블 스켈레톤
 */
export function AuditLogTableSkeleton({ rows = 10 }: TableSkeletonProps) {
  return (
    <div className={TABLE_WRAPPER_STYLES}>
      <table className={TABLE_STYLES}>
        {renderTableHeaders(AUDIT_LOG_TABLE_HEADERS, CELL_PADDING.headerCompact)}
        <tbody className={TBODY_STYLES}>
          {renderRows(rows, (i) => (
            <tr key={i}>
              <td className={`${CELL_PADDING.compact} ${TD_STYLES}`}>
                <div className={`h-3 w-24 mb-1 ${SKELETON_BAR.primary}`} />
                <div className={`h-3 w-16 ${SKELETON_BAR.secondary}`} />
              </td>
              <td className={`${CELL_PADDING.compact} ${TD_STYLES}`}>
                <div className={`h-4 w-20 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.compact} ${TD_STYLES}`}>
                <div className={`h-5 w-24 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.compact} ${TD_STYLES}`}>
                <div className={`h-4 w-16 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={CELL_PADDING.compact}>
                <div className={`h-4 w-32 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.compact} ${TD_STYLES}`}>
                <div className={`h-4 w-24 ${SKELETON_BAR.primary}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const USER_TABLE_HEADERS = ['사용자', '역할', '상태', '가입일', '작업'] as const;

/**
 * 사용자 관리 테이블 스켈레톤
 */
export function UserTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className={TABLE_WRAPPER_STYLES}>
      <table className={TABLE_STYLES}>
        {renderTableHeaders(USER_TABLE_HEADERS)}
        <tbody className={TBODY_STYLES}>
          {renderRows(rows, (i) => (
            <tr key={i}>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full ${SKELETON_BAR.primary}`} />
                  <div className="ml-4">
                    <div className={`h-4 w-24 mb-2 ${SKELETON_BAR.primary}`} />
                    <div className={`h-3 w-32 ${SKELETON_BAR.secondary}`} />
                  </div>
                </div>
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-5 w-20 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-5 w-16 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-24 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-8 w-16 ${SKELETON_BAR.primary}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const QUOTA_TABLE_HEADERS = ['사용자', '역할', '월간 사용량', '토큰', '일일 한도', '월간 한도', '작업'] as const;

/**
 * 쿼터 관리 테이블 스켈레톤
 */
export function QuotaTableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className={TABLE_WRAPPER_STYLES}>
      <table className={TABLE_STYLES}>
        {renderTableHeaders(QUOTA_TABLE_HEADERS)}
        <tbody className={TBODY_STYLES}>
          {renderRows(rows, (i) => (
            <tr key={i}>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-24 mb-2 ${SKELETON_BAR.primary}`} />
                <div className={`h-3 w-32 ${SKELETON_BAR.secondary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-5 w-16 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className="space-y-2">
                  <div className={`h-4 w-20 ${SKELETON_BAR.primary}`} />
                  <div className={`h-2 w-32 ${SKELETON_BAR.primary}`} />
                </div>
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-3 w-16 mb-1 ${SKELETON_BAR.primary}`} />
                <div className={`h-3 w-16 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-12 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-4 w-12 ${SKELETON_BAR.primary}`} />
              </td>
              <td className={`${CELL_PADDING.default} ${TD_STYLES}`}>
                <div className={`h-6 w-12 ${SKELETON_BAR.primary}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 기타 스켈레톤 컴포넌트
// ============================================================================

/**
 * 카드 스켈레톤
 */
export function CardSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6 animate-pulse">
      <div className={`h-4 w-1/4 mb-4 ${SKELETON_BAR.primary}`} />
      <div className="space-y-3">
        <div className={`h-4 w-full ${SKELETON_BAR.primary}`} />
        <div className={`h-4 w-5/6 ${SKELETON_BAR.primary}`} />
        <div className={`h-4 w-4/6 ${SKELETON_BAR.primary}`} />
      </div>
    </div>
  );
}

/**
 * 상세 페이지 스켈레톤
 */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`h-4 w-24 mb-2 ${SKELETON_BAR.primary}`} />
          <div className={`h-8 w-48 ${SKELETON_BAR.primary}`} />
        </div>
        <div className="flex space-x-3">
          <div className={`h-10 w-24 ${SKELETON_BAR.primary}`} />
          <div className={`h-10 w-24 ${SKELETON_BAR.primary}`} />
        </div>
      </div>

      {/* 정보 카드들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((cardIndex) => (
          <div key={cardIndex} className="bg-white shadow rounded-lg p-6">
            <div className={`h-5 w-32 mb-4 ${SKELETON_BAR.primary}`} />
            <div className="space-y-3">
              {renderRows(4, (i) => (
                <div key={i} className="flex justify-between">
                  <div className={`h-4 w-20 ${SKELETON_BAR.primary}`} />
                  <div className={`h-4 w-32 ${SKELETON_BAR.primary}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 통계 카드 스켈레톤
 */
export function StatsCardSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-4 animate-pulse">
      <div className={`h-4 w-20 mb-2 ${SKELETON_BAR.primary}`} />
      <div className={`h-8 w-16 ${SKELETON_BAR.primary}`} />
    </div>
  );
}

/**
 * 페이지네이션 스켈레톤
 */
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 animate-pulse">
      <div className={`h-4 w-32 ${SKELETON_BAR.primary}`} />
      <div className="flex space-x-2">
        <div className={`h-8 w-16 ${SKELETON_BAR.primary}`} />
        <div className={`h-8 w-16 ${SKELETON_BAR.primary}`} />
      </div>
    </div>
  );
}
