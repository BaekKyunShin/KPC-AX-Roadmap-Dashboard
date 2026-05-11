'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { deleteNoticeAction } from '@/app/(dashboard)/ops/notices/actions';

interface NoticeDetailActionsProps {
  noticeId: string;
  title: string;
}

/**
 * 공지 상세 페이지용 수정/삭제 버튼.
 * 운영자(OPS_ADMIN/SYSTEM_ADMIN)에서만 렌더 (호출부에서 role 체크).
 */
export function NoticeDetailActions({
  noticeId,
  title,
}: NoticeDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteNoticeAction(noticeId);
      if (result.success) {
        showSuccessToast('공지가 삭제되었습니다.');
        router.push('/ops/notices');
        router.refresh();
      } else {
        showErrorToast('삭제 실패', result.error);
      }
      setConfirmOpen(false);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" disabled={isPending}>
        <Link href={`/ops/notices/${noticeId}/edit`} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          수정
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        삭제
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="공지를 삭제하시겠습니까?"
        description={
          <>
            <span>&quot;{title}&quot;</span>
            <br />
            첨부 파일도 함께 제거됩니다.
          </>
        }
        actionLabel="삭제"
        variant="destructive"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
