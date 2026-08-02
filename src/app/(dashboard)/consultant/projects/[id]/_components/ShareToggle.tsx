'use client';

import { useState, useTransition } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleShare, togglePBLShare } from '@/app/(dashboard)/gallery/actions';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

/** 공유 대상 트랙. 같은 폴더 `LikeButton` 과 동일한 단일 prop 분기 방식. */
type ShareTrack = 'ROADMAP' | 'PBL';

/** 트랙별 설명 문구. 제목·스위치·토스트는 공통이고 이 한 줄만 갈린다. */
const TRACK_DESCRIPTION: Record<ShareTrack, string> = {
  ROADMAP: '다른 컨설턴트가 이 로드맵을 열람하고 활용할 수 있습니다.',
  PBL: '다른 컨설턴트가 이 PBL 보고서를 열람하고 활용할 수 있습니다.',
};

interface ShareToggleProps {
  /**
   * 공유 대상 id. `track='PBL'` 이면 `pbl_reports.id`, 그 외에는 `roadmap_versions.id`.
   * prop 명을 트랙별로 나누지 않은 것은 `LikeButton` 과 같은 규칙을 쓰기 위함이다.
   */
  roadmapVersionId: string;
  initialShared: boolean;
  /** 기본값 `ROADMAP` — track 을 넘기지 않는 기존 로드맵 호출부는 그대로 동작한다. */
  track?: ShareTrack;
}

export function ShareToggle({
  roadmapVersionId,
  initialShared,
  track = 'ROADMAP',
}: ShareToggleProps) {
  const [isShared, setIsShared] = useState(initialShared);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result =
        track === 'PBL'
          ? await togglePBLShare(roadmapVersionId)
          : await toggleShare(roadmapVersionId);
      if (result.success) {
        setIsShared(result.data.isShared);
        showSuccessToast(
          '공유 설정 변경',
          result.data.isShared ? '갤러리에 공유되었습니다.' : '갤러리 공유가 해제되었습니다.'
        );
      } else {
        showErrorToast('공유 설정 변경 실패', result.error);
      }
    });
  };

  return (
    <div className="rounded-lg border bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">갤러리에 공유</p>
            <p className="text-xs text-gray-500">{TRACK_DESCRIPTION[track]}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isShared}
          disabled={isPending}
          onClick={handleToggle}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            isShared ? 'bg-primary' : 'bg-gray-200',
            isPending && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white transition-transform',
              isShared ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  );
}
