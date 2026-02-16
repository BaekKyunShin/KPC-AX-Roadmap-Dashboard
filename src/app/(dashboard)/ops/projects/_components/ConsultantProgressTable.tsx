import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ConsultantProgress } from '../actions';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

/** 컨설턴트 테이블 정렬 키 */
type ConsultantSortKey =
  | 'name'
  | 'total'
  | 'assigned'
  | 'interviewing'
  | 'drafting'
  | 'completed';

/** 정렬 순서 */
type SortOrder = 'asc' | 'desc';

/** 컨설턴트 테이블 컬럼 정의 */
interface ConsultantTableColumn {
  key: ConsultantSortKey;
  label: string;
  className?: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 컨설턴트 테이블 기본 표시 행 수 */
const DEFAULT_CONSULTANT_ROWS = 5;

/** 컨설턴트 테이블 컬럼 설정 */
const CONSULTANT_TABLE_COLUMNS: ConsultantTableColumn[] = [
  { key: 'name', label: '컨설턴트', className: 'text-left' },
  { key: 'total', label: '총 담당 프로젝트' },
  { key: 'assigned', label: '프로젝트 수행 전' },
  { key: 'interviewing', label: '현장 인터뷰 완료' },
  { key: 'drafting', label: '로드맵 초안 완료' },
  { key: 'completed', label: '로드맵 확정 완료' },
] as const;

/** 공통 스타일 */
const STYLES = {
  tableCell: 'py-3 px-4',
  tableCellNumber: 'py-3 px-4 text-right text-sm tabular-nums',
} as const;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 컨설턴트 데이터 정렬
 */
function sortConsultantData(
  data: ConsultantProgress[],
  sortKey: ConsultantSortKey,
  sortOrder: SortOrder
): ConsultantProgress[] {
  const sortedData = [...data];

  sortedData.sort((a, b) => {
    const aValue = sortKey === 'name' ? a.name : a[sortKey];
    const bValue = sortKey === 'name' ? b.name : b[sortKey];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue, 'ko');
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    const numA = aValue as number;
    const numB = bValue as number;
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  return sortedData;
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 정렬 아이콘 */
function SortIcon({
  columnKey,
  currentSortKey,
  sortOrder,
}: {
  columnKey: ConsultantSortKey;
  currentSortKey: ConsultantSortKey;
  sortOrder: SortOrder;
}) {
  if (columnKey !== currentSortKey) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  }
  return sortOrder === 'desc' ? (
    <ChevronDown className="h-3.5 w-3.5" />
  ) : (
    <ChevronUp className="h-3.5 w-3.5" />
  );
}

/** 컨설턴트 테이블 헤더 */
function ConsultantTableHeader({
  sortKey,
  sortOrder,
  onSort,
}: {
  sortKey: ConsultantSortKey;
  sortOrder: SortOrder;
  onSort: (key: ConsultantSortKey) => void;
}) {
  return (
    <thead>
      <tr className="border-b text-sm text-muted-foreground">
        {CONSULTANT_TABLE_COLUMNS.map((col) => (
          <th
            key={col.key}
            className={`${STYLES.tableCell} font-medium ${col.className || 'text-right'}`}
          >
            <button
              onClick={() => onSort(col.key)}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {col.label}
              <SortIcon
                columnKey={col.key}
                currentSortKey={sortKey}
                sortOrder={sortOrder}
              />
            </button>
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** 숫자 셀 (0일 때 회색 처리) */
function NumberCell({ value }: { value: number }) {
  return (
    <td className={STYLES.tableCellNumber}>
      <span className={value === 0 ? 'text-gray-300' : ''}>{value}</span>
    </td>
  );
}

/** 컨설턴트 테이블 행 */
function ConsultantTableRow({
  consultant,
}: {
  consultant: ConsultantProgress;
}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50 transition-colors text-sm">
      <td className={`${STYLES.tableCell} text-left font-medium`}>
        {consultant.name}
      </td>
      <td
        className={`${STYLES.tableCell} text-right tabular-nums font-semibold`}
      >
        {consultant.total}
      </td>
      <NumberCell value={consultant.assigned} />
      <NumberCell value={consultant.interviewing} />
      <NumberCell value={consultant.drafting} />
      <NumberCell value={consultant.completed} />
    </tr>
  );
}

/** 더보기/접기 버튼 */
function ExpandCollapseButton({
  isExpanded,
  remainingCount,
  onClick,
}: {
  isExpanded: boolean;
  remainingCount: number;
  onClick: () => void;
}) {
  if (remainingCount <= 0) return null;

  return (
    <div className="flex justify-center pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            접기
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            더보기 ({remainingCount}명 더 있음)
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ConsultantProgressTable({
  data,
}: {
  data: ConsultantProgress[];
}) {
  const [sortKey, setSortKey] = useState<ConsultantSortKey>('total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAllConsultants, setShowAllConsultants] = useState(false);

  const sortedConsultantData = sortConsultantData(data, sortKey, sortOrder);

  const displayedConsultants = showAllConsultants
    ? sortedConsultantData
    : sortedConsultantData.slice(0, DEFAULT_CONSULTANT_ROWS);

  const remainingCount = sortedConsultantData.length - DEFAULT_CONSULTANT_ROWS;

  const handleSort = (key: ConsultantSortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const toggleShowAllConsultants = () => {
    setShowAllConsultants((prev) => !prev);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-purple-600" />
            컨설턴트별 현황
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            총 {data.length}명의 컨설턴트
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <ConsultantTableHeader
                  sortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <tbody>
                  {displayedConsultants.map((consultant) => (
                    <ConsultantTableRow
                      key={consultant.id}
                      consultant={consultant}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <ExpandCollapseButton
              isExpanded={showAllConsultants}
              remainingCount={remainingCount}
              onClick={toggleShowAllConsultants}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center text-muted-foreground h-32">
            배정된 프로젝트가 있는 컨설턴트가 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}
