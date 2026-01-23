'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserStatus } from '@/app/(auth)/actions';
import type { User, ConsultantProfile } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface UserWithProfile extends User {
  consultant_profile: ConsultantProfile | null;
}

interface UserManagementTableProps {
  users: UserWithProfile[];
}

// 레벨 라벨 매핑
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

// 코칭 방식 라벨 매핑
const COACHING_LABELS: Record<string, string> = {
  PBL: 'PBL',
  WORKSHOP: '워크숍',
  MENTORING: '멘토링',
  LECTURE: '강의',
  HYBRID: '혼합형',
};

export default function UserManagementTable({ users }: UserManagementTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    profile: ConsultantProfile;
    userName: string;
  } | null>(null);

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
      USER_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '컨설턴트 승인 대기' },
      OPS_ADMIN_PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: '운영관리자 승인 대기' },
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
                    <button
                      onClick={() =>
                        setSelectedProfile({
                          profile: user.consultant_profile!,
                          userName: user.name,
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      프로필 보기
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400">미등록</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {(user.role === 'USER_PENDING' || user.role === 'OPS_ADMIN_PENDING') && (
                    <button
                      onClick={() => handleAction(user.id, 'approve')}
                      disabled={isLoading === user.id}
                      className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                    >
                      {isLoading === user.id ? '처리 중...' : '승인'}
                    </button>
                  )}
                  {(user.role === 'CONSULTANT_APPROVED' || user.role === 'OPS_ADMIN') && user.status === 'ACTIVE' && (
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

      {/* 프로필 상세 모달 */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProfile?.userName} 컨설턴트 프로필</DialogTitle>
            <DialogDescription>컨설턴트의 상세 프로필 정보입니다.</DialogDescription>
          </DialogHeader>

          {selectedProfile?.profile && (
            <div className="space-y-6 mt-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">경력 연수</h4>
                  <p className="text-base font-semibold">
                    {selectedProfile.profile.years_of_experience}년
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">프로필 등록일</h4>
                  <p className="text-base">
                    {new Date(selectedProfile.profile.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* 전문분야 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">전문분야</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.profile.expertise_domains.map((domain) => (
                    <Badge key={domain} variant="secondary">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 가능 업종 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">가능 업종</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.profile.available_industries.map((industry) => (
                    <Badge key={industry} variant="outline">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 강의 가능 레벨 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">강의 가능 레벨</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.profile.teaching_levels.map((level) => (
                    <Badge key={level} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                      {LEVEL_LABELS[level] || level}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 코칭 방식 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">코칭 방식</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.profile.coaching_methods.map((method) => (
                    <Badge key={method} className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                      {COACHING_LABELS[method] || method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 역량 태그 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">역량 태그</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.profile.skill_tags.map((tag) => (
                    <Badge key={tag} className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 대표 수행경험 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">대표 수행경험/프로젝트</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedProfile.profile.representative_experience}
                </p>
              </div>

              {/* 포트폴리오 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">강의 포트폴리오</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedProfile.profile.portfolio}
                </p>
              </div>

              {/* 강점/제약 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">강점/제약</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selectedProfile.profile.strengths_constraints}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
