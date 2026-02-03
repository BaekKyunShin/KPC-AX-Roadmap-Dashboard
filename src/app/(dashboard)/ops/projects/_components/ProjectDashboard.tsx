'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  fetchProjectStats,
  fetchMonthlyCompletions,
  fetchConsultantProgress,
  fetchStalledProjects,
  type ProjectStats,
  type MonthlyCompletion,
  type ConsultantProgress,
  type StalledProject,
} from '../actions';
import {
  PROJECT_STATUS_CONFIG,
  PROJECT_WORKFLOW_STEPS,
  PROJECT_STALL_THRESHOLDS,
  STALLED_STATUS_MESSAGES,
} from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Label,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

/** 컨설턴트 테이블 정렬 키 */
type ConsultantSortKey = 'name' | 'total' | 'assigned' | 'interviewing' | 'drafting' | 'completed';

/** 정렬 순서 */
type SortOrder = 'asc' | 'desc';

/** 컨설턴트 테이블 컬럼 정의 */
interface ConsultantTableColumn {
  key: ConsultantSortKey;
  label: string;
  className?: string;
}

/** 파이 차트 데이터 항목 */
interface PieChartDataItem {
  name: string;
  value: number;
  stepKey: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 워크플로우 단계별 차트 색상 */
const WORKFLOW_STEP_COLORS: Record<string, string> = {
  new: '#9CA3AF',
  diagnosed: '#3B82F6',
  assigned: '#22C55E',
  interviewed: '#F59E0B',
  drafted: '#F97316',
  finalized: '#10B981',
} as const;

/** 컨설턴트 테이블 기본 표시 행 수 */
const DEFAULT_CONSULTANT_ROWS = 5;

/** 정체 프로젝트 카드 너비 (px) */
const STALLED_CARD_WIDTH = 220;

/** 차트 높이 (px) */
const CHART_HEIGHT = 200;

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
  emptyState: 'flex items-center justify-center text-muted-foreground',
  tableCell: 'py-3 px-4',
  tableCellNumber: 'py-3 px-4 text-right text-sm tabular-nums',
} as const;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 프로젝트 통계를 파이 차트 데이터로 변환
 */
function transformToPieChartData(stats: ProjectStats): PieChartDataItem[] {
  return PROJECT_WORKFLOW_STEPS.map((step) => {
    const count = step.statuses.reduce((sum, status) => {
      return sum + (stats.byStatus[status] || 0);
    }, 0);
    return {
      name: step.label,
      value: count,
      stepKey: step.key,
    };
  }).filter((item) => item.value > 0);
}

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
// 하위 컴포넌트 - 스켈레톤
// ============================================================================

/** 대시보드 로딩 스켈레톤 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 차트 영역 스켈레톤 */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-6 w-40 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 컨설턴트 테이블 스켈레톤 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-6 w-48 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
      {/* 정체 프로젝트 스켈레톤 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-6 w-36 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[140px] bg-gray-100 rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 하위 컴포넌트 - 차트
// ============================================================================

/** 도넛 차트 중앙 라벨 */
function DonutCenterLabel({ total }: { total: number }) {
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-foreground"
    >
      <tspan x="50%" dy="-0.5em" className="text-2xl font-bold">
        {total}
      </tspan>
      <tspan x="50%" dy="1.4em" className="text-xs fill-muted-foreground">
        전체 프로젝트
      </tspan>
    </text>
  );
}

/** 상태별 분포 차트 범례 항목 */
function ChartLegendItem({
  item,
  total,
}: {
  item: PieChartDataItem;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: WORKFLOW_STEP_COLORS[item.stepKey] }}
        />
        <span className="text-muted-foreground">{item.name}</span>
      </div>
      <span className="font-medium tabular-nums">
        {item.value}건 ({percentage}%)
      </span>
    </div>
  );
}

// ============================================================================
// 하위 컴포넌트 - 컨설턴트 테이블
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
function ConsultantTableRow({ consultant }: { consultant: ConsultantProgress }) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50 transition-colors text-sm">
      <td className={`${STYLES.tableCell} text-left font-medium`}>
        {consultant.name}
      </td>
      <td className={`${STYLES.tableCell} text-right tabular-nums font-semibold`}>
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
// 하위 컴포넌트 - 정체 프로젝트
// ============================================================================

