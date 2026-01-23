'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchConsultantCases,
  fetchConsultantCaseFilters,
  type ConsultantCaseItem,
} from '../actions';
import { CaseTableSkeleton } from '@/components/ui/Skeleton';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: '인터뷰 필요', color: 'bg-yellow-100 text-yellow-800' },
  INTERVIEWED: { label: '인터뷰 완료', color: 'bg-blue-100 text-blue-800' },
  ROADMAP_DRAFTED: { label: '로드맵 초안', color: 'bg-purple-100 text-purple-800' },
  FINALIZED: { label: '완료', color: 'bg-green-100 text-green-800' },
};

export default function CaseList() {
  const [cases, setCases] = useState<ConsultantCaseItem[]>([]);
  const [consultantName, setConsultantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');

  // 필터 옵션
  const [filterOptions, setFilterOptions] = useState<{
    statuses: { value: string; label: string }[];
  }>({ statuses: [] });

  // 디바운스 타임아웃
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 필터 옵션 로드
  useEffect(() => {
    async function loadFilters() {
      const filters = await fetchConsultantCaseFilters();
      setFilterOptions(filters);
    }
    loadFilters();
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchConsultantCases({
      search,
      status,
    });
    setCases(result.cases);
    setTotal(result.total);
    setConsultantName(result.consultantName);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색 디바운스
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setSearch(value);
    }, 300);
    setSearchTimeout(timeout);
  };

  // 필터 변경 핸들러
  const handleStatusChange = (value: string) => {
    setStatus(value);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
  };

  const hasFilters = search || status;

  // 상태 배지 표시
  const getStatusBadge = (caseStatus: string, hasInterview: boolean) => {
    // ASSIGNED 상태에서 인터뷰가 없으면 "인터뷰 필요"로 표시
    if (caseStatus === 'ASSIGNED' && !hasInterview) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          인터뷰 필요
        </span>
      );
    }
    // ASSIGNED 상태에서 인터뷰가 있으면 "인터뷰 완료"로 표시
    if (caseStatus === 'ASSIGNED' && hasInterview) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          인터뷰 완료
        </span>
      );
    }

    const config = STATUS_CONFIG[caseStatus];
    if (config) {
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
          {config.label}
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        {caseStatus}
      </span>
    );
  };

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
          {/* 검색 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">검색</label>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="기업명 또는 업종 검색..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {filterOptions.statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 필터 상태 표시 */}
        {hasFilters && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs text-gray-500">필터:</span>
              {search && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  검색: {search}
                </span>
              )}
              {status && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  상태: {filterOptions.statuses.find((s) => s.value === status)?.label || status}
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>총 {total.toLocaleString()}개의 케이스</span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <CaseTableSkeleton rows={5} />
      ) : cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {hasFilters ? '검색 조건에 맞는 케이스가 없습니다' : '배정된 케이스가 없습니다'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasFilters ? (
              <button
                onClick={handleResetFilters}
                className="text-blue-600 hover:text-blue-500"
              >
                필터 초기화
              </button>
            ) : (
              '운영 관리자가 케이스를 배정하면 여기에 표시됩니다.'
            )}
          </p>
        </div>
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
                    <div className="text-sm font-medium text-gray-900">
                      {caseItem.company_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.industry}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.company_size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(caseItem.status, caseItem.has_interview)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem.assigned_at
                      ? new Date(caseItem.assigned_at).toLocaleDateString('ko-KR')
                      : new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/consultant/cases/${caseItem.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
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
