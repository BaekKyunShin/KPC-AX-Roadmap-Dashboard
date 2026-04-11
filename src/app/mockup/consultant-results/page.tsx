'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { Search, FileCheck, Clock, CheckCircle2, ChevronRight, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Dummy data                                                         */
/* ------------------------------------------------------------------ */

type ProjectStatus = 'COMPLETED' | 'FINALIZED';

interface ProjectRow {
  company: string;
  status: ProjectStatus;
  docsSubmitted: number;
  docsTotal: number;
  submittedAt: string | null;
}

const PROJECTS: ProjectRow[] = [
  { company: '(주)한국전자', status: 'COMPLETED', docsSubmitted: 4, docsTotal: 4, submittedAt: '2026-04-10' },
  { company: '대한물산(주)', status: 'FINALIZED', docsSubmitted: 2, docsTotal: 4, submittedAt: null },
  { company: '미래테크', status: 'FINALIZED', docsSubmitted: 0, docsTotal: 4, submittedAt: null },
  { company: '글로벌솔루션', status: 'COMPLETED', docsSubmitted: 4, docsTotal: 4, submittedAt: '2026-04-08' },
  { company: '(주)스마트팩토리', status: 'COMPLETED', docsSubmitted: 4, docsTotal: 4, submittedAt: '2026-04-07' },
  { company: '청운산업', status: 'FINALIZED', docsSubmitted: 3, docsTotal: 4, submittedAt: null },
  { company: '(주)넥스트AI', status: 'COMPLETED', docsSubmitted: 4, docsTotal: 4, submittedAt: '2026-04-05' },
  { company: '한빛전기', status: 'COMPLETED', docsSubmitted: 4, docsTotal: 4, submittedAt: '2026-04-03' },
];

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

type FilterTab = '전체' | '미제출' | '제출완료';

function isSubmitted(row: ProjectRow) {
  return row.docsSubmitted === row.docsTotal;
}

function filterRows(rows: ProjectRow[], tab: FilterTab, query: string) {
  let filtered = rows;
  if (tab === '미제출') filtered = filtered.filter((r) => !isSubmitted(r));
  if (tab === '제출완료') filtered = filtered.filter((r) => isSubmitted(r));
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter((r) => r.company.toLowerCase().includes(q));
  }
  return filtered;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/* ------------------------------------------------------------------ */
/*  Summary card                                                       */
/* ------------------------------------------------------------------ */

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}

function SummaryCard({ icon, label, count, active, onClick }: SummaryCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer border border-gray-200 bg-white py-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm',
        active && 'ring-2 ring-blue-500 border-blue-500',
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {count}
            <span className="ml-0.5 text-base font-medium text-gray-500">건</span>
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ submitted, total }: { submitted: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((submitted / total) * 100);
  const complete = submitted === total;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
        {pct > 0 && (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              complete ? 'bg-emerald-500' : 'bg-blue-500',
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="text-xs text-gray-600 tabular-nums">
        {pct}%
      </span>
      <span className="text-xs text-gray-400">
        ({submitted}/{total})
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        제출완료
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      로드맵 확정
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Search className="h-6 w-6 text-gray-300" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">검색 결과가 없습니다</p>
      <p className="mt-1 text-xs text-gray-500">필터 조건을 변경하거나 검색어를 수정해 보세요.</p>
      <button
        type="button"
        className="mt-4 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        onClick={onReset}
      >
        필터 초기화
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ConsultantResultsMockupPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = PROJECTS.length;
  const unsubmittedCount = PROJECTS.filter((r) => !isSubmitted(r)).length;
  const submittedCount = PROJECTS.filter((r) => isSubmitted(r)).length;

  const rows = useMemo(() => filterRows(PROJECTS, activeTab, searchQuery), [activeTab, searchQuery]);

  const tabCounts: Record<FilterTab, number> = {
    '전체': totalCount,
    '미제출': unsubmittedCount,
    '제출완료': submittedCount,
  };

  const TABS: FilterTab[] = ['전체', '미제출', '제출완료'];

  function handleCardClick(tab: FilterTab) {
    setActiveTab(tab);
  }

  function handleReset() {
    setActiveTab('전체');
    setSearchQuery('');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <PageHeader title="결과물 관리" description="담당 프로젝트의 서류 제출 현황을 관리합니다." />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<FileCheck className="h-5 w-5 text-gray-400" />}
          label="전체"
          count={totalCount}
          active={activeTab === '전체'}
          onClick={() => handleCardClick('전체')}
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="미제출"
          count={unsubmittedCount}
          active={activeTab === '미제출'}
          onClick={() => handleCardClick('미제출')}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="제출완료"
          count={submittedCount}
          active={activeTab === '제출완료'}
          onClick={() => handleCardClick('제출완료')}
        />
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="inline-flex gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="기업명 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full border-gray-200 pl-9 pr-9 focus:border-blue-500 focus:ring-blue-500 sm:w-64"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              onClick={() => setSearchQuery('')}
              aria-label="검색어 지우기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="py-0">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState onReset={handleReset} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="whitespace-nowrap px-6 py-3 font-medium">기업명</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">프로젝트 상태</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">필수 서류</th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">제출일</th>
                  <th className="w-10 px-3 py-3"><span className="sr-only">상세</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.company}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{row.company}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <ProgressBar submitted={row.docsSubmitted} total={row.docsTotal} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {row.submittedAt ? (
                        formatDate(row.submittedAt)
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-gray-300">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
