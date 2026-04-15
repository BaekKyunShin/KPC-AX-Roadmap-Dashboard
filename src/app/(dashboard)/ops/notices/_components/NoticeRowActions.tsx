'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Pin, PinOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import {
  deleteNoticeAction,
  togglePinAction,
} from '@/app/(dashboard)/ops/notices/actions';

interface NoticeRowActionsProps {
  noticeId: string;
  isPinned: boolean;
  title: string;
}

export function NoticeRowActions({
  noticeId,
  isPinned,
  title,
}: NoticeRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleTogglePin() {
    startTransition(async () => {
      const result = await togglePinAction(noticeId, !isPinned);
      if (result.success) {
        showSuccessToast(
          !isPinned ? '상단 고정되었습니다.' : '상단 고정이 해제되었습니다.',
        );
        router.refresh();
      } else {
        showErrorToast('상태 변경 실패', result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`"${title}" 공지를 삭제하시겠습니까?\n첨부 파일도 함께 제거됩니다.`))
      return;
    startTransition(async () => {
      const result = await deleteNoticeAction(noticeId);
      if (result.success) {
        showSuccessToast('공지가 삭제되었습니다.');
        router.refresh();
      } else {
        showErrorToast('삭제 실패', result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleTogglePin}
        disabled={isPending}
        aria-label={isPinned ? '상단 고정 해제' : '상단 고정'}
        className="gap-1"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPinned ? (
          <PinOff className="h-3.5 w-3.5" />
        ) : (
          <Pin className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link
          href={`/ops/notices/${noticeId}/edit`}
          aria-label="편집"
          className="gap-1"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="삭제"
        className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
