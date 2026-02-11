import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuideKeyPoint, GuideKeyPointStatus } from '@/lib/schemas/interview-guide';

interface GuideKeyPointsProps {
  keyPoints: GuideKeyPoint[];
}

const STATUS_CONFIG: Record<
  GuideKeyPointStatus,
  { icon: typeof AlertCircle; iconClass: string; bgClass: string; borderClass: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50/60',
    borderClass: 'border-l-red-400',
    label: '위험',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-50/60',
    borderClass: 'border-l-amber-400',
    label: '주의',
  },
  good: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50/60',
    borderClass: 'border-l-green-400',
    label: '양호',
  },
};

export function GuideKeyPoints({ keyPoints }: GuideKeyPointsProps) {
  // critical → warning → good 순으로 정렬
  const sorted = [...keyPoints].sort((a, b) => {
    const order: Record<GuideKeyPointStatus, number> = { critical: 0, warning: 1, good: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-2.5">
      {sorted.map((point) => {
        const config = STATUS_CONFIG[point.status];
        const Icon = config.icon;

        return (
          <div
            key={point.dimension}
            className={cn(
              'flex items-start gap-3 rounded-lg border-l-[3px] px-4 py-3',
              config.bgClass,
              config.borderClass,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', config.iconClass)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {point.dimension}
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  point.status === 'critical' && 'bg-red-100 text-red-700',
                  point.status === 'warning' && 'bg-amber-100 text-amber-700',
                  point.status === 'good' && 'bg-green-100 text-green-700',
                )}>
                  {point.score_percent}%
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{point.insight}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
