'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchProjectsWithTimeline, fetchProjectFilters, type ProjectWithTimeline } from '../actions';
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
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  FolderOpen,
} from 'lucide-react';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { PROJECT_STATUS_CONFIG } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import MiniStepper from './MiniStepper';

const ITEMS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 5;
const DEFAULT_FILTER_VALUE = 'all';

interface ProjectListProps {
  statusFilter?: ProjectStatus[] | null;
}

export default function ProjectList({ statusFilter }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectWithTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 필터 상태 - 내부 상태는 단일 상태 선택용 (드롭다운)
  const [searchInput, setSearchInput] = useState('');
  const [internalStatus, setInternalStatus] = useState<string>(DEFAULT_FILTER_VALUE);
  const [industry, setIndustry] = useState(DEFAULT_FILTER_VALUE);
  const debouncedSearch = useDebounce(searchInput, 300);

  // 필터 옵션
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    industries: string[];
  }>({ statuses: [], industries: [] });

  // 필터 옵션 로드
  useEffect(() => {
    fetchProjectFilters().then(setFilterOptions);
  }, []);

  // 외부 statusFilter 변경 시 반영 및 페이지 리셋
  useEffect(() => {
    if (statusFilter !== undefined) {
      // 외부에서 배열로 들어오면 내부 상태 초기화 (카드 필터 사용 중)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing external filter is intentional
      setInternalStatus(DEFAULT_FILTER_VALUE);
      setPage(1);
    }
  }, [statusFilter]);

  // 실제 적용할 상태 필터 결정 (외부 prop 우선, 없으면 내부 상태)
  const effectiveStatuses = useMemo(() => {
    if (statusFilter !== null && statusFilter !== undefined) {
      return statusFilter;
    }
    return internalStatus === DEFAULT_FILTER_VALUE ? undefined : [internalStatus as ProjectStatus];
  }, [statusFilter, internalStatus]);

  // 데이터 로드
  const loadData = useCallback(async () => {
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
  }, [page, debouncedSearch, effectiveStatuses, industry]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data loading is intentional
    loadData();
  }, [loadData]);

  // 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting page on filter change is intentional
    setPage(1);
  }, [debouncedSearch, internalStatus, industry, statusFilter]);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setInternalStatus(DEFAULT_FILTER_VALUE);
    setIndustry(DEFAULT_FILTER_VALUE);
    setPage(1);
  };

  // 외부 필터(카드) 또는 내부 필터(드롭다운) 활성화 여부
  const hasFilters = debouncedSearch || internalStatus !== DEFAULT_FILTER_VALUE || industry !== DEFAULT_FILTER_VALUE || (statusFilter && statusFilter.length > 0);

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
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={internalStatus} onValueChange={setInternalStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 상태</SelectItem>
                  {filterOptions.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_CONFIG[s as ProjectStatus]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-full sm:w-[140px]">
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
                <Button variant="ghost" size="icon" onClick={handleResetFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {debouncedSearch && (
                <Badge variant="secondary" className="gap-1">
                  검색: {debouncedSearch}
                  <button onClick={() => setSearchInput('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {internalStatus !== DEFAULT_FILTER_VALUE && (
                <Badge variant="secondary" className="gap-1">
                  상태: {PROJECT_STATUS_CONFIG[internalStatus as ProjectStatus]?.label || internalStatus}
                  <button onClick={() => setInternalStatus(DEFAULT_FILTER_VALUE)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter && statusFilter.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  카드 필터: {[...new Set(statusFilter.map(s => PROJECT_STATUS_CONFIG[s]?.label || s))].join(', ')}
                </Badge>
              )}
              {industry !== DEFAULT_FILTER_VALUE && (
                <Badge variant="secondary" className="gap-1">
                  업종: {industry}
                  <button onClick={() => setIndustry(DEFAULT_FILTER_VALUE)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-base text-muted-foreground">
        <span>총 {total.toLocaleString()}개의 프로젝트</span>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">프로젝트 없음</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters ? '검색 조건에 맞는 프로젝트가 없습니다.' : '등록된 프로젝트가 없습니다.'}
              </p>
              {hasFilters && (
                <Button variant="link" onClick={handleResetFilters} className="mt-2">
                  필터 초기화
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">기업명</TableHead>
                    <TableHead className="min-w-[80px]">업종</TableHead>
                    <TableHead className="min-w-[180px] text-center">진행 상태</TableHead>
                    <TableHead className="min-w-[100px]">담당 컨설턴트</TableHead>
                    <TableHead className="min-w-[110px]">프로젝트 생성일</TableHead>
                    <TableHead className="min-w-[70px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((projectItem) => (
                      <TableRow key={projectItem.id}>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 break-keep">
                                {projectItem.company_name}
                              </div>
                              <div className="text-sm text-muted-foreground break-all">
                                {projectItem.contact_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top">{projectItem.industry}</TableCell>
                        <TableCell className="align-top">
                          <div className="flex justify-center">
                            <MiniStepper
                              status={projectItem.status as ProjectStatus}
                              daysInCurrentStatus={projectItem.days_in_current_status}
                              showLabel={true}
                              showDays={true}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top">
                          {projectItem.assigned_consultant?.name || (
                            <span className="text-gray-400">미배정</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground align-top">
                          {new Date(projectItem.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="align-top">
                          <Link
                            href={`/ops/projects/${projectItem.id}`}
                            className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline cursor-pointer transition-colors duration-150 text-sm"
                          >
                            상세보기
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-base text-muted-foreground">
                    {(page - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(page * ITEMS_PER_PAGE, total)} / {total}개
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
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
                          onClick={() => setPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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
