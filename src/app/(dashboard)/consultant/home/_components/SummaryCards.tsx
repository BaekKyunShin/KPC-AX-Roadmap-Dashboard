import Link from 'next/link';
import {
  FolderOpen,
  CalendarClock,
  ClipboardCheck,
  PenLine,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  total: number;
  waitingInterview: number;
  interviewDone: number;
  draftingRoadmap: number;
  roadmapCompleted: number;
}

const CARDS = [
  {
    label: '전체 프로젝트',
    icon: FolderOpen,
    borderColor: 'border-gray-400',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-400',
    field: 'total',
    statusFilter: null,
  },
  {
    label: '인터뷰 대기',
    icon: CalendarClock,
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600',
    iconColor: 'text-blue-400',
    field: 'waitingInterview',
    statusFilter: 'ASSIGNED',
  },
  {
    label: '인터뷰 완료',
    icon: ClipboardCheck,
    borderColor: 'border-amber-400',
    textColor: 'text-amber-600',
    iconColor: 'text-amber-400',
    field: 'interviewDone',
    statusFilter: 'INTERVIEWED',
  },
  {
    // ROADMAP_DRAFTED + PBL_DRAFTED 합산. 링크는 ROADMAP_DRAFTED 기본(PBL은 아래 카드에 별도 표시 가능하나
    // 목록 필터가 단일 값이라 공용 "초안 작성 중" 카드로 일반화).
    label: '초안 작성 중',
    icon: PenLine,
    borderColor: 'border-purple-400',
    textColor: 'text-purple-600',
    iconColor: 'text-purple-400',
    field: 'draftingRoadmap',
    statusFilter: 'ROADMAP_DRAFTED',
  },
  {
    label: '양식 확정',
    icon: CheckCircle2,
    borderColor: 'border-green-400',
    textColor: 'text-green-600',
    iconColor: 'text-green-400',
    field: 'roadmapCompleted',
    statusFilter: 'FINALIZED',
  },
] as const;

export function SummaryCards({
  total,
  waitingInterview,
  interviewDone,
  draftingRoadmap,
  roadmapCompleted,
}: SummaryCardsProps) {
  const values = { total, waitingInterview, interviewDone, draftingRoadmap, roadmapCompleted };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        const isLastCardInOddTotal =
          i === CARDS.length - 1 && CARDS.length % 2 !== 0;
        return (
          <Link
            key={card.field}
            href={card.statusFilter ? `/consultant/projects?status=${card.statusFilter}` : '/consultant/projects'}
            className={cn(
              'bg-white rounded-lg shadow-sm p-4 border-l-4',
              'transition-all duration-200 ease-out',
              'hover:-translate-y-1 hover:shadow-md',
              'block cursor-pointer',
              card.borderColor,
              isLastCardInOddTotal && 'col-span-2 lg:col-span-1',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <Icon className={cn('h-5 w-5', card.iconColor)} />
            </div>
            <p className={cn('mt-2 text-3xl font-bold', card.textColor)}>
              {values[card.field]}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
