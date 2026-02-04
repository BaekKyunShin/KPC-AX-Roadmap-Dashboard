'use client';

import { ROADMAP_VERSION_STATUS_CONFIG } from '@/lib/constants/status';
import type { RoadmapVersionStatus } from '@/types/database';

interface RoadmapStatusBadgeProps {
  status: RoadmapVersionStatus;
}

/**
 * 로드맵 버전 상태 배지 컴포넌트
 */
export function RoadmapStatusBadge({ status }: RoadmapStatusBadgeProps) {
  const config = ROADMAP_VERSION_STATUS_CONFIG[status];
  return <span className={`px-2 py-1 text-xs rounded ${config.color}`}>{config.label}</span>;
}
