'use client';

import { ROADMAP_VERSION_STATUS_CONFIG } from '@/lib/constants/status';
import type { RoadmapVersionStatus } from '@/types/database';

/** 수정본으로 표시되는 최소 버전 번호 (버전 2부터 "수정본") */
const MIN_REVISION_VERSION = 2;

interface RoadmapStatusBadgeProps {
  status: RoadmapVersionStatus;
  versionNumber?: number;
}

/**
 * 로드맵 버전 상태 배지 컴포넌트
 * - DRAFT 상태: 버전 1이면 "초안", 버전 2 이상이면 "수정본"
 * - FINAL/ARCHIVED: 기존 라벨 그대로
 */
export function RoadmapStatusBadge({ status, versionNumber }: RoadmapStatusBadgeProps) {
  const config = ROADMAP_VERSION_STATUS_CONFIG[status];
  const label =
    status === 'DRAFT' && versionNumber !== undefined && versionNumber >= MIN_REVISION_VERSION
      ? '수정본'
      : config.label;
  return <span className={`px-2 py-1 text-xs rounded ${config.color}`}>{label}</span>;
}
