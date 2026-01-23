'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserStatus } from '@/app/(auth)/actions';
import type { User, ConsultantProfile } from '@/types/database';

interface UserWithProfile extends User {
  consultant_profile: ConsultantProfile | null;
}

interface UserManagementTableProps {
  users: UserWithProfile[];
}

export default function UserManagementTable({ users }: UserManagementTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (
    userId: string,
    action: 'approve' | 'suspend' | 'reactivate'
  ) => {
    setIsLoading(userId);
    setError(null);

    const result = await updateUserStatus(userId, action);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || '처리에 실패했습니다.');
    }

    setIsLoading(null);
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      USER_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '승인 대기' },
      CONSULTANT_APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: '승인됨' },
      OPS_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800', label: '운영관리자' },
      SYSTEM_ADMIN: { bg: 'bg-red-100', text: 'text-red-800', label: '시스템관리자' },
    };
    const badge = badges[role] || { bg: 'bg-gray-100', text: 'text-gray-800', label: role };
    return (
      <span className={`px-2 py-1 rounded text-xs ${badge.bg} ${badge.text}`}>{badge.label}</span>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' ? (
      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">활성</span>
    ) : (
      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">정지</span>
    );
  };

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                역할
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프로필
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가입일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.consultant_profile ? (
                    <span className="text-sm text-green-600">등록됨</span>
                  ) : (
                    <span className="text-sm text-gray-400">미등록</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.role === 'USER_PENDING' && (
                    <button
                      onClick={() => handleAction(user.id, 'approve')}
                      disabled={isLoading === user.id}
                      className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                    >
                      {isLoading === user.id ? '처리 중...' : '승인'}
                    </button>
                  )}
                  {user.role === 'CONSULTANT_APPROVED' && user.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAction(user.id, 'suspend')}
                      disabled={isLoading === user.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {isLoading === user.id ? '처리 중...' : '정지'}
                    </button>
                  )}
                  {user.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleAction(user.id, 'reactivate')}
                      disabled={isLoading === user.id}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      {isLoading === user.id ? '처리 중...' : '활성화'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
