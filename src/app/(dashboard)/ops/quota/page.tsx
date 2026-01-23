'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchUsageStats, updateQuota, type UsageStats } from './actions';

export default function QuotaManagementPage() {
  const [users, setUsers] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [month, setMonth] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState<number>(0);
  const [editMonthlyLimit, setEditMonthlyLimit] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 데이터 조회
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchUsageStats({
        page,
        limit: 20,
        month: selectedMonth || undefined,
      });
      setUsers(result.users as UsageStats[]);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setMonth(result.month || '');
      setLoading(false);
    }
    loadData();
  }, [page, selectedMonth]);

  // 월 선택 옵션 생성 (최근 12개월)
  function getMonthOptions() {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      options.push(monthStr);
    }
    return options;
  }

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
      const refreshed = await fetchUsageStats({ page, limit: 20, month: selectedMonth || undefined });
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
          href="/ops/cases"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 케이스 관리로 돌아가기
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
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {getMonthOptions().map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500">
            총 {total.toLocaleString()}명의 사용자
          </p>
        </div>
      </div>

      {/* 사용량 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            로딩 중...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            데이터가 없습니다.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      역할
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      월간 사용량
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      토큰
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      일일 한도
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      월간 한도
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
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
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
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
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div className="text-xs">
                          <div>입력: {user.tokensIn.toLocaleString()}</div>
                          <div>출력: {user.tokensOut.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3">
                        {editingUser === user.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {saving ? '저장 중...' : '저장'}
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStart(user)}
                            className="px-2 py-1 text-xs text-purple-600 hover:text-purple-800"
                          >
                            수정
                          </button>
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
