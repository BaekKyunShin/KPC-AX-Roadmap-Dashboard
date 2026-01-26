'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchAuditLogs,
  fetchAllAuditLogs,
  getActionTypes,
  getTargetTypes,
  getUsers,
  type AuditLogEntry,
  type AuditLogFilters,
} from './actions';
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
import { Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'excel' | 'all-csv' | 'all-excel' | null>(null);
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
        getUsers(),
      ]);
      setActionTypes(actions);
      setTargetTypes(targets);
      setUsers(userList);
    }
    loadTypes();
  }, []);

  // 로그 조회
  const loadLogs = useCallback(async () => {
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
  }, [filters, selectedAction, selectedTargetType, selectedUser, startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data loading is intentional
    loadLogs();
  }, [loadLogs]);

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

  // CSV 내보내기
  async function handleExportCSV(exportAll = false) {
    if (exportAll) {
      setExporting('all-csv');
      const result = await fetchAllAuditLogs({
        action: selectedAction || undefined,
        targetType: selectedTargetType || undefined,
        actorUserId: selectedUser || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      exportToCSV(result.logs as AuditLogEntry[], `audit_logs_all_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      setExporting('csv');
      exportToCSV(filteredLogs, `audit_logs_page${page}_${new Date().toISOString().split('T')[0]}.csv`);
    }
    setExporting(null);
  }

  function exportToCSV(logsToExport: AuditLogEntry[], filename: string) {
    if (logsToExport.length === 0) return;

    const headers = ['시간', '사용자', '이메일', '액션', '대상유형', '대상ID', '상태', '오류메시지', '상세정보'];
    const rows = logsToExport.map(log => [
      new Date(log.created_at).toLocaleString('ko-KR'),
      log.actor?.name || '-',
      log.actor?.email || log.actor_user_id,
      getActionLabel(log.action),
      getTargetTypeLabel(log.target_type),
      log.target_id,
      log.success ? '성공' : '실패',
      log.error_message || '',
      JSON.stringify(log.meta),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Excel 내보내기
  async function handleExportExcel(exportAll = false) {
    if (exportAll) {
      setExporting('all-excel');
      const result = await fetchAllAuditLogs({
        action: selectedAction || undefined,
        targetType: selectedTargetType || undefined,
        actorUserId: selectedUser || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      exportToExcel(result.logs as AuditLogEntry[], `audit_logs_all_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      setExporting('excel');
      exportToExcel(filteredLogs, `audit_logs_page${page}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    setExporting(null);
  }

  function exportToExcel(logsToExport: AuditLogEntry[], filename: string) {
    if (logsToExport.length === 0) return;

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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="mt-1 text-sm text-gray-500">시스템 활동 내역을 확인합니다.</p>
        </div>
        <Link href="/ops/projects" className="text-sm text-gray-500 hover:text-gray-700">
          ← 프로젝트 관리로 돌아가기
        </Link>
      </div>

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
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedAction || 'all'}
              onValueChange={(value) => {
                setSelectedAction(value === 'all' ? '' : value as AuditAction);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="사용자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 사용자</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-[140px]"
            />

            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-[140px]"
            />

            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
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
            {/* 현재 페이지 내보내기 */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => handleExportCSV(false)}
                disabled={filteredLogs.length === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 disabled:opacity-50 border-r border-gray-300"
              >
                {exporting === 'csv' ? '...' : 'CSV'}
              </button>
              <button
                onClick={() => handleExportExcel(false)}
                disabled={filteredLogs.length === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {exporting === 'excel' ? '...' : 'Excel'}
              </button>
            </div>

            {/* 전체 내보내기 */}
            <div className="flex items-center border border-purple-300 rounded-md overflow-hidden">
              <span className="px-2 py-1.5 text-xs bg-purple-50 text-purple-700 border-r border-purple-300">
                전체
              </span>
              <button
                onClick={() => handleExportCSV(true)}
                disabled={total === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm bg-white hover:bg-purple-50 disabled:opacity-50 border-r border-purple-300 text-purple-700"
              >
                {exporting === 'all-csv' ? '...' : 'CSV'}
              </button>
              <button
                onClick={() => handleExportExcel(true)}
                disabled={total === 0 || exporting !== null}
                className="px-3 py-1.5 text-sm bg-white hover:bg-purple-50 disabled:opacity-50 text-purple-700"
              >
                {exporting === 'all-excel' ? '...' : 'Excel'}
              </button>
            </div>
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[14%]">시간</TableHead>
                <TableHead className="w-[18%]">사용자</TableHead>
                <TableHead className="w-[16%]">액션</TableHead>
                <TableHead className="w-[18%]">대상</TableHead>
                <TableHead className="w-[10%]">상태</TableHead>
                <TableHead className="w-[24%]">상세</TableHead>
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
                      <span className="text-red-600" title={log.error_message}>
                        {log.error_message.slice(0, 30)}...
                      </span>
                    ) : log.meta && Object.keys(log.meta).length > 0 ? (
                      <details className="cursor-pointer">
                        <summary className="text-purple-600 hover:text-purple-800 text-sm underline-offset-2 hover:underline transition-colors duration-150">상세보기</summary>
                        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto text-left">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </details>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
