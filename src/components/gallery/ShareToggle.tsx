'use client';

import { useState, useTransition } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleShare } from '@/app/(dashboard)/gallery/actions';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

interface ShareToggleProps {
  roadmapVersionId: string;
  initialShared: boolean;
}

export function ShareToggle({ roadmapVersionId, initialShared }: ShareToggleProps) {
  const [isShared, setIsShared] = useState(initialShared);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleShare(roadmapVersionId);
      if (result.success) {
        setIsShared(result.data.isShared);
        showSuccessToast(
          result.data.isShared
            ? '갤러리에 공유되었습니다.'
            : '갤러리 공유가 해제되었습니다.'
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
            <p className="text-xs text-gray-500">
              다른 컨설턴트가 이 로드맵을 열람하고 활용할 수 있습니다.
            </p>
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
