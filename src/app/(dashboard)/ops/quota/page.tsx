'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchUsageStats, updateQuota, type UsageStats } from './actions';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionLink,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuotaTableSkeleton } from '@/components/ui/Skeleton';

// 월 선택 옵션 생성 (최근 12개월, 로컬 시간 기준)
function getMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    options.push(`${year}-${month}`);
  }
  return options;
}

export default function QuotaManagementPage() {
  const [users, setUsers] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthOptions, setMonthOptions] = useState<string[]>([]);

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState<number>(0);
  const [editMonthlyLimit, setEditMonthlyLimit] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 클라이언트에서 월 옵션 및 초기값 설정 (hydration 불일치 방지)
  useEffect(() => {
    const options = getMonthOptions();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 전용 초기화
    setMonthOptions(options);
    setSelectedMonth(options[0]);
  }, []);

  // 데이터 조회
  useEffect(() => {
    if (!selectedMonth) return;
    async function loadData() {
      setLoading(true);
      const result = await fetchUsageStats({
        page,
        limit: 20,
        month: selectedMonth,
      });
      setUsers(result.users as UsageStats[]);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setLoading(false);
    }
    loadData();
  }, [page, selectedMonth]);

  // 쿼터 수정 시작
  function handleEditStart(user: UsageStats) {
    setEditingUser(user.id);
    setEditDailyLimit(user.dailyLimit);
    setEditMonthlyLimit(user.monthlyLimit);
    setMessage(null);
  }

  // 쿼터 저장
  async function handleSave() {
    if (!editingUser) return;

    setSaving(true);
    const result = await updateQuota(editingUser, editDailyLimit, editMonthlyLimit);

    if (result.success) {
      setMessage({ type: 'success', text: '쿼터가 수정되었습니다.' });
      // 목록 새로고침
      const refreshed = await fetchUsageStats({ page, limit: 20, month: selectedMonth });
      setUsers(refreshed.users as UsageStats[]);
      setEditingUser(null);
    } else {
      setMessage({ type: 'error', text: result.error || '수정에 실패했습니다.' });
    }

    setSaving(false);
  }

  // 사용량 퍼센트 색상
  function getUsageColor(percent: number): string {
    if (percent >= 90) return 'text-red-600 bg-red-100';
    if (percent >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  }

  // 프로그레스 바 색상
  function getProgressColor(percent: number): string {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">쿼터 관리</h1>
          <p className="mt-1 text-sm text-gray-500">사용자별 LLM 호출 한도를 관리합니다.</p>
        </div>
        <Link
          href="/ops/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 프로젝트 관리로 돌아가기
        </Link>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div className={`px-4 py-3 rounded ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              조회 월:
            </label>
            <Select
              value={selectedMonth}
              onValueChange={(value) => {
                setSelectedMonth(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500">
            총 {total.toLocaleString()}명의 사용자
          </p>
        </div>
      </div>

      {/* 사용량 테이블 */}
      {loading ? (
        <QuotaTableSkeleton rows={5} />
      ) : (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            데이터가 없습니다.
          </div>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18%]">사용자</TableHead>
                <TableHead className="w-[12%]">역할</TableHead>
                <TableHead className="w-[18%]">월간 사용량</TableHead>
                <TableHead className="w-[14%]">토큰</TableHead>
                <TableHead className="w-[12%]">일일 한도</TableHead>
                <TableHead className="w-[12%]">월간 한도</TableHead>
                <TableHead className="w-[14%]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.role === 'SYSTEM_ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'OPS_ADMIN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'SYSTEM_ADMIN' ? '시스템관리자'
                        : user.role === 'OPS_ADMIN' ? '운영관리자'
                        : '컨설턴트'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 inline-block">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span>{user.monthlyUsage.toLocaleString()}회</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${getUsageColor(user.usagePercent)}`}>
                          {user.usagePercent}%
                        </span>
                      </div>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(user.usagePercent)}`}
                          style={{ width: `${Math.min(100, user.usagePercent)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    <div className="text-sm">
                      <div>입력: {user.tokensIn.toLocaleString()}</div>
                      <div>출력: {user.tokensOut.toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      <input
                        type="number"
                        value={editDailyLimit}
                        onChange={(e) => setEditDailyLimit(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min={1}
                      />
                    ) : (
                      <span className="text-sm">{user.dailyLimit}회</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      <input
                        type="number"
                        value={editMonthlyLimit}
                        onChange={(e) => setEditMonthlyLimit(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        min={1}
                      />
                    ) : (
                      <span className="text-sm">{user.monthlyLimit}회</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-150"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <TableActionLink
                        onClick={() => handleEditStart(user)}
                        className="text-purple-600 hover:text-purple-800 text-sm"
                      >
                        수정
                      </TableActionLink>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {page} / {totalPages} 페이지
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
      )}

      {/* 범례 */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">사용량 상태</h3>
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">정상 (70% 미만)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600">주의 (70% 이상)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600">경고 (90% 이상)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
