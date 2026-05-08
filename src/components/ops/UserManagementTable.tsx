'use client';

import React, { useEffect, useMemo, useState, useTransition, useRef, useLayoutEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Users, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionLink,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateKR } from '@/lib/utils/date';

// =============================================================================
// Types
// =============================================================================

interface UserWithProfile extends User {
  consultant_profile: ConsultantProfile | null;
}

interface UserManagementTableProps {
  users: UserWithProfile[];
  /**
   * 현재 로그인한 사용자 ID. 본인 행에서는 액션 버튼을 숨기고 "본인" 뱃지로
   * 자기 권한 변경 사고를 방지한다 (#003 가드).
   */
  currentUserId?: string;
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
  USER_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '컨설턴트 (승인 대기)' },
  OPS_ADMIN_PENDING: { bg: 'bg-amber-100', text: 'text-amber-800', label: '운영관리자 (승인 대기)' },
  CONSULTANT_APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: '컨설턴트' },
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

// (#1) 검색 · 필터 · 페이지네이션 상수
const ITEMS_PER_PAGE = 10;
const MAX_VISIBLE_PAGES = 5;
const DEFAULT_FILTER_VALUE = 'all';
const SEARCH_DEBOUNCE_DELAY = 300;

const ROLE_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'USER_PENDING', label: '컨설턴트 (승인 대기)' },
  { value: 'CONSULTANT_APPROVED', label: '컨설턴트' },
  { value: 'OPS_ADMIN_PENDING', label: '운영관리자 (승인 대기)' },
  { value: 'OPS_ADMIN', label: '운영관리자' },
  { value: 'SYSTEM_ADMIN', label: '시스템관리자' },
];

const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
  { value: 'WITHDRAWN', label: '탈퇴' },
];

