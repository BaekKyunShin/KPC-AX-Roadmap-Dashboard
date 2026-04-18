'use client';

import { ROADMAP_VERSION_STATUS_CONFIG } from '@/lib/constants/status';
import type { RoadmapVersionStatus } from '@/types/database';

// ============================================================================
// PBL 보고서 상태 배지 — 로드맵 버전 상태와 동일한 DRAFT/FINAL/ARCHIVED 체계
//   계획서 Task 14: ROADMAP_VERSION_STATUS_CONFIG를 그대로 재사용 (색·라벨 공통).
//   별도 PBL_REPORT_STATUS_CONFIG는 아직 분리하지 않는다.
// ============================================================================

const MIN_REVISION_VERSION = 2;

interface PBLStatusBadgeProps {
  status: RoadmapVersionStatus;
  versionNumber?: number;
}

export function PBLStatusBadge({ status, versionNumber }: PBLStatusBadgeProps) {
  const config = ROADMAP_VERSION_STATUS_CONFIG[status];
  const label =
    status === 'DRAFT' && versionNumber !== undefined && versionNumber >= MIN_REVISION_VERSION
      ? '수정본'
      : config.label;
  return <span className={`px-2 py-1 text-xs rounded ${config.color}`}>{label}</span>;
}
