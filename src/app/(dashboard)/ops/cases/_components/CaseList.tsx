'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchCases, fetchCaseFilters, type CaseListResult } from '../actions';
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
  ExternalLink,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { CASE_STATUS_CONFIG } from '@/lib/constants/status';
import type { CaseStatus } from '@/types/database';

const ITEMS_PER_PAGE = 10;

const getStatusBadgeVariant = (status: CaseStatus) => {
  const config = CASE_STATUS_CONFIG[status];
  if (!config) return { className: 'bg-gray-100 text-gray-800', label: status };

  const colorMap: Record<string, string> = {
    'bg-gray-100 text-gray-800': 'bg-gray-100 text-gray-700 border-gray-200',
    'bg-blue-100 text-blue-800': 'bg-blue-50 text-blue-700 border-blue-200',
    'bg-yellow-100 text-yellow-800': 'bg-amber-50 text-amber-700 border-amber-200',
    'bg-purple-100 text-purple-800': 'bg-purple-50 text-purple-700 border-purple-200',
    'bg-indigo-100 text-indigo-800': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-cyan-100 text-cyan-800': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'bg-green-100 text-green-800': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return {
    className: colorMap[config.color] || 'bg-gray-100 text-gray-700 border-gray-200',
    label: config.label,
  };
};

export default function CaseList() {
  const [cases, setCases] = useState<CaseListResult['cases']>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [industry, setIndustry] = useState('all');
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
      status: status === 'all' ? '' : status,
      industry: industry === 'all' ? '' : industry,
    });
    setCases(result.cases);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setLoading(false);
  }, [page, debouncedSearch, status, industry]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, industry]);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchInput('');
    setStatus('all');
    setIndustry('all');
    setPage(1);
  };

  const hasFilters = debouncedSearch || status !== 'all' || industry !== 'all';

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

            <div className="flex gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  {filterOptions.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CASE_STATUS_CONFIG[s as CaseStatus]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="업종" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 업종</SelectItem>
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
              {status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  상태: {CASE_STATUS_CONFIG[status as CaseStatus]?.label || status}
                  <button onClick={() => setStatus('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {industry !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  업종: {industry}
                  <button onClick={() => setIndustry('all')}>
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
        <span>총 {total.toLocaleString()}개의 케이스</span>
        {totalPages > 0 && (
          <span>
            {page} / {totalPages} 페이지
          </span>
        )}
      </div>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">케이스 없음</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasFilters ? '검색 조건에 맞는 케이스가 없습니다.' : '등록된 케이스가 없습니다.'}
              </p>
              {hasFilters && (
                <Button variant="link" onClick={handleResetFilters} className="mt-2">
                  필터 초기화
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[250px]">기업명</TableHead>
                    <TableHead>업종</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>배정 컨설턴트</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((caseItem) => {
                    const statusInfo = getStatusBadgeVariant(caseItem.status as CaseStatus);
                    return (
                      <TableRow key={caseItem.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {caseItem.company_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {caseItem.contact_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{caseItem.industry}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {caseItem.assigned_consultant?.name || (
                            <span className="text-gray-400">미배정</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Link href={`/ops/cases/${caseItem.id}`}>
                              상세보기
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
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
        </CardContent>
      </Card>
    </div>
  );
}
