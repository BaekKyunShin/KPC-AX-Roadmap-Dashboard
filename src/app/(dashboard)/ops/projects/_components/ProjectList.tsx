'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, ChevronLeft, ChevronRight, Building2, FolderOpen, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { PROJECT_STATUS_CONFIG, getStatusFilterOptions } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import {
  fetchProjectsWithTimeline,
  fetchProjectFilters,
  deleteProject,
  type ProjectWithTimeline,
  type ProjectFilterOptions,
} from '../actions';
import MiniStepper from './MiniStepper';
import { TrackBadge } from '@/components/ui/TrackBadge';
import { formatDateKR, formatNumberKR } from '@/lib/utils/date';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { handleSimpleActionResult } from '@/lib/utils/action-result-toast';

const ITEMS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 5;
const DEFAULT_FILTER_VALUE = 'all';
const SEARCH_DEBOUNCE_DELAY = 300;

interface ProjectListProps {
  statusFilter?: ProjectStatus[] | null;
  onResetCardFilter?: () => void;
  initialData?: {
    projects: ProjectWithTimeline[];
    totalPages: number;
    total: number;
    page: number;
  } | null;
}

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

function OpsProjectMobileCard({
  project,
  onDelete,
}: {
  project: ProjectWithTimeline;
  onDelete: (projectId: string, confirmText: string) => ReturnType<typeof deleteProject>;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      {/* 헤더: 기업명(상세보기 링크) + 삭제 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/ops/projects/${project.id}`}
              className="font-medium text-gray-900 break-keep flex items-center gap-2 flex-wrap hover:text-blue-700 hover:underline underline-offset-2"
              title={`${project.company_name} 상세보기`}
            >
              {project.company_name}
              <TrackBadge track={project.track} size="sm" />
            </Link>
            <div className="text-xs text-gray-500 break-all">{project.contact_email}</div>
          </div>
        </div>
        <DeleteProjectDialog
          projectId={project.id}
          companyName={project.company_name}
          onConfirm={(id, confirm) => onDelete(id, confirm)}
        />
      </div>

      {/* 본문: 업종, 컨설턴트, 생성일 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">업종</div>
        <div className="text-gray-900">{project.industry}</div>
        <div className="text-gray-500">담당 컨설턴트</div>
        <div className="text-gray-900">
          {project.assigned_consultant?.name || <span className="text-gray-400">미배정</span>}
        </div>
        <div className="text-gray-500">생성일</div>
        <div className="text-gray-900">{formatDateKR(project.created_at)}</div>
      </div>

      {/* 진행 상태: MiniStepper */}
      <div className="pt-2 border-t">
        <MiniStepper
          status={project.status as ProjectStatus}
          daysInCurrentStatus={project.days_in_current_status}
          showLabel={true}
          showDays={true}
          track={project.track}
        />
      </div>
    </div>
  );
}