/** 정체 프로젝트 카드 */
function StalledProjectCard({ project }: { project: StalledProject }) {
  const projectStatus = project.status as ProjectStatus;
  const statusMessage = STALLED_STATUS_MESSAGES[projectStatus] ?? '상태 변경 후';
  const isSevere = project.days_stalled >= PROJECT_STALL_THRESHOLDS.SEVERE;
  const statusConfig = PROJECT_STATUS_CONFIG[projectStatus];

  return (
    <div
      className="flex-shrink-0 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ width: STALLED_CARD_WIDTH }}
    >
      {/* 기업명 */}
      <h4
        className="font-semibold text-base text-center truncate"
        title={project.company_name}
      >
        {project.company_name}
      </h4>

      {/* 담당 컨설턴트 */}
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground">담당 컨설턴트</span>
        <p className="text-sm font-medium mt-0.5">
          {project.assigned_consultant?.name || '미배정'}
        </p>
      </div>

      {/* 상태 배지 */}
      <div className="mt-4 flex justify-center">
        <Badge
          variant="outline"
          className={statusConfig?.color || 'bg-gray-100'}
        >
          {statusConfig?.label || project.status}
        </Badge>
      </div>

      {/* 경과일 */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
        <p
          className={`text-xl font-bold mt-1 ${
            isSevere ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          {project.days_stalled}일 경과
        </p>
      </div>

      {/* 상세보기 버튼 */}
      <div className="mt-4">
        <Link href={`/ops/projects/${project.id}`} className="block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-blue-600 hover:text-blue-700"
          >
            상세보기
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** 정체 프로젝트 빈 상태 */
function StalledProjectsEmpty() {
  return (
    <div className={`${STYLES.emptyState} py-8`}>
      <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
      <span>
        {PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN}일 이상 정체된 프로젝트가
        없습니다
      </span>
    </div>
  );
}

/** 정체 프로젝트 카드 목록 */
function StalledProjectCardList({ projects }: { projects: StalledProject[] }) {
  if (projects.length === 0) {
    return <StalledProjectsEmpty />;
  }

  return (
    <div className="relative">
      {/* 스크롤 영역 */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {projects.map((project) => (
          <div key={project.id} className="snap-start">
            <StalledProjectCard project={project} />
          </div>
        ))}
      </div>
      {/* 우측 스크롤 힌트 그라데이션 */}
      {projects.length > 1 && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}

// ============================================================================
// 하위 컴포넌트 - 빈 상태
// ============================================================================

/** 데이터 없음 표시 */
function EmptyDataMessage({ height = 'h-48' }: { height?: string }) {
  return (
    <div className={`${STYLES.emptyState} ${height}`}>데이터가 없습니다</div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ProjectDashboard() {
  // 데이터 상태
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyCompletion[]>([]);
  const [consultantData, setConsultantData] = useState<ConsultantProgress[]>([]);
  const [stalledProjects, setStalledProjects] = useState<StalledProject[]>([]);
  const [loading, setLoading] = useState(true);

  // 컨설턴트 테이블 상태
  const [sortKey, setSortKey] = useState<ConsultantSortKey>('total');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAllConsultants, setShowAllConsultants] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, monthly, consultant, stalled] = await Promise.all([
          fetchProjectStats(),
          fetchMonthlyCompletions(),
          fetchConsultantProgress(),
          fetchStalledProjects(),
        ]);
        setStats(statsData);
        setMonthlyData(monthly);
        setConsultantData(consultant);
        setStalledProjects(stalled);
      } catch (error) {
        console.error('[ProjectDashboard] 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 컨설턴트 데이터 정렬 (메모이제이션)
  const sortedConsultantData = useMemo(
    () => sortConsultantData(consultantData, sortKey, sortOrder),
    [consultantData, sortKey, sortOrder]
  );

  // 표시할 컨설턴트 목록
  const displayedConsultants = showAllConsultants
    ? sortedConsultantData
    : sortedConsultantData.slice(0, DEFAULT_CONSULTANT_ROWS);

  const remainingCount = sortedConsultantData.length - DEFAULT_CONSULTANT_ROWS;

  // 정렬 핸들러
  const handleSort = useCallback((key: ConsultantSortKey) => {
    if (sortKey === key) {
      // 같은 키면 정렬 순서 토글
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // 다른 키면 새 키로 변경하고 내림차순으로 초기화
      setSortKey(key);
      setSortOrder('desc');
    }
  }, [sortKey]);

  // 더보기/접기 토글
  const toggleShowAllConsultants = useCallback(() => {
    setShowAllConsultants((prev) => !prev);
  }, []);

  // 로딩 상태
  if (loading) {
    return <DashboardSkeleton />;
  }

  // 파이 차트 데이터
  const pieChartData = stats ? transformToPieChartData(stats) : [];

  return (
    <div className="space-y-6">
      {/* 첫 번째 행: 상태별 분포 + 월별 추이 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 상태별 프로젝트 분포 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              상태별 프로젝트 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={WORKFLOW_STEP_COLORS[entry.stepKey]}
                        />
                      ))}
                      <Label
                        content={<DonutCenterLabel total={stats?.total || 0} />}
                        position="center"
                      />
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}건`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieChartData.map((item) => (
                    <ChartLegendItem
                      key={item.stepKey}
                      item={item}
                      total={stats?.total || 0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyDataMessage />
            )}
          </CardContent>
        </Card>

        {/* 월별 로드맵 확정 현황 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              월별 로드맵 확정 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={monthlyData}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}건`, '확정']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyDataMessage />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 두 번째 행: 컨설턴트별 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              컨설턴트별 현황
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              총 {consultantData.length}명의 컨설턴트
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {consultantData.length > 0 ? (
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
            <div className={`${STYLES.emptyState} h-32`}>
              배정된 프로젝트가 있는 컨설턴트가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 세 번째 행: 정체 프로젝트 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                정체 프로젝트
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {PROJECT_STALL_THRESHOLDS.DASHBOARD_MIN}일 이상 동일 단계에
                머물러 있는 프로젝트
              </p>
            </div>
            {stalledProjects.length > 0 && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                {stalledProjects.length}건
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <StalledProjectCardList projects={stalledProjects} />
        </CardContent>
      </Card>
    </div>
  );
}
