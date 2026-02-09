import {
  FolderOpen,
  CalendarClock,
  PenLine,
  CheckCircle2,
} from 'lucide-react';

interface SummaryCardsProps {
  total: number;
  waitingInterview: number;
  inProgress: number;
  completed: number;
}

const CARDS = [
  {
    key: 'total',
    label: '전체 프로젝트',
    icon: FolderOpen,
    borderColor: 'border-gray-400',
    textColor: 'text-gray-900',
    iconColor: 'text-gray-400',
    field: 'total' as const,
  },
  {
    key: 'waitingInterview',
    label: '인터뷰 대기',
    icon: CalendarClock,
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    iconColor: 'text-blue-400',
    field: 'waitingInterview' as const,
  },
  {
    key: 'inProgress',
    label: '로드맵 작성 중',
    icon: PenLine,
    borderColor: 'border-violet-500',
    textColor: 'text-violet-600',
    iconColor: 'text-violet-400',
    field: 'inProgress' as const,
  },
  {
    key: 'completed',
    label: '완료',
    icon: CheckCircle2,
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-600',
    iconColor: 'text-emerald-400',
    field: 'completed' as const,
  },
] as const;

export function SummaryCards({ total, waitingInterview, inProgress, completed }: SummaryCardsProps) {
  const values = { total, waitingInterview, inProgress, completed };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`bg-white rounded-lg shadow p-4 border-l-4 ${card.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>
              {values[card.field]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