export default function ProjectList({
  statusFilter,
  onResetCardFilter,
  initialData = null,
}: ProjectListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const [projects, setProjects] = useState<ProjectWithTimeline[]>(initialData?.projects ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 0);
  const [total, setTotal] = useState(initialData?.total ?? 0);

  // initialData가 제공된 경우 첫 마운트 시 fetch를 스킵하기 위한 ref
  const isInitialMount = useRef(!!initialData);

  // URL searchParams에서 초기값 읽기
  const [searchInput, setSearchInput] = useState(urlSearchParams.get('search') || '');
  const [internalStatus, setInternalStatus] = useState<string>(
    urlSearchParams.get('status') || DEFAULT_FILTER_VALUE
  );
  const [industry, setIndustry] = useState(urlSearchParams.get('industry') || DEFAULT_FILTER_VALUE);
  const [page, setPage] = useState(Number(urlSearchParams.get('page')) || 1);
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY);

  // 필터 옵션 (statuses는 상수 기반이므로 동기 초기화 — 플리커 방지)
  const [filterOptions, setFilterOptions] = useState<ProjectFilterOptions>({
    statuses: getStatusFilterOptions(),
    industries: [],
  });

  // URL 업데이트 헬퍼 (replace로 히스토리 오염 방지)
  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== DEFAULT_FILTER_VALUE && value !== '1') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // page=1은 기본값이므로 URL에서 제거
    if (params.get('page') === '1') params.delete('page');
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false });
  };

  // 업종 옵션만 비동기 로드 (statuses는 이미 동기 초기화됨)
  useEffect(() => {
    fetchProjectFilters().then((result) => {
      setFilterOptions((prev) => ({ ...prev, industries: result.industries }));
    });
  }, []);

  // 외부 statusFilter(요약 카드 클릭) 활성화 시 드롭다운 초기화
  // 주의: null/undefined일 때는 실행하지 않아야 마운트 시 URL 상태를 보존함
  useEffect(() => {
    if (Array.isArray(statusFilter) && statusFilter.length > 0) {
      setInternalStatus(DEFAULT_FILTER_VALUE);
      setPage(1);
    }
  }, [statusFilter]);

  // 선택된 상태 필터 옵션 (드롭다운 선택)
  const selectedStatusOption =
    internalStatus === DEFAULT_FILTER_VALUE
      ? null
      : (filterOptions.statuses.find((opt) => opt.value === internalStatus) ?? null);

  // 실제 적용할 상태 필터 결정 (외부 prop 우선, 없으면 내부 상태)
  const effectiveStatuses =
    statusFilter !== null && statusFilter !== undefined
      ? statusFilter
      : selectedStatusOption?.statuses;

  // 프로젝트 삭제 핸들러 — DeleteProjectDialog 가 onConfirm 으로 호출.
  // 성공 시 토스트 + 목록 즉시 재로드 (router.refresh 대신 loadData 가 더 빠름).
  const handleDeleteProject = async (projectId: string, confirmText: string) => {
    const result = await deleteProject({ project_id: projectId, confirm_text: confirmText });
    await handleSimpleActionResult(result, {
      successMessage: { title: '프로젝트가 삭제되었습니다.' },
      errorTitle: '프로젝트 삭제 실패',
      errorFallback: '프로젝트 삭제 중 오류가 발생했습니다.',
    });
    if (result.success) {
      await loadData();
    }
    return result;
  };

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    const result = await fetchProjectsWithTimeline({
      page,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearch,
      statuses: effectiveStatuses,
      industry: industry === DEFAULT_FILTER_VALUE ? '' : industry,
    });
    setProjects(result.projects);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setLoading(false);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [page, debouncedSearch, effectiveStatuses, industry]);

  // 디바운스된 검색어 변경 시 URL 업데이트 + 첫 페이지로 리셋
  useEffect(() => {
    const currentSearch = urlSearchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      setPage(1);
      updateParams({ search: debouncedSearch, page: '1' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // 상태 필터 변경 핸들러
  const handleStatusChange = (value: string) => {
    setInternalStatus(value);
    setPage(1);
    updateParams({ status: value, page: '1' });
  };

  // 업종 필터 변경 핸들러
  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    setPage(1);
    updateParams({ industry: value, page: '1' });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateParams({ page: String(newPage) });
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setInternalStatus(DEFAULT_FILTER_VALUE);
    setIndustry(DEFAULT_FILTER_VALUE);
    setPage(1);
    router.replace(pathname, { scroll: false });
    onResetCardFilter?.();
  };

  // 외부 필터(카드) 또는 내부 필터(드롭다운) 활성화 여부
  const hasFilters =
    debouncedSearch ||
    internalStatus !== DEFAULT_FILTER_VALUE ||
    industry !== DEFAULT_FILTER_VALUE ||
    (statusFilter && statusFilter.length > 0);

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="회사명 또는 이메일 검색..."
                aria-label="회사명 또는 이메일 검색"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={internalStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[140px]" aria-label="상태 필터">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 상태</SelectItem>
                  {filterOptions.statuses.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={industry} onValueChange={handleIndustryChange}>
                <SelectTrigger className="w-full sm:w-[140px]" aria-label="업종 필터">
                  <SelectValue placeholder="업종" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 업종</SelectItem>
                  {filterOptions.industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
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
                  onClear={() => setSearchInput('')}
                />
              )}
              {selectedStatusOption && (
                <FilterBadge
                  label="상태"
                  value={selectedStatusOption.label}
                  onClear={() => handleStatusChange(DEFAULT_FILTER_VALUE)}
                />
              )}
              {statusFilter && statusFilter.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  카드 필터:{' '}
                  {[...new Set(statusFilter.map((s) => PROJECT_STATUS_CONFIG[s]?.label || s))].join(
                    ', '
                  )}
                </Badge>
              )}
              {industry !== DEFAULT_FILTER_VALUE && (
                <FilterBadge
                  label="업종"
                  value={industry}
                  onClear={() => handleIndustryChange(DEFAULT_FILTER_VALUE)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-base text-muted-foreground">
        <span>총 {formatNumberKR(total)}개의 프로젝트</span>
        {totalPages > 0 && (
          <span>
            {page} / {totalPages} 페이지
          </span>
        )}
      </div>

      {/* 테이블 */}
      {loading ? (
        <ProjectTableSkeleton rows={5} />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {projects.length === 0 ? (
            // #4 — EmptyState 통일 (필터 없음 / 필터 활성 분기)
            hasFilters ? (
              <EmptyState
                icon={<Search className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
                title="검색 조건에 맞는 프로젝트가 없습니다"
                description="필터를 초기화하거나 다른 검색어를 시도해보세요"
                action={
                  <Button variant="outline" onClick={handleResetFilters}>
                    필터 초기화
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<FolderOpen className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
                title="등록된 프로젝트가 없습니다"
                description="새 프로젝트를 생성하여 컨설턴트를 배정하세요"
                action={
                  <Button asChild>
                    <Link href="/ops/projects/new">
                      <Plus className="mr-2 h-4 w-4" />새 프로젝트 생성
                    </Link>
                  </Button>
                }
              />
            )
          ) : (
            <>
              {/* 데스크톱: 테이블 뷰 */}
              <div className="hidden md:block">
                <Table className="min-w-[1060px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[260px] text-center pl-6">기업명</TableHead>
                      <TableHead className="w-[80px]">트랙</TableHead>
                      <TableHead className="w-[110px]">업종</TableHead>
                      <TableHead className="w-[220px] text-center">진행 상태</TableHead>
                      <TableHead className="w-[120px]">담당 컨설턴트</TableHead>
                      <TableHead className="w-[110px]">프로젝트 생성일</TableHead>
                      <TableHead className="w-[80px] text-center pr-6">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((projectItem) => (
                      <TableRow key={projectItem.id}>
                        <TableCell className="align-top text-left pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 text-left">
                              <Link
                                href={`/ops/projects/${projectItem.id}`}
                                className="font-medium text-gray-900 break-keep truncate hover:text-blue-700 hover:underline underline-offset-2 block"
                                title={`${projectItem.company_name} 상세보기`}
                              >
                                {projectItem.company_name}
                              </Link>
                              <div
                                className="text-sm text-muted-foreground truncate"
                                title={projectItem.contact_email}
                              >
                                {projectItem.contact_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <TrackBadge track={projectItem.track} />
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground align-top truncate"
                          title={projectItem.industry}
                        >
                          {projectItem.industry}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex justify-center">
                            <MiniStepper
                              status={projectItem.status as ProjectStatus}
                              daysInCurrentStatus={projectItem.days_in_current_status}
                              showLabel={true}
                              showDays={true}
                              track={projectItem.track}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top truncate">
                          {projectItem.assigned_consultant?.name || (
                            <span className="text-gray-400">미배정</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top whitespace-nowrap">
                          {formatDateKR(projectItem.created_at)}
                        </TableCell>
                        <TableCell className="align-top text-center pr-6">
                          <div className="flex justify-center">
                            <DeleteProjectDialog
                              projectId={projectItem.id}
                              companyName={projectItem.company_name}
                              onConfirm={handleDeleteProject}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 모바일: 카드 뷰 */}
              <div className="md:hidden space-y-3 p-4">
                {projects.map((projectItem) => (
                  <OpsProjectMobileCard
                    key={projectItem.id}
                    project={projectItem}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-base text-muted-foreground">
                    {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, total)} /{' '}
                    {total}개
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1 || loading}
                      aria-label="이전 페이지"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(MAX_VISIBLE_PAGES, totalPages) }, (_, i) => {
                      let pageNum;
                      const middlePage = Math.ceil(MAX_VISIBLE_PAGES / 2);
                      if (totalPages <= MAX_VISIBLE_PAGES) {
                        pageNum = i + 1;
                      } else if (page <= middlePage) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - (middlePage - 1)) {
                        pageNum = totalPages - MAX_VISIBLE_PAGES + 1 + i;
                      } else {
                        pageNum = page - (middlePage - 1) + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages || loading}
                      aria-label="다음 페이지"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
