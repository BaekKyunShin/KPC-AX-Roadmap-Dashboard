'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleLike, togglePBLLike } from '@/app/(dashboard)/gallery/actions';
import type { ProjectTrack } from '@/lib/constants/tracks';

interface LikeButtonProps {
  roadmapVersionId: string;
  /** 트랙 — PBL이면 pbl_likes 대상, 그 외 roadmap_likes (OFA-11 신규) */
  track?: ProjectTrack;
  initialLiked: boolean;
  initialCount: number;
  size?: 'sm' | 'default';
}

export function LikeButton({
  roadmapVersionId,
  track = 'ROADMAP',
  initialLiked,
  initialCount,
  size = 'sm',
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    // 낙관적 업데이트
    setLiked((prev) => !prev);
    setCount((prev) => (liked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = track === 'PBL'
        ? await togglePBLLike(roadmapVersionId)
        : await toggleLike(roadmapVersionId);
      if (result.success) {
        setLiked(result.data.liked);
        setCount(result.data.count);
      } else {
        // 롤백
        setLiked((prev) => !prev);
        setCount((prev) => (liked ? prev + 1 : prev - 1));
      }
    });
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      disabled={isPending}
      aria-label={liked ? `좋아요 취소 (${count})` : `좋아요 (${count})`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full transition-colors',
        isSmall ? 'px-2.5 py-0.5' : 'px-3 py-1',
        liked
          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        isPending && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Heart
        className={cn('h-4 w-4', liked && 'fill-current')}
      />
      <span className="text-sm font-medium">
        {count}
      </span>
    </button>
  );
}
