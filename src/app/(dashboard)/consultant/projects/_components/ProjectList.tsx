'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  fetchConsultantProjects,
  fetchConsultantProjectFilters,
  type ConsultantProjectItem,
  type ConsultantProjectListResult,
} from '../actions';
import { ConsultantProjectTableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, ClipboardList } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { getConsultantProjectStatusBadge } from '@/lib/constants/status';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';

// =============================================================================
// Types
// =============================================================================

interface StatusOption {
  value: string;
  label: string;
}

interface FilterOptions {
  statuses: StatusOption[];
}

// =============================================================================
// Constants
// =============================================================================

/** 필터 기본값 - 모든 상태 선택 */
const ALL_STATUS_VALUE = 'all';

/** 검색 디바운스 지연 시간 (ms) */
const SEARCH_DEBOUNCE_DELAY = 300;



/** 테이블 열 설정 */
const TABLE_COLUMNS = {
  company: 'min-w-[140px]',
  industry: 'min-w-[100px]',
  size: 'min-w-[80px]',
  status: 'min-w-[100px]',
  assignedAt: 'min-w-[100px]',
  actions: 'min-w-[80px]',
} as const;

/** 필터 옵션 초기 상태 */
const INITIAL_FILTER_OPTIONS: FilterOptions = { statuses: [] };

// =============================================================================
// Helpers
// =============================================================================

/**
 * 날짜를 한국어 형식으로 포맷팅
 */
function formatDateKR(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR');
}

/**
 * 기업 규모 라벨을 간략화 (인원수·괄호 제거)
 */
function formatCompanySize(size: string): string {
  return COMPANY_SIZE_LABELS[size as CompanySizeValue]
    ?.replace(/\d+[~,]?\d*명\s*/, '')
    ?.replace(/[()]/g, '')
    || size;
}

/**
 * 상태 옵션에서 라벨 찾기
 */
function findStatusLabel(statuses: StatusOption[], value: string): string {
  return statuses.find((s) => s.value === value)?.label || value;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * 프로젝트 상태 배지
 */
function ProjectStatusBadge({
  status,
  hasInterview,
}: {
  status: string;
  hasInterview: boolean;
}) {
  const badge = getConsultantProjectStatusBadge(status, hasInterview);
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
      {badge.label}
    </span>
  );
}

/**
 * 필터 배지 (개별)
 */
