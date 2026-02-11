'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleLike } from '@/app/(dashboard)/gallery/actions';

interface LikeButtonProps {
  roadmapVersionId: string;
  initialLiked: boolean;
  initialCount: number;
  size?: 'sm' | 'default';
}

export function LikeButton({
  roadmapVersionId,
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
      const result = await toggleLike(roadmapVersionId);
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
      className={cn(
        'inline-flex items-center gap-1 rounded-full transition-colors',
        isSmall ? 'px-2 py-0.5' : 'px-3 py-1',
        liked
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
        isPending && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Heart
        className={cn(
          isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4',
          liked && 'fill-current'
        )}
      />
      <span className={cn('font-medium', isSmall ? 'text-xs' : 'text-sm')}>
        {count}
      </span>
    </button>
  );
}
