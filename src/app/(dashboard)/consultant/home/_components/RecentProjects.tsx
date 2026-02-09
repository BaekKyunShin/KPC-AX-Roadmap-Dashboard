import Link from 'next/link';
import { CONSULTANT_PROJECT_STATUS_CONFIG } from '@/lib/constants/status';

export interface RecentProjectItem {
  id: string;
  companyName: string;
  industry: string;
  companySizeLabel: string;
  status: string;
  relativeTime: string;
}

interface RecentProjectsProps {
  projects: RecentProjectItem[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        최근 작업한 프로젝트가 없습니다.
      </div>
    );
  }

  return (
    <div>
      {/* 열 제목 */}
      <div className="flex items-center gap-4 pb-2 border-b border-gray-100 text-xs font-medium text-gray-400">
        <div className="flex-1 min-w-0">기업명</div>
        <div className="hidden md:block w-28">업종</div>
        <div className="hidden md:block w-20">규모</div>
        <div className="w-24 text-center">상태</div>
        <div className="w-20 text-right">최근 활동</div>
      </div>

      {/* 데이터 행 */}
      <div className="divide-y divide-gray-100">
        {projects.map((project) => {
          const statusConfig = CONSULTANT_PROJECT_STATUS_CONFIG[project.status] || {
            label: project.status,
            color: 'bg-gray-100 text-gray-800',
          };

          return (
            <Link
              key={project.id}
              href={`/consultant/projects/${project.id}`}
              className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* 기업명 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {project.companyName}
                </p>
              </div>

              {/* 업종 — 데스크톱만 */}
              <div className="hidden md:block w-28 text-sm text-gray-500 truncate">
                {project.industry}
              </div>

              {/* 규모 — 데스크톱만 */}
              <div className="hidden md:block w-20 text-sm text-gray-500 truncate">
                {project.companySizeLabel}
              </div>

              {/* 상태 배지 */}
              <div className="w-24 flex justify-center shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>

              {/* 상대 시간 */}
              <div className="w-20 text-right text-xs text-gray-400 shrink-0">
                {project.relativeTime}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
