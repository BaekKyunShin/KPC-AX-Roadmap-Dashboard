'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, LockOpen } from 'lucide-react';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReasonLengthHint from '@/components/ops/assignment/ReasonLengthHint';
import { REASON_LENGTH } from '@/components/ops/assignment/constants';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';

import { closeProject, reopenProject } from '../../actions';

interface ProjectClosureControlsProps {
  projectId: string;
  companyName: string;
  /** 행정 종결 시각 — null이면 미종결. 정식 확정 프로젝트는 호출부(page)에서 미렌더. */
  closedAt: string | null;
}

/**
 * 운영관리자 프로젝트 상세 최하단의 행정 종결/해제 컨트롤.
 *
 * 드문 관리 작업이라 별도 카드 없이 우측 정렬 소형 버튼 하나만 노출한다
 * (호버 툴팁 + 클릭 시 안내 다이얼로그가 전체 설명을 담당).
 * - 미종결: "프로젝트 종결" → 사유(10자 이상 필수) 입력 다이얼로그
 * - 종결됨: "종결 해제" → 이전 상태 복원 확인 다이얼로그
 */
export function ProjectClosureControls({
  projectId,
  companyName,
  closedAt,
}: ProjectClosureControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isPending, setIsPending] = useState(false);

  const isClosed = closedAt !== null;
  const trimmedLength = reason.trim().length;
  const canClose = trimmedLength >= REASON_LENGTH.MIN && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason('');
    }
  }

  async function handleClose(event: React.MouseEvent<HTMLButtonElement>) {
    if (!canClose) {
      event.preventDefault();
      return;
    }
    // Radix AlertDialogAction 의 디폴트 close 동작을 차단 — 비동기 완료 후 직접 close
    event.preventDefault();
    setIsPending(true);
    try {
      const result = await closeProject({ project_id: projectId, reason });
      if (result.success) {
        setOpen(false);
        setReason('');
        showSuccessToast('프로젝트가 종결 처리되었습니다');
        router.refresh();
      } else {
        showErrorToast('종결 실패', result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleReopen(event: React.MouseEvent<HTMLButtonElement>) {
    if (isPending) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    setIsPending(true);
    try {
      const result = await reopenProject({ project_id: projectId });
      if (result.success) {
        setOpen(false);
        showSuccessToast('종결이 해제되었습니다');
        router.refresh();
      } else {
        showErrorToast('종결 해제 실패', result.error);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex justify-end">
      <TooltipProvider>
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  {isClosed ? (
                    <LockOpen className="mr-1 size-4" aria-hidden />
                  ) : (
                    <Lock className="mr-1 size-4" aria-hidden />
                  )}
                  {isClosed ? '종결 해제' : '프로젝트 종결'}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isClosed
                ? '종결을 해제하고 이전 상태로 되돌립니다'
                : '완료되지 않은 프로젝트를 행정적으로 종결 처리합니다'}
            </TooltipContent>
          </Tooltip>

          {isClosed ? (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>종결 해제 확인</AlertDialogTitle>
                <AlertDialogDescription>
                  {`'${companyName}' 프로젝트의 종결을 해제합니다. 프로젝트는 종결 전 상태로 복원되며, 담당 컨설턴트의 편집이 다시 가능해집니다.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReopen}
                  disabled={isPending}
                  aria-label={isPending ? '해제 중' : '해제 확정'}
                >
                  {isPending && <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />}
                  {isPending ? '해제 중...' : '해제 확정'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          ) : (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>프로젝트 종결</AlertDialogTitle>
                <AlertDialogDescription>
                  {`'${companyName}' 프로젝트를 종결 처리합니다. 종결 후 담당 컨설턴트는 인터뷰·로드맵·PBL을 수정할 수 없으며, 산출물 열람과 내보내기는 계속 가능합니다. 언제든 종결 해제로 되돌릴 수 있습니다.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="closure-reason" className="text-sm">
                  종결 사유 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="closure-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 코치가 오프라인으로 작업을 완료하여 행정 종결 처리합니다."
                  rows={3}
                  maxLength={REASON_LENGTH.MAX}
                  disabled={isPending}
                />
                <ReasonLengthHint currentLength={trimmedLength} />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClose}
                  disabled={!canClose}
                  aria-label={isPending ? '종결 중' : '종결'}
                >
                  {isPending && <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />}
                  {isPending ? '종결 중...' : '종결'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          )}
        </AlertDialog>
      </TooltipProvider>
    </div>
  );
}
