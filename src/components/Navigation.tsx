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
  FolderKanban,
  Users,
  ScrollText,
  Gauge,
  Briefcase,
  FlaskConical,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import type { User } from '@/types/database';

interface NavigationProps {
  user: User;
}

const OPS_NAV_ITEMS = [
  { href: '/ops/projects', label: '프로젝트 관리', icon: FolderKanban },
  { href: '/ops/users', label: '사용자 관리', icon: Users },
  { href: '/ops/audit', label: '감사로그', icon: ScrollText },
  { href: '/ops/quota', label: '쿼터 관리', icon: Gauge },
  { href: '/test-roadmap', label: '테스트 로드맵', icon: FlaskConical },
];

const CONSULTANT_NAV_ITEMS = [
  { href: '/consultant/projects', label: '배정된 프로젝트', icon: Briefcase },
  { href: '/test-roadmap', label: '테스트 로드맵', icon: FlaskConical },
];

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isOpsAdmin = user.role === 'OPS_ADMIN' || user.role === 'SYSTEM_ADMIN';
  const isConsultant = user.role === 'CONSULTANT_APPROVED';
  const isPending = user.role === 'USER_PENDING';
  const isOpsAdminPending = user.role === 'OPS_ADMIN_PENDING';

  const navItems = isOpsAdmin ? OPS_NAV_ITEMS : isConsultant ? CONSULTANT_NAV_ITEMS : [];

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = () => {
    if (isPending)
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          컨설턴트 승인 대기
        </Badge>
      );
    if (isOpsAdminPending)
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          운영관리자 승인 대기
        </Badge>
      );
    if (isOpsAdmin)
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          운영관리자
        </Badge>
      );
    if (isConsultant)
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          컨설턴트
        </Badge>
      );
    return <Badge variant="outline">{user.role}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-2">
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
                {getRoleBadge()}
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg py-1 z-50">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* 컨설턴트일 때만 프로필 관리 표시 */}
                  {isConsultant && (
                    <>
                      <Link
                        href="/consultant/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          pathname === '/consultant/profile'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <UserCog className="h-4 w-4" />
                        프로필 관리
                      </Link>
                      <Separator className="my-1" />
                    </>
                  )}

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

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              );
            })}
          </div>

          <Separator />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-base font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              {getRoleBadge()}
            </div>

            <div className="space-y-2">
              {/* 컨설턴트일 때만 프로필 관리 표시 */}
              {isConsultant && (
                <Link
                  href="/consultant/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    pathname === '/consultant/profile'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <UserCog className="h-4 w-4" />
                  프로필 관리
                </Link>
              )}

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
    </nav>
  );
}
