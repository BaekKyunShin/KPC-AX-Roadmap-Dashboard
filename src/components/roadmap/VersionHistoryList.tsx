'use client';

import { CheckCircle } from 'lucide-react';
import { RoadmapStatusBadge } from '@/components/roadmap/RoadmapStatusBadge';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

interface VersionHistoryListProps {
  versions: RoadmapVersionUI[];
  selectedVersionId: string | undefined;
  onVersionSelect: (versionId: string) => void;
}

/**
 * 버전 히스토리 목록 컴포넌트
 * - 왼쪽 수직 액센트 바로 선택 상태 표시
 * - 확정본(FINAL)에 체크 아이콘
 * - 이전 확정본(ARCHIVED)은 opacity 낮춤
 */
export function VersionHistoryList({
  versions,
  selectedVersionId,
  onVersionSelect,
}: VersionHistoryListProps) {
  if (versions.length === 0) {
    return <p className="text-sm text-gray-500">아직 생성된 로드맵이 없습니다.</p>;
  }

  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li key={v.id}>
          <button
            onClick={() => onVersionSelect(v.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selectedVersionId === v.id
                ? 'bg-purple-50 border-l-4 border-purple-500'
                : 'hover:bg-gray-50 border-l-4 border-transparent'
            } ${v.status === 'ARCHIVED' ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                버전 {v.version_number}
                {v.status === 'FINAL' && <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />}
              </span>
              <RoadmapStatusBadge status={v.status} versionNumber={v.version_number} />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(v.created_at).toLocaleDateString('ko-KR')}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
