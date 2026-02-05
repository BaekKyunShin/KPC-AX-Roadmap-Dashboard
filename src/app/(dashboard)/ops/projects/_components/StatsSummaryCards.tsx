'use client';

import { useEffect, useState } from 'react';
import { fetchProjectStats, type ProjectStats } from '../actions';
import type { ProjectStatus } from '@/types/database';
import { PROJECT_WORKFLOW_STEPS } from '@/lib/constants/status';
import {
  FolderKanban,
  FileText,
  ClipboardCheck,
  UserCheck,
  MessageSquare,
  FileCheck,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsSummaryCardsProps {
  onStatusFilter?: (statuses: ProjectStatus[] | null) => void;
  activeStatuses?: ProjectStatus[] | null;
}

interface StatCardConfig {
  key: string;
  label: string;
  statuses: ProjectStatus[];
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  activeBorder: string;
}

/**
 * 통계 카드 설정
 * - 라벨은 PROJECT_WORKFLOW_STEPS와 동일하게 유지
 * - '전체 프로젝트' 카드가 추가로 포함됨
 */
const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'total',
    label: '전체 프로젝트',
    statuses: [],
    icon: <FolderKanban className="h-4 w-4" />,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    activeBorder: 'border-slate-400',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[0].key,
    label: PROJECT_WORKFLOW_STEPS[0].label,
    statuses: PROJECT_WORKFLOW_STEPS[0].statuses,
    icon: <FileText className="h-4 w-4" />,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
    activeBorder: 'border-gray-400',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[1].key,
    label: PROJECT_WORKFLOW_STEPS[1].label,
    statuses: PROJECT_WORKFLOW_STEPS[1].statuses,
    icon: <ClipboardCheck className="h-4 w-4" />,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    activeBorder: 'border-blue-500',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[2].key,
    label: PROJECT_WORKFLOW_STEPS[2].label,
    statuses: PROJECT_WORKFLOW_STEPS[2].statuses,
    icon: <UserCheck className="h-4 w-4" />,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    activeBorder: 'border-green-500',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[3].key,
    label: PROJECT_WORKFLOW_STEPS[3].label,
    statuses: PROJECT_WORKFLOW_STEPS[3].statuses,
    icon: <MessageSquare className="h-4 w-4" />,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    activeBorder: 'border-amber-500',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[4].key,
    label: PROJECT_WORKFLOW_STEPS[4].label,
    statuses: PROJECT_WORKFLOW_STEPS[4].statuses,
    icon: <FileCheck className="h-4 w-4" />,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50',
    activeBorder: 'border-orange-500',
  },
  {
    key: PROJECT_WORKFLOW_STEPS[5].key,
    label: PROJECT_WORKFLOW_STEPS[5].label,
    statuses: PROJECT_WORKFLOW_STEPS[5].statuses,
    icon: <Trophy className="h-4 w-4" />,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-500',
  },
];

export default function StatsSummaryCards({
  onStatusFilter,
  activeStatuses,
}: StatsSummaryCardsProps) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  const getCount = (card: StatCardConfig): number => {
    if (!stats) return 0;
    if (card.key === 'total') return stats.total;
    return card.statuses.reduce((sum, status) => sum + (stats.byStatus[status] || 0), 0);
  };

  const handleCardClick = (card: StatCardConfig) => {
    if (!onStatusFilter) return;

    if (card.key === 'total') {
      onStatusFilter(null);
    } else {
      onStatusFilter(card.statuses);
    }
  };

  const isActive = (card: StatCardConfig): boolean => {
    if (!activeStatuses) return card.key === 'total';
    if (card.key === 'total') return false;

    if (card.statuses.length !== activeStatuses.length) return false;
    return card.statuses.every(s => activeStatuses.includes(s));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg animate-shimmer" />
                <div className="h-7 w-10 rounded animate-shimmer" />
              </div>
              <div className="h-4 w-16 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {STAT_CARDS.map((card) => {
        const count = getCount(card);
        const active = isActive(card);

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card)}
            className={cn(
              'group flex flex-col items-center gap-1.5 rounded-lg border bg-white px-3 py-3 text-center shadow-sm transition-all duration-150',
              'hover:bg-gray-50 hover:shadow active:scale-[0.98]',
              active
                ? `border-b-2 ${card.activeBorder} bg-gray-50/50`
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            {/* 아이콘 + 숫자 */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  card.iconBg,
                  card.iconColor
                )}
              >
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {count.toLocaleString()}
              </p>
            </div>

            {/* 라벨 */}
            <p className="text-xs text-gray-500 leading-tight break-keep">
              {card.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}
