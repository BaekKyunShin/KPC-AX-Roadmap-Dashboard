'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchConsultantProjects, fetchConsultantProjectFilters, type ConsultantProjectItem } from '../actions';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput, SelectFilter, ActiveFilterBadges } from '@/components/ui/SearchInput';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { getConsultantProjectStatusBadge } from '@/lib/constants/status';

// =============================================================================
// Constants
// =============================================================================

/** 테이블 열 설정 - 데스크톱 전용 (모바일에서는 카드 레이아웃 사용) */
const TABLE_COLUMNS = {
  company: 'min-w-[140px]',
  industry: 'min-w-[100px]',
  size: 'min-w-[80px]',
  status: 'min-w-[100px]',
  assignedAt: 'min-w-[100px]',
  actions: 'min-w-[80px]',
} as const;

// =============================================================================
// Component
// =============================================================================

export default function ProjectList() {
  const [projects, setProjects] = useState<ConsultantProjectItem[]>([]);
  const [consultantName, setConsultantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // 필터 옵션
  const [filterOptions, setFilterOptions] = useState<{
    statuses: { value: string; label: string }[];
  }>({ statuses: [] });

  // 필터 옵션 로드
  useEffect(() => {
    fetchConsultantProjectFilters().then(setFilterOptions);
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchConsultantProjects({
      search: debouncedSearch,
      status,
    });
    setProjects(result.projects);
    setTotal(result.total);
    setConsultantName(result.consultantName);
    setLoading(false);
  }, [debouncedSearch, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data loading is intentional
    loadData();
  }, [loadData]);

  // 필터 변경 핸들러
  const handleStatusChange = (value: string) => {
    setStatus(value);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setStatus('');
  };

  const hasFilters = debouncedSearch || status;

  // 상태 배지 렌더링
  const renderStatusBadge = (projectStatus: string, hasInterview: boolean) => {
    const badge = getConsultantProjectStatusBadge(projectStatus, hasInterview);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>{badge.label}</span>
    );
  };

  // 활성 필터 배지 데이터
  const activeFilters = [
    { label: '검색', value: debouncedSearch, color: 'bg-blue-100 text-blue-800' },
    {
      label: '상태',
      value: status ? (filterOptions.statuses.find((s) => s.value === status)?.label || status) : '',
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">담당 프로젝트</h1>
        <p className="mt-1 text-sm text-gray-500">
          {consultantName ? `${consultantName}님의 담당 프로젝트 목록입니다.` : '담당 프로젝트 목록입니다.'}
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="기업명 또는 업종 검색..."
            />
          </div>
          <SelectFilter
            value={status}
            onChange={handleStatusChange}
            options={filterOptions.statuses}
            label="상태"
          />
        </div>

        <ActiveFilterBadges filters={activeFilters} onReset={hasFilters ? handleResetFilters : undefined} />
      </div>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>총 {total.toLocaleString()}개의 프로젝트</span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <ProjectTableSkeleton rows={5} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          title={hasFilters ? '검색 조건에 맞는 프로젝트가 없습니다' : '담당 프로젝트가 없습니다'}
          description={hasFilters ? undefined : '운영 관리자가 프로젝트를 배정하면 여기에 표시됩니다.'}
          action={
            hasFilters && (
              <button onClick={handleResetFilters} className="text-blue-600 hover:text-blue-500">
                필터 초기화
              </button>
            )
          }
        />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className={TABLE_COLUMNS.company}>기업명</TableHead>
                <TableHead className={TABLE_COLUMNS.industry}>업종</TableHead>
                <TableHead className={TABLE_COLUMNS.size}>규모</TableHead>
                <TableHead className={TABLE_COLUMNS.status}>상태</TableHead>
                <TableHead className={TABLE_COLUMNS.assignedAt}>배정일</TableHead>
                <TableHead className={TABLE_COLUMNS.actions}>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((projectItem) => (
                <TableRow key={projectItem.id}>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">{projectItem.company_name}</div>
                  </TableCell>
                  <TableCell className="text-gray-500">{projectItem.industry}</TableCell>
                  <TableCell className="text-gray-500">{projectItem.company_size}</TableCell>
                  <TableCell>{renderStatusBadge(projectItem.status, projectItem.has_interview)}</TableCell>
                  <TableCell className="text-gray-500">
                    {projectItem.assigned_at
                      ? new Date(projectItem.assigned_at).toLocaleDateString('ko-KR')
                      : new Date(projectItem.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/consultant/projects/${projectItem.id}`}
                      className="text-blue-600 hover:text-blue-800 underline-offset-2 hover:underline transition-colors duration-150"
                    >
                      상세 보기
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
