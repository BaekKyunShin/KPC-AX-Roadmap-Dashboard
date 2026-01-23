'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUser } from '@/app/(auth)/actions';
import type { User } from '@/types/database';

interface NavigationProps {
  user: User;
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

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

          <div className="flex items-center space-x-4">
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
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
      </div>
    </nav>
  );
}
