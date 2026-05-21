'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  fetchAuditLogs,
  fetchAllAuditLogs,
  type AuditLogEntry,
  type AuditLogFilters,
} from '../actions';
import { PageHeader } from '@/components/ui/page-header';
import type { AuditAction } from '@/types/database';
import { AuditLogTableSkeleton } from '@/components/ui/Skeleton';
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
import { Input } from '@/components/ui/input';
import { Search, X, Download } from 'lucide-react';
import { formatDateKR, formatDateTimeKR, formatTimeKR, formatNumberKR } from '@/lib/utils/date';
import { showErrorToast } from '@/lib/utils/toast';

const AUDIT_PAGE_SIZE = 20;

interface AuditLogClientProps {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
  initialTotalPages: number;
  actionTypes: { value: AuditAction; label: string }[];
  targetTypes: { value: string; label: string }[];
  users: { id: string; name: string; email: string }[];
}

function AuditMobileCard({
  log,
  getActionLabel,
  getActionColor,
  getTargetTypeLabel,
}: {
  log: AuditLogEntry;
  getActionLabel: (action: AuditAction) => string;
  getActionColor: (action: AuditAction) => string;
  getTargetTypeLabel: (type: string) => string;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
          {getActionLabel(log.action)}
        </span>
        {log.success ? (
          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 shrink-0">성공</span>
        ) : (
          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 shrink-0">실패</span>
        )}
      </div>

      <div className="text-xs text-gray-500">
        {formatDateTimeKR(log.created_at)}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">사용자</div>
        <div className="text-gray-900">{log.actor?.name || '-'}</div>
        <div className="text-gray-500">이메일</div>
        <div className="text-gray-900 break-all">{log.actor?.email || log.actor_user_id?.slice(0, 8) || '-'}</div>
        <div className="text-gray-500">대상</div>
        <div className="text-gray-900">
          {getTargetTypeLabel(log.target_type)}
          <span className="ml-1 text-xs text-gray-500 font-mono">{log.target_id.slice(0, 8)}</span>
        </div>
      </div>

      {log.error_message ? (
        <div className="pt-2 border-t">
          <p className="text-xs text-red-600 break-all">{log.error_message}</p>
        </div>
      ) : log.meta && Object.keys(log.meta).length > 0 ? (
        <div className="pt-2 border-t">
          <details className="cursor-pointer">
            <summary className="text-xs text-purple-600 hover:text-purple-800">상세보기</summary>
            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto break-all whitespace-pre-wrap">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}

export default function AuditLogClient({
  initialLogs,
  initialTotal,
  initialTotalPages,
  actionTypes,
  targetTypes,
  users,
}: AuditLogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'all-excel' | null>(null);
  const [page, setPage] = useState(Number(urlSearchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);

  // 필터 상태 (URL searchParams에서 초기값 읽기)
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: Number(urlSearchParams.get('page')) || 1,
    limit: AUDIT_PAGE_SIZE,
  });
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>(
    (urlSearchParams.get('action') as AuditAction) || ''
  );
  const [selectedTargetType, setSelectedTargetType] = useState<string>(
    urlSearchParams.get('target') || ''
  );
  const [selectedUser, setSelectedUser] = useState<string>(
    urlSearchParams.get('user') || ''
  );
  const [startDate, setStartDate] = useState<string>(
    urlSearchParams.get('start') || ''
  );
  const [endDate, setEndDate] = useState<string>(
    urlSearchParams.get('end') || ''
  );
  const [searchKeyword, setSearchKeyword] = useState<string>(
    urlSearchParams.get('search') || ''
  );

  // 초기 로드 건너뛰기 플래그
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // URL searchParams 업데이트 헬퍼
  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (params.get('page') === '1') params.delete('page');
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  // 필터 변경 공통 처리: 페이지 리셋 + URL 동기화
  function applyFilterChange(paramKey: string, value: string) {
    setPage(1);
    setFilters(prev => ({ ...prev, page: 1 }));
    updateParams({ [paramKey]: value, page: '' });
  }

  // 검색어 → URL 동기화 (디바운스)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ search: searchKeyword });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 검색어 변경 시만 실행
  }, [searchKeyword]);

  // 로그 조회
  const loadLogs = async () => {
    setLoading(true);
    const result = await fetchAuditLogs({
      ...filters,
      action: selectedAction || undefined,
      targetType: selectedTargetType || undefined,
      actorUserId: selectedUser || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setLogs(result.logs as AuditLogEntry[]);
    setTotalPages(result.totalPages);
    setTotal(result.total);
    setLoading(false);
  };

  useEffect(() => {
    // 초기 로드는 서버에서 받은 데이터 사용, 이후 필터 변경 시만 클라이언트에서 로드
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [filters, selectedAction, selectedTargetType, selectedUser, startDate, endDate]);

  // 페이지 변경
  function handlePageChange(newPage: number) {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage }));
    updateParams({ page: String(newPage) });
  }

  // 필터 초기화
  function handleResetFilters() {
    setSelectedAction('');
    setSelectedTargetType('');
    setSelectedUser('');
    setStartDate('');
    setEndDate('');
    setSearchKeyword('');
    setPage(1);
    setFilters({ page: 1, limit: AUDIT_PAGE_SIZE });
    router.replace(pathname, { scroll: false });
  }

  // 검색어 필터링 (클라이언트)
  const filteredLogs = searchKeyword
    ? logs.filter(log =>
        log.actor?.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        log.actor?.email?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        log.target_id.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : logs;

  // 액션 라벨 변환
  function getActionLabel(action: AuditAction): string {
    return actionTypes.find(a => a.value === action)?.label || action;
  }

  // 대상 타입 라벨 변환
  function getTargetTypeLabel(type: string): string {
    return targetTypes.find(t => t.value === type)?.label || type;
  }

  // 액션별 색상
  function getActionColor(action: AuditAction): string {
    if (action.includes('CREATE') || action.includes('APPROVE')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('UPDATE') || action.includes('REASSIGN')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (action.includes('DELETE') || action.includes('SUSPEND') || action.includes('ARCHIVE')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('DOWNLOAD')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (action.includes('FINALIZE')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  }

  // 로그 데이터 변환 (내보내기용)
  function transformLogsForExport(logsToExport: AuditLogEntry[]) {
    return logsToExport.map(log => ({
      '시간': formatDateTimeKR(log.created_at),
      '사용자': log.actor?.name || '-',
      '이메일': log.actor?.email || log.actor_user_id,
      '액션': getActionLabel(log.action),
      '대상유형': getTargetTypeLabel(log.target_type),
      '대상ID': log.target_id,
      '상태': log.success ? '성공' : '실패',
      '오류메시지': log.error_message || '',
      '상세정보': JSON.stringify(log.meta),
    }));
  }

  // Excel 내보내기
  async function handleExportExcel(exportAll = false) {
    try {
      if (exportAll) {
        setExporting('all-excel');
        const result = await fetchAllAuditLogs({
          action: selectedAction || undefined,
          targetType: selectedTargetType || undefined,
          actorUserId: selectedUser || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        if (!result.logs || result.logs.length === 0) {
          showErrorToast('내보내기 실패', '선택한 필터 조건에 해당하는 로그가 없습니다.');
          setExporting(null);
          return;
        }
        await exportToExcel(result.logs as AuditLogEntry[], `audit_logs_all_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        setExporting('excel');
        await exportToExcel(filteredLogs, `audit_logs_page${page}_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch (error) {
      console.error('[handleExportExcel]', error);
      showErrorToast('내보내기 실패', '감사 로그 내보내기에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
    setExporting(null);
  }

  async function exportToExcel(logsToExport: AuditLogEntry[], filename: string) {
    if (logsToExport.length === 0) return;

    const XLSX = await import('xlsx-js-style');

    const data = transformLogsForExport(logsToExport);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '감사로그');

    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 10 }, { wch: 36 }, { wch: 8 }, { wch: 30 }, { wch: 50 },
    ];

    XLSX.writeFile(wb, filename);
  }

  const hasFilters = selectedAction || selectedTargetType || selectedUser || startDate || endDate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="감사로그"
        description="시스템 활동 내역을 확인합니다."
      />

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* 검색 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="사용자명, 이메일, 대상ID 검색..."
              className="pl-9"
            />
          </div>

          {/* 필터 드롭다운들 */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Select
              value={selectedAction || 'all'}
              onValueChange={(value) => {
                const v = value === 'all' ? '' : value as AuditAction;
                setSelectedAction(v);
                applyFilterChange('action', v);
              }}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="액션" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 액션</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedTargetType || 'all'}
              onValueChange={(value) => {
                const v = value === 'all' ? '' : value;
                setSelectedTargetType(v);
                applyFilterChange('target', v);
              }}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="대상" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 대상</SelectItem>
                {targetTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedUser || 'all'}
              onValueChange={(value) => {
                const v = value === 'all' ? '' : value;
                setSelectedUser(v);
                applyFilterChange('user', v);
              }}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="사용자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 사용자</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-[140px]">
              <span className="absolute -top-2 left-2 text-[10px] text-muted-foreground bg-background px-1 sm:hidden">시작일</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  applyFilterChange('start', e.target.value);
                }}
                className="w-full"
              />
            </div>

            <div className="relative w-full sm:w-[140px]">
              <span className="absolute -top-2 left-2 text-[10px] text-muted-foreground bg-background px-1 sm:hidden">종료일</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  applyFilterChange('end', e.target.value);
                }}
                className="w-full"
              />
            </div>

            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center justify-center"
                title="필터 초기화"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 통계 및 액션 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            총 <span className="font-medium text-gray-900">{formatNumberKR(total)}</span>건
            {searchKeyword && filteredLogs.length !== logs.length && (
              <span className="ml-1">(검색 결과: {filteredLogs.length}건)</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportExcel(false)}
              disabled={filteredLogs.length === 0 || exporting !== null || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === 'excel' ? '내보내는 중...' : '현재 페이지 다운로드'}
            </button>
            <button
              onClick={() => handleExportExcel(true)}
              disabled={total === 0 || exporting !== null || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === 'all-excel' ? '내보내는 중...' : `전체 목록 다운로드 (${formatNumberKR(total)}건)`}
            </button>
          </div>
        </div>
      </div>

      {/* 로그 테이블 */}
      {loading ? (
        <AuditLogTableSkeleton rows={10} />
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">로그 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasFilters || searchKeyword ? '검색 조건에 맞는 로그가 없습니다.' : '기록된 로그가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <div className="hidden md:block">
            <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">시간</TableHead>
                <TableHead className="min-w-[140px]">사용자</TableHead>
                <TableHead className="min-w-[120px]">액션</TableHead>
                <TableHead className="min-w-[140px]">대상</TableHead>
                <TableHead className="min-w-[80px]">상태</TableHead>
                <TableHead className="min-w-[180px]">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-gray-500">
                    <div>{formatDateKR(log.created_at)}</div>
                    <div className="text-xs">{formatTimeKR(log.created_at)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{log.actor?.name || '-'}</div>
                    <div className="text-gray-500 text-xs">{log.actor?.email || log.actor_user_id?.slice(0, 8) || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{getTargetTypeLabel(log.target_type)}</div>
                    <div className="text-gray-500 text-xs font-mono">{log.target_id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    {log.success ? (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">성공</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">실패</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {log.error_message ? (
                      <span className="text-red-600 break-all" title={log.error_message}>
                        {log.error_message.slice(0, 30)}...
                      </span>
                    ) : log.meta && Object.keys(log.meta).length > 0 ? (
                      <details className="cursor-pointer">
                        <summary className="text-purple-600 hover:text-purple-800 text-sm underline-offset-2 hover:underline transition-colors duration-150">상세보기</summary>
                        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto text-left break-all whitespace-pre-wrap">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </details>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>

          {/* 모바일: 카드 뷰 */}
          <div className="md:hidden space-y-3 p-4">
            {filteredLogs.map((log) => (
              <AuditMobileCard
                key={log.id}
                log={log}
                getActionLabel={getActionLabel}
                getActionColor={getActionColor}
                getTargetTypeLabel={getTargetTypeLabel}
              />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {((page - 1) * AUDIT_PAGE_SIZE) + 1} - {Math.min(page * AUDIT_PAGE_SIZE, total)} / {total}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page <= 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  처음
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
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
