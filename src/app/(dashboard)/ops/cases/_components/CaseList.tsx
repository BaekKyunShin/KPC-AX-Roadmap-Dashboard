'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchCases, fetchCaseFilters, type CaseListResult } from '../actions';
import { CaseTableSkeleton } from '@/components/ui/Skeleton';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: '신규', color: 'bg-gray-100 text-gray-800' },
  DIAGNOSED: { label: '진단완료', color: 'bg-blue-100 text-blue-800' },
  MATCH_RECOMMENDED: { label: '매칭추천', color: 'bg-purple-100 text-purple-800' },
  ASSIGNED: { label: '배정완료', color: 'bg-green-100 text-green-800' },
  INTERVIEWED: { label: '인터뷰완료', color: 'bg-yellow-100 text-yellow-800' },
  ROADMAP_DRAFTED: { label: '로드맵초안', color: 'bg-orange-100 text-orange-800' },
  FINALIZED: { label: '최종확정', color: 'bg-emerald-100 text-emerald-800' },
};

export default function CaseList() {
  const [cases, setCases] = useState<CaseListResult['cases']>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [industry, setIndustry] = useState('');

  // 필터 옵션
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    industries: string[];
  }>({ statuses: [], industries: [] });

  // 디바운스된 검색
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 필터 옵션 로드
  useEffect(() => {
    async function loadFilters() {
      const filters = await fetchCaseFilters();
      setFilterOptions(filters);
    }
    loadFilters();
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchCases({
      page,
      limit: 10,
      search,
      status,
      industry,
    });
    setCases(result.cases);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setLoading(false);
  }, [page, search, status, industry]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색 디바운스
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
    setSearchTimeout(timeout);
  };

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
    setSearch('');
    setStatus('');
    setIndustry('');
    setPage(1);
  };

  const hasFilters = search || status || industry;

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 검색 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">검색</label>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="회사명 또는 이메일 검색..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <option key={s} value={s}>
                  {STATUS_LABELS[s]?.label || s}
                </option>
              ))}
            </select>
          </div>

          {/* 업종 필터 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">업종</label>
            <select
              value={industry}
              onChange={(e) => handleIndustryChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              {filterOptions.industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
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
                  상태: {STATUS_LABELS[status]?.label || status}
                </span>
              )}
              {industry && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  업종: {industry}
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
        {totalPages > 0 && (
          <span>{page} / {totalPages} 페이지</span>
        )}
      </div>

      {/* 테이블 */}
      {loading ? (
        <CaseTableSkeleton rows={5} />
      ) : cases.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">케이스 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasFilters ? '검색 조건에 맞는 케이스가 없습니다.' : '등록된 케이스가 없습니다.'}
          </p>
          {hasFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-3 text-sm text-blue-600 hover:text-blue-500"
            >
              필터 초기화
            </button>
          )}
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
                const statusInfo = STATUS_LABELS[caseItem.status] || {
                  label: caseItem.status,
                  color: 'bg-gray-100 text-gray-800',
                };
                return (
                  <tr key={caseItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{caseItem.company_name}</div>
                      <div className="text-sm text-gray-500">{caseItem.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.industry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.assigned_consultant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/ops/cases/${caseItem.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <span>
                  {((page - 1) * 10) + 1} - {Math.min(page * 10, total)} / {total}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  처음
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  마지막
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
