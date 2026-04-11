'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ClipboardCheck,
  LayoutList,
  FolderOpen,
  ListChecks,
  FileStack,
} from 'lucide-react';

const MOCKUP_NAV = [
  {
    label: '컨설턴트',
    items: [
      {
        href: '/mockup/consultant-deliverable-tab',
        label: '프로젝트 결과물 탭',
        icon: ClipboardCheck,
      },
      {
        href: '/mockup/consultant-results',
        label: '결과물 관리',
        icon: LayoutList,
      },
    ],
  },
  {
    label: '운영관리자',
    items: [
      {
        href: '/mockup/ops-deliverable-section',
        label: '프로젝트 결과물 섹션',
        icon: FolderOpen,
      },
      {
        href: '/mockup/ops-results',
        label: '결과물 관리',
        icon: ListChecks,
      },
      {
        href: '/mockup/ops-templates',
        label: '서류 템플릿 관리',
        icon: FileStack,
      },
    ],
  },
];

export default function MockupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
        목업 미리보기 — 실제 기능이 아닌 UI 시안입니다
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-36px)] bg-white border-r border-gray-200 p-4 flex-shrink-0">
          <Link
            href="/mockup"
            className="text-lg font-bold text-gray-900 mb-6 block"
          >
            결과물 제출 목업
          </Link>

          <nav className="space-y-6">
            {MOCKUP_NAV.map((group) => (
              <div key={group.label}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.label}
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
