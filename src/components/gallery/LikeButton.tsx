'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      disabled={isPending}
      className={cn(
        'gap-1.5',
        liked
          ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      )}
    >
      <Heart
        className={cn(
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
          liked && 'fill-current'
        )}
      />
      <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm')}>
        {count}
      </span>
    </Button>
  );
}
