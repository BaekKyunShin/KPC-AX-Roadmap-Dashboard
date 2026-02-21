'use client';

import { useState, useEffect } from 'react';
import {
  fetchAuditLogs,
  fetchAllAuditLogs,
  getActionTypes,
  getTargetTypes,
  fetchUsers,
  type AuditLogEntry,
  type AuditLogFilters,
} from './actions';
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
import { showErrorToast } from '@/lib/utils/toast';

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
        {new Date(log.created_at).toLocaleString('ko-KR')}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">사용자</div>
        <div className="text-gray-900">{log.actor?.name || '-'}</div>
        <div className="text-gray-500">이메일</div>
        <div className="text-gray-900 break-all">{log.actor?.email || log.actor_user_id.slice(0, 8)}</div>
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

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'all-excel' | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 필터 상태
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 액션/대상 타입/사용자 목록
  const [actionTypes, setActionTypes] = useState<{ value: AuditAction; label: string }[]>([]);
  const [targetTypes, setTargetTypes] = useState<{ value: string; label: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  // 필터 옵션 로드
  useEffect(() => {
    async function loadTypes() {
      const [actions, targets, userList] = await Promise.all([
        getActionTypes(),
        getTargetTypes(),
        fetchUsers(),
      ]);
      setActionTypes(actions);
      setTargetTypes(targets);
      setUsers(userList);
    }
    loadTypes();
  }, []);

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
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [filters, selectedAction, selectedTargetType, selectedUser, startDate, endDate]);

  // 페이지 변경
  function handlePageChange(newPage: number) {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage }));
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
    setFilters({ page: 1, limit: 20 });
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
      '시간': new Date(log.created_at).toLocaleString('ko-KR'),
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
        await exportToExcel(result.logs as AuditLogEntry[], `audit_logs_all_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        setExporting('excel');
        await exportToExcel(filteredLogs, `audit_logs_page${page}_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch {
      showErrorToast('내보내기 실패', '서버와 통신 중 오류가 발생했습니다.');
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
                setSelectedAction(value === 'all' ? '' : value as AuditAction);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
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
                setSelectedTargetType(value === 'all' ? '' : value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
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
                setSelectedUser(value === 'all' ? '' : value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
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
                  setPage(1);
                  setFilters(prev => ({ ...prev, page: 1 }));
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
                  setPage(1);
                  setFilters(prev => ({ ...prev, page: 1 }));
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
            총 <span className="font-medium text-gray-900">{total.toLocaleString()}</span>건
            {searchKeyword && filteredLogs.length !== logs.length && (
              <span className="ml-1">(검색 결과: {filteredLogs.length}건)</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportExcel(false)}
              disabled={filteredLogs.length === 0 || exporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === 'excel' ? '내보내는 중...' : '현재 페이지 다운로드'}
            </button>
            <button
              onClick={() => handleExportExcel(true)}
              disabled={total === 0 || exporting !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === 'all-excel' ? '내보내는 중...' : `전체 목록 다운로드 (${total.toLocaleString()}건)`}
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
                    <div>{new Date(log.created_at).toLocaleDateString('ko-KR')}</div>
                    <div className="text-xs">{new Date(log.created_at).toLocaleTimeString('ko-KR')}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{log.actor?.name || '-'}</div>
                    <div className="text-gray-500 text-xs">{log.actor?.email || log.actor_user_id.slice(0, 8)}</div>
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
                {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} / {total}
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