function FilterBadge({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1">
      {label}: {value}
      <button onClick={onClear} aria-label={`${label} 필터 제거`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/**
 * 프로젝트 테이블 행
 */
function ProjectRow({ project }: { project: ConsultantProjectItem }) {
  const displayDate = project.assigned_at || project.created_at;

  return (
    <TableRow>
      <TableCell>
        <div className="text-sm font-medium text-gray-900">
          {project.company_name}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{project.industry}</TableCell>
      <TableCell className="text-muted-foreground">{formatCompanySize(project.company_size)}</TableCell>
      <TableCell>
        <ProjectStatusBadge status={project.status} hasInterview={project.has_interview} />
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateKR(displayDate)}</TableCell>
      <TableCell className="font-medium">
        <Link
          href={`/consultant/projects/${project.id}`}
          className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors duration-150"
        >
          상세 보기
        </Link>
      </TableCell>
    </TableRow>
  );
}

/**
 * 프로젝트 모바일 카드
 */
function ProjectMobileCard({ project }: { project: ConsultantProjectItem }) {
  const displayDate = project.assigned_at || project.created_at;

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900">{project.company_name}</div>
        </div>
        <ProjectStatusBadge status={project.status} hasInterview={project.has_interview} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">업종</div>
        <div className="text-gray-900">{project.industry}</div>
        <div className="text-gray-500">규모</div>
        <div className="text-gray-900">{formatCompanySize(project.company_size)}</div>
        <div className="text-gray-500">배정일</div>
        <div className="text-gray-900">{formatDateKR(displayDate)}</div>
      </div>
      <div className="flex justify-end pt-2 border-t">
        <Link
          href={`/consultant/projects/${project.id}`}
          className="text-sm text-primary hover:underline"
        >
          상세 보기
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ProjectListProps {
  initialData?: ConsultantProjectListResult | null;
  initialFilters?: FilterOptions | null;
}

export default function ProjectList({ initialData = null, initialFilters = null }: ProjectListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  // 데이터 상태 — initialData가 있으면 즉시 사용
  const [projects, setProjects] = useState<ConsultantProjectItem[]>(initialData?.projects ?? []);
  const [consultantName, setConsultantName] = useState(initialData?.consultantName ?? '');
  const [loading, setLoading] = useState(!initialData);
  const [total, setTotal] = useState(initialData?.total ?? 0);

  // URL searchParams에서 초기값 읽기
  const [searchInput, setSearchInput] = useState(urlSearchParams.get('search') || '');
  const [status, setStatus] = useState(urlSearchParams.get('status') || ALL_STATUS_VALUE);
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY);

  // 필터 옵션 — initialFilters가 있으면 즉시 사용
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilters ?? INITIAL_FILTER_OPTIONS);

  // initialData가 제공된 경우 첫 마운트 시 fetch를 스킵하기 위한 ref
  const isInitialMount = useRef(!!initialData);



  // 파생 상태
  const hasFilters = debouncedSearch || status !== ALL_STATUS_VALUE;
  const isStatusFiltered = status !== ALL_STATUS_VALUE;

  // URL 업데이트 헬퍼
  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== ALL_STATUS_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ''}`);
  };

  // 필터 옵션 로드 — initialFilters가 없을 때만 fetch
  useEffect(() => {
    if (!initialFilters) {
      fetchConsultantProjectFilters().then(setFilterOptions);
    }
  }, [initialFilters]);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    const result = await fetchConsultantProjects({
      search: debouncedSearch,
      status: isStatusFiltered ? status : '',
    });
    setProjects(result.projects);
    setTotal(result.total);
    setConsultantName(result.consultantName);
    setLoading(false);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [debouncedSearch, status]);

  // 디바운스된 검색어 변경 시 URL 업데이트
  useEffect(() => {
    const currentSearch = urlSearchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateParams({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // 이벤트 핸들러
  const handleStatusChange = (value: string) => {
    setStatus(value);
    updateParams({ status: value });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setStatus(ALL_STATUS_VALUE);
    router.replace(pathname);
  };

  const handleClearSearch = () => setSearchInput('');
  const handleClearStatus = () => handleStatusChange(ALL_STATUS_VALUE);

  // 헤더 설명 텍스트
  const headerDescription = consultantName
    ? `${consultantName}님의 담당 프로젝트 목록입니다.`
    : '담당 프로젝트 목록입니다.';

  // 빈 상태 메시지
  const emptyStateTitle = hasFilters
    ? '검색 조건에 맞는 프로젝트가 없습니다'
    : '담당 프로젝트가 없습니다';
  const emptyStateDescription = hasFilters
    ? undefined
    : '운영 관리자가 프로젝트를 배정하면 여기에 표시됩니다.';

  return (
    <div className="space-y-4">
      <PageHeader title="담당 프로젝트" description={headerDescription} />

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* 검색 입력 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="기업명 또는 업종 검색..."
                aria-label="기업명 또는 업종 검색"
                className="pl-9"
              />
            </div>

            {/* 필터 컨트롤 */}
            <div className="flex flex-wrap gap-2">
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[140px]" aria-label="상태 필터">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>모든 상태</SelectItem>
                  {filterOptions.statuses.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetFilters}
                  aria-label="필터 초기화"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {debouncedSearch && (
                <FilterBadge
                  label="검색"
                  value={debouncedSearch}
                  onClear={handleClearSearch}
                />
              )}
              {isStatusFiltered && (
                <FilterBadge
                  label="상태"
                  value={findStatusLabel(filterOptions.statuses, status)}
                  onClear={handleClearStatus}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-base text-muted-foreground">
        <span>총 {total.toLocaleString()}개의 프로젝트</span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <ConsultantProjectTableSkeleton rows={5} />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {projects.length === 0 ? (
              <EmptyState
                icon={
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
                    <ClipboardList className="h-8 w-8 text-muted-foreground" />
                  </div>
                }
                title={emptyStateTitle}
                description={emptyStateDescription}
                action={
                  hasFilters && (
                    <Button variant="link" onClick={handleResetFilters}>
                      필터 초기화
                    </Button>
                  )
                }
              />
            ) : (
              <>
              {/* 데스크톱: 테이블 뷰 */}
              <div className="hidden md:block">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className={TABLE_COLUMNS.company}>기업명</TableHead>
                      <TableHead className={TABLE_COLUMNS.industry}>업종</TableHead>
                      <TableHead className={TABLE_COLUMNS.size}>규모</TableHead>
                      <TableHead className={TABLE_COLUMNS.status}>상태</TableHead>
                      <TableHead className={TABLE_COLUMNS.assignedAt}>배정일</TableHead>
                      <TableHead className={TABLE_COLUMNS.actions}>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <ProjectRow key={project.id} project={project} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 모바일: 카드 뷰 */}
              <div className="md:hidden space-y-3 p-4">
                {projects.map((project) => (
                  <ProjectMobileCard key={project.id} project={project} />
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
