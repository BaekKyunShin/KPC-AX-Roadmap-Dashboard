'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUser } from '@/app/(auth)/actions';
import type { User } from '@/types/database';

interface NavigationProps {
  user: User;
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOpsAdmin = user.role === 'OPS_ADMIN' || user.role === 'SYSTEM_ADMIN';
  const isConsultant = user.role === 'CONSULTANT_APPROVED';
  const isPending = user.role === 'USER_PENDING';

  const navItems = [];

  if (isOpsAdmin) {
    navItems.push(
      { href: '/ops/cases', label: '케이스 관리' },
      { href: '/ops/users', label: '사용자 관리' },
      { href: '/ops/audit', label: '감사로그' },
      { href: '/ops/quota', label: '쿼터 관리' }
    );
  }

  if (isConsultant) {
    navItems.push({ href: '/consultant/cases', label: '배정된 케이스' });
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                KPC AI 로드맵
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">{user.name}</span>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  isPending
                    ? 'bg-yellow-100 text-yellow-800'
                    : isOpsAdmin
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                }`}
              >
                {isPending
                  ? '승인 대기'
                  : isOpsAdmin
                    ? '운영관리자'
                    : isConsultant
                      ? '컨설턴트'
                      : user.role}
              </span>
            </div>
            <form action={logoutUser}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </form>
          </div>

          {/* 모바일 메뉴 토글 버튼 */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-expanded="false"
            >
              <span className="sr-only">메뉴 열기</span>
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname.startsWith(item.href)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4">
              <div className="text-base font-medium text-gray-800">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
            <div className="mt-3 px-2">
              <form action={logoutUser}>
                <button
                  type="submit"
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
