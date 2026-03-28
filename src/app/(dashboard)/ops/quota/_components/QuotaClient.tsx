'use client';

import { useState, useEffect, useRef } from 'react';
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
import { fetchUsageStats, updateQuota, type UsageStats } from '../actions';

// =============================================================================
// Helpers (순수 함수)
// =============================================================================

function getUsageColor(percent: number): string {
  if (percent >= 90) return 'text-red-600 bg-red-100';
  if (percent >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getRoleBadge(role: string) {
  if (role === 'SYSTEM_ADMIN') return { className: 'bg-purple-100 text-purple-800', label: '시스템관리자' };
  if (role === 'OPS_ADMIN') return { className: 'bg-blue-100 text-blue-800', label: '운영관리자' };
  return { className: 'bg-gray-100 text-gray-800', label: '컨설턴트' };
}

function QuotaMobileCard({
  user,
  isEditing,
  editDailyLimit,
  editMonthlyLimit,
  saving,
  onEdit,
  onSave,
  onCancel,
  onDailyChange,
  onMonthlyChange,
}: {
  user: UsageStats;
  isEditing: boolean;
  editDailyLimit: number;
  editMonthlyLimit: number;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDailyChange: (value: number) => void;
  onMonthlyChange: (value: number) => void;
}) {
  const roleBadge = getRoleBadge(user.role);

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500 break-all">{user.email}</div>
        </div>
        <span className={`px-2 py-1 text-xs rounded shrink-0 ${roleBadge.className}`}>
          {roleBadge.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">월간 사용량</span>
          <div className="flex items-center gap-2">
            <span>{user.monthlyUsage.toLocaleString()}회</span>
            <span className={`px-1.5 py-0.5 text-xs rounded ${getUsageColor(user.usagePercent)}`}>
              {user.usagePercent}%
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(user.usagePercent)}`}
            style={{ width: `${Math.min(100, user.usagePercent)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">일일 한도</div>
        <div className="text-gray-900">
          {isEditing ? (
            <input
              type="number"
              value={editDailyLimit}
              onChange={(e) => onDailyChange(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              min={1}
            />
          ) : (
            `${user.dailyLimit}회`
          )}
        </div>
        <div className="text-gray-500">월간 한도</div>
        <div className="text-gray-900">
          {isEditing ? (
            <input
              type="number"
              value={editMonthlyLimit}
              onChange={(e) => onMonthlyChange(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              min={1}
            />
          ) : (
            `${user.monthlyLimit}회`
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors duration-150"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-150"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="text-sm text-purple-600 hover:text-purple-800 hover:underline underline-offset-2 transition-colors duration-150"
          >
            한도 수정
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Props
// =============================================================================

interface InitialData {
  users: UsageStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  month: string;
}

interface QuotaClientProps {
  initialData: InitialData;
  initialMonth: string;
  monthOptions: string[];
}

// =============================================================================
// QuotaClient
// =============================================================================

export default function QuotaClient({
  initialData,
  initialMonth,
  monthOptions,
}: QuotaClientProps) {
  const [users, setUsers] = useState<UsageStats[]>(initialData.users);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [total, setTotal] = useState(initialData.total);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState<number>(0);
  const [editMonthlyLimit, setEditMonthlyLimit] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 초기 마운트 시 서버에서 프리페치한 데이터를 사용하므로 fetch 스킵
  const isInitialMount = useRef(true);

  // 데이터 조회 (월 변경 또는 페이지 변경 시)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    async function loadData() {
      setLoading(true);
      const result = await fetchUsageStats({
        page,
        limit: 20,
        month: selectedMonth,
      });
      setUsers(result.users);
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

    try {
      const result = await updateQuota(editingUser, editDailyLimit, editMonthlyLimit);

      if (result.success) {
        setMessage({ type: 'success', text: '쿼터가 수정되었습니다.' });
        // 목록 새로고침
        const refreshed = await fetchUsageStats({ page, limit: 20, month: selectedMonth });
        setUsers(refreshed.users);
        setEditingUser(null);
      } else {
        setMessage({ type: 'error', text: result.error || '수정에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '서버와 통신 중 오류가 발생했습니다.' });
    }

    setSaving(false);
  }

  return (
    <>
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
              disabled={saving}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
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
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            데이터가 없습니다.
          </div>
        ) : (
          <>
          <div className="hidden md:block">
            <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">사용자</TableHead>
                <TableHead className="min-w-[100px]">역할</TableHead>
                <TableHead className="min-w-[160px]">월간 사용량</TableHead>
                <TableHead className="min-w-[100px]">일일 한도</TableHead>
                <TableHead className="min-w-[100px]">월간 한도</TableHead>
                <TableHead className="min-w-[100px]">한도 설정</TableHead>
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
                    <span className={`px-2 py-1 text-xs rounded ${getRoleBadge(user.role).className}`}>
                      {getRoleBadge(user.role).label}
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
                      <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(user.usagePercent)}`}
                          style={{ width: `${Math.min(100, user.usagePercent)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      <input
                        type="number"
                        value={editDailyLimit}
                        onChange={(e) => setEditDailyLimit(Number(e.target.value))}
                        className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-sm"
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
                        className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-sm"
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
          </div>

          {/* 모바일: 카드 뷰 */}
          <div className="md:hidden space-y-3 p-4">
            {users.map((user) => (
              <QuotaMobileCard
                key={user.id}
                user={user}
                isEditing={editingUser === user.id}
                editDailyLimit={editDailyLimit}
                editMonthlyLimit={editMonthlyLimit}
                saving={saving}
                onEdit={() => handleEditStart(user)}
                onSave={handleSave}
                onCancel={() => setEditingUser(null)}
                onDailyChange={setEditDailyLimit}
                onMonthlyChange={setEditMonthlyLimit}
              />
            ))}
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
    </>
  );
}
