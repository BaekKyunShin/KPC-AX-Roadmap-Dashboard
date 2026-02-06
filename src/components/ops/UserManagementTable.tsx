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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionLink,
} from '@/components/ui/table';

// =============================================================================
// Types
// =============================================================================

interface UserWithProfile extends User {
  consultant_profile: ConsultantProfile | null;
}

interface UserManagementTableProps {
  users: UserWithProfile[];
}

type ActionType = 'approve' | 'suspend' | 'reactivate';

// =============================================================================
// Constants
// =============================================================================

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

const COACHING_LABELS: Record<string, string> = {
  PBL: 'PBL',
  WORKSHOP: '워크숍',
  MENTORING: '멘토링',
  LECTURE: '강의',
  HYBRID: '혼합형',
};

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  USER_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '컨설턴트 승인 대기' },
  OPS_ADMIN_PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: '운영관리자 승인 대기' },
  CONSULTANT_APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: '승인됨' },
  OPS_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800', label: '운영관리자' },
  SYSTEM_ADMIN: { bg: 'bg-red-100', text: 'text-red-800', label: '시스템관리자' },
};

const TABLE_COLUMNS = {
  user: 'min-w-[160px]',
  role: 'min-w-[120px]',
  status: 'min-w-[80px]',
  profile: 'min-w-[100px]',
  joinDate: 'min-w-[100px]',
  actions: 'min-w-[100px]',
} as const;

/** 프로필 모달 내 서술형 텍스트 영역 스타일 */
const PROFILE_TEXT_AREA_CLASSES =
  'text-sm text-gray-700 whitespace-pre-wrap break-keep break-words bg-gray-50 p-3 rounded-lg';

// =============================================================================
// Component
// =============================================================================

export default function UserManagementTable({ users }: UserManagementTableProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    profile: ConsultantProfile;
    userName: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAction = async (userId: string, action: ActionType) => {
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

  const handleProfileClick = (profile: ConsultantProfile, userName: string) => {
    setSelectedProfile({ profile, userName });
  };

  const handleCloseProfile = () => {
    setSelectedProfile(null);
  };

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------

  const getRoleBadge = (role: string) => {
    const style = ROLE_BADGE_STYLES[role] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: role,
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>{style.label}</span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'ACTIVE';
    const colorClasses = isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const label = isActive ? '활성' : '정지';
    return <span className={`px-2 py-1 rounded text-xs ${colorClasses}`}>{label}</span>;
  };

  const renderUserActions = (user: UserWithProfile) => {
    const { id, role, status } = user;
    const isPending = role === 'USER_PENDING' || role === 'OPS_ADMIN_PENDING';
    const isApprovedAndActive =
      (role === 'CONSULTANT_APPROVED' || role === 'OPS_ADMIN') && status === 'ACTIVE';
    const isSuspended = status === 'SUSPENDED';

    if (isPending) {
      return (
        <TableActionLink
          variant="primary"
          onClick={() => handleAction(id, 'approve')}
          disabled={isLoading === id}
        >
          {isLoading === id ? '처리 중...' : '승인'}
        </TableActionLink>
      );
    }
    if (isApprovedAndActive) {
      return (
        <TableActionLink
          variant="danger"
          onClick={() => handleAction(id, 'suspend')}
          disabled={isLoading === id}
        >
          {isLoading === id ? '처리 중...' : '정지'}
        </TableActionLink>
      );
    }
    if (isSuspended) {
      return (
        <TableActionLink
          variant="success"
          onClick={() => handleAction(id, 'reactivate')}
          disabled={isLoading === id}
        >
          {isLoading === id ? '처리 중...' : '활성화'}
        </TableActionLink>
      );
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 사용자 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_COLUMNS.user}>사용자</TableHead>
              <TableHead className={TABLE_COLUMNS.role}>역할</TableHead>
              <TableHead className={TABLE_COLUMNS.status}>상태</TableHead>
              <TableHead className={TABLE_COLUMNS.profile}>프로필</TableHead>
              <TableHead className={TABLE_COLUMNS.joinDate}>가입일</TableHead>
              <TableHead className={TABLE_COLUMNS.actions}>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {/* 사용자 정보 */}
                <TableCell className="pl-20 pr-6 text-left">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-gray-500">{user.email}</div>
                    {user.phone && <div className="text-gray-500">{user.phone}</div>}
                  </div>
                </TableCell>

                {/* 역할 */}
                <TableCell>{getRoleBadge(user.role)}</TableCell>

                {/* 상태 */}
                <TableCell>{getStatusBadge(user.status)}</TableCell>

                {/* 프로필 */}
                <TableCell>
                  {user.consultant_profile ? (
                    <TableActionLink
                      variant="primary"
                      onClick={() => handleProfileClick(user.consultant_profile!, user.name)}
                    >
                      프로필 보기
                    </TableActionLink>
                  ) : (
                    <span className="text-gray-400">미등록</span>
                  )}
                </TableCell>

                {/* 가입일 */}
                <TableCell className="text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </TableCell>

                {/* 작업 */}
                <TableCell className="font-medium">{renderUserActions(user)}</TableCell>
              </TableRow>
            ))}

            {/* 빈 상태 */}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-gray-500">
                  등록된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 프로필 상세 모달 */}
      <Dialog open={!!selectedProfile} onOpenChange={handleCloseProfile}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProfile?.userName} 컨설턴트 프로필</DialogTitle>
            <DialogDescription>컨설턴트의 상세 프로필 정보입니다.</DialogDescription>
          </DialogHeader>

          {selectedProfile?.profile && (
            <div className="space-y-6 mt-4 min-w-0">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">소속</h4>
                  <p className="text-base font-semibold">
                    {selectedProfile.profile.affiliation || '-'}
                  </p>
                </div>
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
                    <Badge
                      key={level}
                      className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    >
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
                    <Badge
                      key={method}
                      className="bg-purple-100 text-purple-800 hover:bg-purple-100"
                    >
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
                <p className={PROFILE_TEXT_AREA_CLASSES}>
                  {selectedProfile.profile.representative_experience}
                </p>
              </div>

              {/* 포트폴리오 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">강의 포트폴리오</h4>
                <p className={PROFILE_TEXT_AREA_CLASSES}>
                  {selectedProfile.profile.portfolio}
                </p>
              </div>

              {/* 강점/제약 */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">강점/제약</h4>
                <p className={PROFILE_TEXT_AREA_CLASSES}>
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
