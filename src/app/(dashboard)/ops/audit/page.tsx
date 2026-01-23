'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchAuditLogs,
  getActionTypes,
  getTargetTypes,
  type AuditLogEntry,
  type AuditLogFilters,
} from './actions';
import type { AuditAction } from '@/types/database';
import * as XLSX from 'xlsx';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const actionTypes = getActionTypes();
  const targetTypes = getTargetTypes();

  // 로그 조회
  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      const result = await fetchAuditLogs({
        ...filters,
        action: selectedAction || undefined,
        targetType: selectedTargetType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(result.logs as AuditLogEntry[]);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setLoading(false);
    }
    loadLogs();
  }, [filters, selectedAction, selectedTargetType, startDate, endDate]);

  // 페이지 변경
  function handlePageChange(newPage: number) {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage }));
  }

  // 필터 초기화
  function handleResetFilters() {
    setSelectedAction('');
    setSelectedTargetType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setFilters({ page: 1, limit: 20 });
  }

  // 내보내기 (CSV)
  function handleExportCSV() {
    if (logs.length === 0) return;

    const headers = ['시간', '사용자', '이메일', '액션', '대상유형', '대상ID', '상태', '상세'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('ko-KR'),
      log.actor?.name || '-',
      log.actor?.email || log.actor_user_id,
      getActionLabel(log.action),
      getTargetTypeLabel(log.target_type),
      log.target_id,
      log.success ? '성공' : '실패',
      log.error_message || JSON.stringify(log.meta),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 내보내기 (Excel)
  function handleExportExcel() {
    if (logs.length === 0) return;

    const data = logs.map(log => ({
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

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '감사로그');

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 20 }, // 시간
      { wch: 15 }, // 사용자
      { wch: 25 }, // 이메일
      { wch: 15 }, // 액션
      { wch: 10 }, // 대상유형
      { wch: 36 }, // 대상ID
      { wch: 8 },  // 상태
      { wch: 30 }, // 오류메시지
      { wch: 50 }, // 상세정보
    ];

    XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="mt-1 text-sm text-gray-500">시스템 활동 내역을 확인합니다.</p>
        </div>
        <Link
          href="/ops/cases"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 케이스 관리로 돌아가기
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              액션 유형
            </label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value as AuditAction | '');
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체</option>
              {actionTypes.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              대상 유형
            </label>
            <select
              value={selectedTargetType}
              onChange={(e) => {
                setSelectedTargetType(e.target.value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체</option>
              {targetTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
                setFilters(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            총 {total.toLocaleString()}건의 로그
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                CSV 다운로드
              </button>
              <button
                onClick={handleExportExcel}
                disabled={logs.length === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Excel 다운로드
              </button>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            로그가 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      시간
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      액션
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      대상
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.actor?.name || '-'}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {log.actor?.email || log.actor_user_id.slice(0, 8)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="text-gray-900">
                            {getTargetTypeLabel(log.target_type)}
                          </div>
                          <div className="text-gray-500 text-xs font-mono">
                            {log.target_id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                            성공
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                            실패
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {log.error_message ? (
                          <span className="text-red-600" title={log.error_message}>
                            {log.error_message.slice(0, 30)}...
                          </span>
                        ) : log.meta && Object.keys(log.meta).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-purple-600 text-xs">
                              상세보기
                            </summary>
                            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {page} / {totalPages} 페이지
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
