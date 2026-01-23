'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchConsultantCases, fetchConsultantCaseFilters, type ConsultantCaseItem } from '../actions';
import { CaseTableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput, SelectFilter, ActiveFilterBadges } from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { getConsultantCaseStatusBadge } from '@/lib/constants/status';

export default function CaseList() {
  const [cases, setCases] = useState<ConsultantCaseItem[]>([]);
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
    fetchConsultantCaseFilters().then(setFilterOptions);
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchConsultantCases({
      search: debouncedSearch,
      status,
    });
    setCases(result.cases);
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
  const renderStatusBadge = (caseStatus: string, hasInterview: boolean) => {
    const badge = getConsultantCaseStatusBadge(caseStatus, hasInterview);
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
        <h1 className="text-2xl font-bold text-gray-900">배정된 케이스</h1>
        <p className="mt-1 text-sm text-gray-500">
          {consultantName ? `${consultantName}님에게 배정된 케이스 목록입니다.` : '배정된 케이스 목록입니다.'}
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
        <span>총 {total.toLocaleString()}개의 케이스</span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <CaseTableSkeleton rows={5} />
      ) : cases.length === 0 ? (
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
          title={hasFilters ? '검색 조건에 맞는 케이스가 없습니다' : '배정된 케이스가 없습니다'}
          description={hasFilters ? undefined : '운영 관리자가 케이스를 배정하면 여기에 표시됩니다.'}
          action={
            hasFilters && (
              <button onClick={handleResetFilters} className="text-blue-600 hover:text-blue-500">
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
                  규모
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  배정일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{caseItem.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caseItem.industry}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caseItem.company_size}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(caseItem.status, caseItem.has_interview)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.assigned_at
                      ? new Date(caseItem.assigned_at).toLocaleDateString('ko-KR')
                      : new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/consultant/cases/${caseItem.id}`} className="text-blue-600 hover:text-blue-900">
                      상세 보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
