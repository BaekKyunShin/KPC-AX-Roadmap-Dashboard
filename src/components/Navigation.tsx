'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUser } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Settings,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import NotificationBell from '@/components/NotificationBell';
import MessageIcon from '@/components/MessageIcon';
import CommandPalette from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useRecentVisits } from '@/hooks/useRecentVisits';
import {
  CONSULTANT_NAV_ITEMS,
  ADMIN_NAV_GROUPS,
  getInitials,
  getRoleBadgeConfig,
  isGroupActive,
} from '@/lib/constants/navigation';
import type { NavGroup } from '@/lib/constants/navigation';
import type { User } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface NavigationProps {
  user: User;
  unreadCount?: number;
  unreadMessageCount?: number;
}

// =============================================================================
// Sub-Components
// =============================================================================

/** 데스크톱용 관리자 드롭다운 그룹 */
function NavGroupDropdown({
  group,
  isOpen,
  onToggle,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate: () => void;
}) {
  const groupActive = isGroupActive(group, pathname);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          groupActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        {group.label}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg z-50">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 모바일용 관리자 아코디언 그룹 */
function MobileNavGroup({
  group,
  isOpen,
  onToggle,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onNavigate: () => void;
}) {
  const groupActive = isGroupActive(group, pathname);

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between px-3 py-3 rounded-lg text-base font-medium transition-colors',
          groupActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-1">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function Navigation({ user, unreadCount = 0, unreadMessageCount = 0 }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null);
  const [openMobileGroup, setOpenMobileGroup] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navGroupRef = useRef<HTMLDivElement>(null);

  const isSystemAdmin = user.role === 'SYSTEM_ADMIN';
  const isOpsAdmin = user.role === 'OPS_ADMIN' || isSystemAdmin;
  const isConsultant = user.role === 'CONSULTANT_APPROVED';
  const commandPalette = useCommandPalette();
  const { recentVisits } = useRecentVisits();

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (navGroupRef.current && !navGroupRef.current.contains(event.target as Node)) {
        setOpenGroupIndex(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderRoleBadge = () => {
    const config = getRoleBadgeConfig(user.role);

    if (config) {
      return (
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      );
    }

    return <Badge variant="outline">{user.role}</Badge>;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group">
              <Logo height={26} className="transition-opacity group-hover:opacity-80" />
            </Link>

            {/* Desktop Navigation — 컨설턴트: 플랫 */}
            {isConsultant && (
              <div className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
                {CONSULTANT_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Desktop Navigation — 관리자: 드롭다운 3그룹 */}
            {isOpsAdmin && (
              <div className="hidden md:flex items-center gap-1" data-testid="desktop-nav" ref={navGroupRef}>
                {ADMIN_NAV_GROUPS.map((group, index) => (
                  <NavGroupDropdown
                    key={group.label}
                    group={group}
                    isOpen={openGroupIndex === index}
                    onToggle={() =>
                      setOpenGroupIndex(openGroupIndex === index ? null : index)
                    }
                    pathname={pathname}
                    onNavigate={() => setOpenGroupIndex(null)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-2" data-testid="desktop-user-area">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => commandPalette.setOpen(true)}
              aria-label="검색 (⌘K)"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Message Icon */}
            <MessageIcon initialUnreadCount={unreadMessageCount} />

            {/* Notification Bell */}
            <NotificationBell initialUnreadCount={unreadCount} userRole={user.role} />

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                {renderRoleBadge()}
                <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', isUserMenuOpen && 'rotate-180')} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg py-1 z-50" data-testid="user-dropdown-menu">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* 컨설턴트일 때만 프로필 관리 표시 */}
                  {isConsultant && (
                    <Link
                      href="/consultant/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        pathname === '/consultant/profile'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <UserCog className="h-4 w-4" />
                      프로필 관리
                    </Link>
                  )}

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      pathname === '/dashboard/settings'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    계정 설정
                  </Link>

                  <Separator className="my-1" />

                  <form action={logoutUser}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Search + Message + Notification + Menu Button */}
          <div className="flex items-center gap-1 md:hidden" data-testid="mobile-header">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => commandPalette.setOpen(true)}
              aria-label="검색"
              className="h-9 w-9"
            >
              <Search className="h-4 w-4" />
            </Button>
            <MessageIcon initialUnreadCount={unreadMessageCount} />
            <NotificationBell initialUnreadCount={unreadCount} userRole={user.role} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              data-testid="mobile-menu-button"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white" data-testid="mobile-menu">
          <div className="px-4 py-4 space-y-1">
            {/* 컨설턴트: 플랫 메뉴 */}
            {isConsultant &&
              CONSULTANT_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-3 rounded-lg text-base font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>
                );
              })}

            {/* 관리자: 아코디언 그룹 */}
            {isOpsAdmin &&
              ADMIN_NAV_GROUPS.map((group, index) => (
                <MobileNavGroup
                  key={group.label}
                  group={group}
                  isOpen={openMobileGroup === index}
                  onToggle={() =>
                    setOpenMobileGroup(openMobileGroup === index ? null : index)
                  }
                  pathname={pathname}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
              ))}
          </div>

          <Separator />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-4" data-testid="mobile-user-info">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-base font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              {renderRoleBadge()}
            </div>

            <div className="space-y-2">
              {/* 컨설턴트일 때만 프로필 관리 표시 */}
              {isConsultant && (
                <Link
                  href="/consultant/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    pathname === '/consultant/profile'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 border-gray-200'
                  )}
                >
                  <UserCog className="h-4 w-4" />
                  프로필 관리
                </Link>
              )}

              <Link
                href="/dashboard/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                  pathname === '/dashboard/settings'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 border-gray-200'
                )}
              >
                <Settings className="h-4 w-4" />
                계정 설정
              </Link>

              <form action={logoutUser}>
                <Button variant="outline" className="w-full justify-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      {(isConsultant || isOpsAdmin) && (
        <CommandPalette
          userRole={user.role as 'CONSULTANT_APPROVED' | 'OPS_ADMIN' | 'SYSTEM_ADMIN'}
          recentVisits={recentVisits}
          {...commandPalette}
        />
      )}
    </nav>
  );
}
