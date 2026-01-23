'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchCases, fetchCaseFilters, type CaseListResult } from '../actions';
import { CaseTableSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput, SelectFilter, ActiveFilterBadges } from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { CASE_STATUS_CONFIG, getCaseStatusBadge } from '@/lib/constants/status';
import type { CaseStatus } from '@/types/database';

const ITEMS_PER_PAGE = 10;

export default function CaseList() {
  const [cases, setCases] = useState<CaseListResult['cases']>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [industry, setIndustry] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // 필터 옵션
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    industries: string[];
  }>({ statuses: [], industries: [] });

  // 필터 옵션 로드
  useEffect(() => {
    fetchCaseFilters().then(setFilterOptions);
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchCases({
      page,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearch,
      status,
      industry,
    });
    setCases(result.cases);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setLoading(false);
  }, [page, debouncedSearch, status, industry]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data loading is intentional
    loadData();
  }, [loadData]);

  // 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset page on search change is intentional
    setPage(1);
  }, [debouncedSearch]);

  // 필터 변경 핸들러
  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    setPage(1);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setStatus('');
    setIndustry('');
    setPage(1);
  };

  const hasFilters = debouncedSearch || status || industry;

  // 필터 옵션을 SelectFilter 형식으로 변환
  const statusOptions = filterOptions.statuses.map((s) => ({
    value: s,
    label: CASE_STATUS_CONFIG[s as CaseStatus]?.label || s,
  }));

  const industryOptions = filterOptions.industries.map((ind) => ({
    value: ind,
    label: ind,
  }));

  // 활성 필터 배지 데이터
  const activeFilters = [
    { label: '검색', value: debouncedSearch, color: 'bg-blue-100 text-blue-800' },
    {
      label: '상태',
      value: status ? (CASE_STATUS_CONFIG[status as CaseStatus]?.label || status) : '',
      color: 'bg-purple-100 text-purple-800',
    },
    { label: '업종', value: industry, color: 'bg-green-100 text-green-800' },
  ];

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="회사명 또는 이메일 검색..."
            />
          </div>
          <SelectFilter
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
            label="상태"
          />
          <SelectFilter
            value={industry}
            onChange={handleIndustryChange}
            options={industryOptions}
            label="업종"
          />
        </div>

        <ActiveFilterBadges filters={activeFilters} onReset={hasFilters ? handleResetFilters : undefined} />
      </div>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>총 {total.toLocaleString()}개의 케이스</span>
        {totalPages > 0 && (
          <span>
            {page} / {totalPages} 페이지
          </span>
        )}
      </div>

      {/* 테이블 */}
      {loading ? (
        <CaseTableSkeleton rows={5} />
      ) : cases.length === 0 ? (
        <EmptyState
          title="케이스 없음"
          description={hasFilters ? '검색 조건에 맞는 케이스가 없습니다.' : '등록된 케이스가 없습니다.'}
          action={
            hasFilters && (
              <button onClick={handleResetFilters} className="text-sm text-blue-600 hover:text-blue-500">
                필터 초기화
              </button>
            )
          }
        />
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기업명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  업종
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  배정 컨설턴트
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((caseItem) => {
                const statusInfo = getCaseStatusBadge(caseItem.status as CaseStatus);
                return (
                  <tr key={caseItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{caseItem.company_name}</div>
                      <div className="text-sm text-gray-500">{caseItem.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caseItem.industry}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.assigned_consultant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/ops/cases/${caseItem.id}`} className="text-blue-600 hover:text-blue-900">
                        상세보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
