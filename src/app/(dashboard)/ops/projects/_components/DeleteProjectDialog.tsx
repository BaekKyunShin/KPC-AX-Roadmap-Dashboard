'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { SimpleActionResult } from '@/lib/types/action-result';

interface DeleteProjectDialogProps {
  projectId: string;
  companyName: string;
  onConfirm: (projectId: string, confirmText: string) => Promise<SimpleActionResult>;
  /** 삭제 성공 후 후처리 (목록 갱신 등). */
  onDeleted?: () => void;
}

/**
 * 운영관리자 프로젝트 목록의 작업 열에 노출되는 삭제 확인 다이얼로그.
 *
 * 안전 장치:
 * - 안내 문구 명시 (관련 데이터 모두 삭제 + 되돌릴 수 없음)
 * - 확인 입력란에 `{회사명} 삭제` 와 정확히 일치할 때만 삭제 버튼 활성화
 *
 * 호출부에서 onConfirm 으로 deleteProject Server Action 을 주입한다.
 */
export function DeleteProjectDialog({
  projectId,
  companyName,
  onConfirm,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, setIsPending] = useState(false);

  const expectedText = `${companyName} 삭제`;
  const canDelete = confirmText === expectedText && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmText('');
    }
  }

  async function handleConfirm() {
    if (!canDelete) return;
    setIsPending(true);
    try {
      const result = await onConfirm(projectId, confirmText);
      if (result.success) {
        setOpen(false);
        setConfirmText('');
        onDeleted?.();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="mr-1 size-4" aria-hidden />
          삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>프로젝트 삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            {`'${companyName}' 기업의 프로젝트를 삭제하시겠습니까? 관련된 데이터는 모두 삭제되며 되돌릴 수 없습니다.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-delete-text" className="text-sm">
            삭제를 확인하려면 아래에{' '}
            <span className="font-semibold text-red-600">{expectedText}</span>
            {' '}를 정확히 입력하세요.
          </Label>
          <Input
            id="confirm-delete-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedText}
            autoComplete="off"
            disabled={isPending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 disabled:bg-red-300"
            aria-label="삭제 확정"
          >
            {isPending && <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />}
            삭제 확정
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
