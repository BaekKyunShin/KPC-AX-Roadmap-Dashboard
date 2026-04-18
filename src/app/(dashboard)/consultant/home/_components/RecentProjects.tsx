import Link from 'next/link';
import { CONSULTANT_PROJECT_STATUS_CONFIG } from '@/lib/constants/status';
import type { ProjectTrack } from '@/lib/constants/tracks';
import { projectDetailHref } from '@/lib/utils/project-track';
import { TrackBadge } from '@/components/ui/TrackBadge';

export interface RecentProjectItem {
  id: string;
  companyName: string;
  industry: string;
  companySizeLabel: string;
  status: string;
  track: ProjectTrack;
  relativeTime: string;
}

/**
 * 컨설턴트 최근 프로젝트 카드 상태 라벨.
 *  - CONSULTANT_PROJECT_STATUS_CONFIG 기본 사용 + PBL_DRAFTED 보정.
 *  - PBL_DRAFTED는 "PBL 작성 중"으로 표시해 트랙 구분.
 */
function resolveStatusLabel(status: string, track: ProjectTrack): {
  label: string;
  color: string;
} {
  if (status === 'PBL_DRAFTED') {
    return { label: 'PBL 작성 중', color: 'bg-purple-100 text-purple-800' };
  }
  const config = CONSULTANT_PROJECT_STATUS_CONFIG[status];
  if (!config) {
    return { label: status, color: 'bg-gray-100 text-gray-800' };
  }
  // PBL 트랙 FINALIZED → "PBL 완료"로 미세조정
  if (status === 'FINALIZED' && track === 'PBL') {
    return { label: 'PBL 완료', color: config.color };
  }
  return config;
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
          const { label, color } = resolveStatusLabel(project.status, project.track);

          return (
            <Link
              key={project.id}
              href={projectDetailHref(project.id, project.track)}
              className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* 기업명 + 트랙 뱃지 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {project.companyName}
                  </p>
                  <TrackBadge track={project.track} size="sm" />
                </div>
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
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
                >
                  {label}
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
