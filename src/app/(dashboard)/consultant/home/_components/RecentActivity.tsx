import Link from 'next/link';
import { FileText, Users, Map } from 'lucide-react';
import { getActivityAction, getActivityTagInfo } from '@/lib/utils/consultant-home';

export interface RecentActivityItem {
  id: string;
  projectId: string;
  companyName: string;
  content: string;
  logType: string;
  relativeTime: string;
}

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

/** 태그 라벨 기준 아이콘 매핑 (3종) */
const TAG_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  활동메모: FileText,
  인터뷰: Users,
  로드맵: Map,
};

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        최근 활동이 없습니다.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity) => {
        const tagInfo = getActivityTagInfo(activity.logType, activity.content);
        const Icon = TAG_ICON_MAP[tagInfo.label] || FileText;

        return (
          <Link
            key={activity.id}
            href={`/consultant/projects/${activity.projectId}`}
            className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* 아이콘 */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${tagInfo.bgColor} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${tagInfo.textColor}`} />
            </div>

            {/* 멘트 — flex-1로 남은 공간 차지 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                <span className="font-medium">{activity.companyName}</span>
                {getActivityAction(activity.logType, activity.content)}
              </p>
            </div>

            {/* 타입 라벨 — 데스크톱에서만 표시 */}
            <div className="hidden md:flex w-20 justify-center shrink-0">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tagInfo.bgColor} ${tagInfo.textColor}`}
              >
                {tagInfo.label}
              </span>
            </div>

            {/* 상대 시간 */}
            <div className="w-20 text-right text-xs text-gray-400 shrink-0">
              {activity.relativeTime}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