function FilterBadge({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1">
      {label}: {value}
      <button onClick={onClear} aria-label={`${label} 필터 제거`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/** 프로필 모달 내 서술형 텍스트 영역 스타일 */
const PROFILE_TEXT_AREA_CLASSES =
  'text-sm text-gray-700 whitespace-pre-wrap break-keep break-words bg-gray-50 p-3 rounded-lg';

// =============================================================================
// Component
// =============================================================================

interface UserMobileCardProps {
  user: UserWithProfile;
  getRoleBadge: (role: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  renderUserActions: (user: UserWithProfile) => React.ReactNode;
  onProfileClick: (profile: ConsultantProfile, name: string) => void;
}

function UserMobileCard({
  user,
  getRoleBadge,
  getStatusBadge,
  renderUserActions,
  onProfileClick,
}: UserMobileCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      {/* 헤더: 사용자명 + 역할 배지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900">{user.name}</div>
        </div>
        {getRoleBadge(user.role)}
      </div>

      {/* 본문: 이메일, 전화번호, 상태, 가입일 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">이메일</div>
        <div className="text-gray-900 break-all">{user.email}</div>
        {user.phone && (
          <>
            <div className="text-gray-500">전화번호</div>
            <div className="text-gray-900">{user.phone}</div>
          </>
        )}
        <div className="text-gray-500">상태</div>
        <div>{getStatusBadge(user.status)}</div>
        <div className="text-gray-500">가입일</div>
        <div className="text-gray-900">
          {formatDateKR(user.created_at)}
        </div>
      </div>

      {/* 푸터: 프로필 보기 + 관리 액션 */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          {user.consultant_profile ? (
            <button
              type="button"
              onClick={() => onProfileClick(user.consultant_profile!, user.name)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors duration-150"
            >
              프로필 보기
            </button>
          ) : (
            <span className="text-sm text-gray-400">미등록</span>
          )}
        </div>
        <div>{renderUserActions(user)}</div>
      </div>
    </div>
  );
}

export default function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<{
    profile: ConsultantProfile;
    userName: string;
  } | null>(null);

  // (#1) 검색·필터·페이지네이션 — URL state 동기화. ProjectList 패턴 차용.
  const [searchInput, setSearchInput] = useState(urlSearchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState(urlSearchParams.get('role') || DEFAULT_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState(urlSearchParams.get('status') || DEFAULT_FILTER_VALUE);
  const [page, setPage] = useState(Number(urlSearchParams.get('page')) || 1);
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_DELAY);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== DEFAULT_FILTER_VALUE && value !== '1') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (params.get('page') === '1') params.delete('page');
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ''}`);
  };

  // 디바운스 검색·필터 변경 시 URL 동기화 + 첫 페이지로 리셋
  useEffect(() => {
    const currentSearch = urlSearchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      setPage(1);
      updateParams({ search: debouncedSearch, page: '1' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
    updateParams({ role: value, page: '1' });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    updateParams({ status: value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateParams({ page: String(newPage) });
  };

  // 클라이언트 필터링 (Realtime 미적용 — props 갱신 시 자동 재계산)
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const match =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ? u.phone.toLowerCase().includes(q) : false);
        if (!match) return false;
      }
      if (roleFilter !== DEFAULT_FILTER_VALUE && u.role !== roleFilter) return false;
      if (statusFilter !== DEFAULT_FILTER_VALUE && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const startIdx = filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endIdx = Math.min(filtered.length, safePage * ITEMS_PER_PAGE);

  const selectedRoleLabel = roleFilter === DEFAULT_FILTER_VALUE
    ? null
    : ROLE_FILTER_OPTIONS.find((opt) => opt.value === roleFilter)?.label ?? null;
  const selectedStatusLabel = statusFilter === DEFAULT_FILTER_VALUE
    ? null
    : STATUS_FILTER_OPTIONS.find((opt) => opt.value === statusFilter)?.label ?? null;

  const hasFilters = !!debouncedSearch || roleFilter !== DEFAULT_FILTER_VALUE || statusFilter !== DEFAULT_FILTER_VALUE;
  const isFilteredEmpty = filtered.length === 0 && users.length > 0;

  // #4 H1·H7 — 검색·필터 0건일 때 한 영역으로 통합된 EmptyState. 데스크톱·모바일 두 분기에서 재사용.
  const renderFilteredEmptyState = () => {
    const titleText = debouncedSearch
      ? `'${debouncedSearch}'과(와) 일치하는 사용자가 없습니다`
      : '조건과 일치하는 사용자가 없습니다';
    const filterParts = [
      selectedRoleLabel ? `역할: ${selectedRoleLabel}` : null,
      selectedStatusLabel ? `상태: ${selectedStatusLabel}` : null,
    ].filter((s): s is string => s !== null);
    const descriptionText = filterParts.length > 0
      ? `현재 적용된 필터: ${filterParts.join(', ')}`
      : undefined;
    const handleResetAll = () => {
      setSearchInput('');
      handleRoleChange(DEFAULT_FILTER_VALUE);
      handleStatusChange(DEFAULT_FILTER_VALUE);
    };
    return (
      <EmptyState
        icon={<Search className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
        title={titleText}
        description={descriptionText}
        action={
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            필터 초기화
          </Button>
        }
      />
    );
  };

  const scrollPositionRef = useRef<number | null>(null);

  // users prop이 갱신되면 로딩 상태 해제 (React 권장 패턴: props 변경 시 상태 조정)
  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setIsLoading(null);
  }

  // Next.js layout-router의 ScrollAndFocusHandler(부모 class component)가
  // componentDidUpdate에서 htmlElement.scrollTop = 0을 실행하므로,
  // 자식인 이 컴포넌트의 useLayoutEffect보다 늦게 실행됨.
  // requestAnimationFrame을 사용하여 componentDidUpdate 이후, 브라우저 paint 이전에 복원.
  useLayoutEffect(() => {
    if (!isPending && scrollPositionRef.current !== null) {
      const savedPosition = scrollPositionRef.current;
      scrollPositionRef.current = null;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });
      });
    }
  }, [isPending]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAction = async (userId: string, action: ActionType) => {
    setIsLoading(userId);
    setError(null);

    try {
      const result = await updateUserStatus(userId, action);

      if (result.success) {
        scrollPositionRef.current = window.scrollY;
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || '처리에 실패했습니다.');
        setIsLoading(null);
      }
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.');
      setIsLoading(null);
    }
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
    // #003 — 본인 행에는 액션 버튼을 숨기고 "본인" 뱃지로 대체. 자기 권한 변경 사고 방지.
    if (currentUserId && id === currentUserId) {
      return (
        <span className="text-xs text-gray-500" data-testid="self-row-marker">
          본인
        </span>
      );
    }
    const isPendingRole = role === 'USER_PENDING' || role === 'OPS_ADMIN_PENDING';
    const isApprovedAndActive =
      (role === 'CONSULTANT_APPROVED' || role === 'OPS_ADMIN') && status === 'ACTIVE';
    const isSuspended = status === 'SUSPENDED';

    if (isPendingRole) {
      return (
        <TableActionLink
          variant="primary"
          onClick={() => handleAction(id, 'approve')}
          disabled={isLoading === id || isPending}
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
          disabled={isLoading === id || isPending}
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
          disabled={isLoading === id || isPending}
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
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* (#1) 검색 · 필터 — ProjectList 패턴 차용 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="이름·이메일·전화번호로 검색"
                aria-label="이름·이메일·전화번호 검색"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={roleFilter} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="역할 필터">
                  <SelectValue placeholder="역할" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 역할</SelectItem>
                  {ROLE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[120px]" aria-label="상태 필터">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 상태</SelectItem>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 활성 필터 칩 */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {debouncedSearch && (
                <FilterBadge label="검색" value={debouncedSearch} onClear={() => setSearchInput('')} />
              )}
              {selectedRoleLabel && (
                <FilterBadge label="역할" value={selectedRoleLabel} onClear={() => handleRoleChange(DEFAULT_FILTER_VALUE)} />
              )}
              {selectedStatusLabel && (
                <FilterBadge label="상태" value={selectedStatusLabel} onClear={() => handleStatusChange(DEFAULT_FILTER_VALUE)} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 캡션 — 총 N명 중 a~b 표시 */}
      {users.length > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="user-count-caption">
          총 {filtered.length}명{filtered.length > 0 ? ` 중 ${startIdx}~${endIdx}` : ''}
        </p>
      )}

      {/* 사용자 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {/* 데스크톱: 테이블 뷰 */}
        <div className="hidden md:block">
          <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_COLUMNS.user}>사용자</TableHead>
              <TableHead className={TABLE_COLUMNS.role}>역할</TableHead>
              <TableHead className={TABLE_COLUMNS.status}>상태</TableHead>
              <TableHead className={TABLE_COLUMNS.profile}>프로필</TableHead>
              <TableHead className={TABLE_COLUMNS.joinDate}>가입일</TableHead>
              <TableHead className={TABLE_COLUMNS.actions}>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedUsers.map((user) => (
              <TableRow key={user.id}>
                {/* 사용자 정보 */}
                <TableCell className="pl-4 md:pl-20 pr-6 text-left">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    {/* #006 — 긴 이메일이 셀 너비에 맞춰 단어 단위로 줄바꿈되도록 break-all 적용 */}
                    <div
                      className="text-gray-500 break-all"
                      data-testid="user-email-desktop"
                    >
                      {user.email}
                    </div>
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
                  {formatDateKR(user.created_at)}
                </TableCell>

                {/* 관리 */}
                <TableCell className="font-medium">{renderUserActions(user)}</TableCell>
              </TableRow>
            ))}

            {/* 빈 상태 — 검색·필터 결과 0건 vs 사용자 자체가 0명을 구분 */}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={<Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
                    title="등록된 사용자가 없습니다"
                    description="사용자가 회원가입을 완료하면 이 목록에 표시됩니다"
                  />
                </TableCell>
              </TableRow>
            )}
            {isFilteredEmpty && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  {renderFilteredEmptyState()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden space-y-3 p-4">
          {users.length === 0 ? (
            <EmptyState
              icon={<Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
              title="등록된 사용자가 없습니다"
              description="사용자가 회원가입을 완료하면 이 목록에 표시됩니다"
            />
          ) : isFilteredEmpty ? (
            renderFilteredEmptyState()
          ) : (
            pagedUsers.map((user) => (
              <UserMobileCard
                key={user.id}
                user={user}
                getRoleBadge={getRoleBadge}
                getStatusBadge={getStatusBadge}
                renderUserActions={renderUserActions}
                onProfileClick={handleProfileClick}
              />
            ))
          )}
        </div>
      </div>

      {/* (#1) 페이지네이션 — ProjectList 패턴 (최대 5 페이지 버튼) */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {(() => {
            const start = Math.max(1, Math.min(safePage - 2, totalPages - MAX_VISIBLE_PAGES + 1));
            const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
            const buttons: React.ReactNode[] = [];
            for (let p = start; p <= end; p += 1) {
              buttons.push(
                <Button
                  key={p}
                  variant={p === safePage ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePageChange(p)}
                  aria-label={`${p} 페이지`}
                  aria-current={p === safePage ? 'page' : undefined}
                  className="h-8 min-w-8 px-2"
                >
                  {p}
                </Button>,
              );
            }
            return buttons;
          })()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {formatDateKR(selectedProfile.profile.created_at)}
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
