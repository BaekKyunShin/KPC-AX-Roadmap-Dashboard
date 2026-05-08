'use client';

import { Trash2 } from 'lucide-react';
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

export interface ConfirmRemoveRowButtonProps {
  /** 다이얼로그 제목 — 예: "1차 행을 삭제하시겠습니까?" */
  title: string;
  /** 트리거 버튼 aria-label — 예: "차수 삭제 1" */
  ariaLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}

/**
 * #1 H5·H3 — 인터뷰 차수/행의 휴지통 버튼.
 *
 * 자동저장 환경에서 행을 즉시 삭제하면 3초 후 영구 손실되므로,
 * AlertDialog 로 사전 확인을 받는다. 4개 Step 컴포넌트(StepPerformanceActivities,
 * StepCompetencyModeling, StepTaskAnalysis, StepActivities)에서 동일하게 재사용.
 */
export function ConfirmRemoveRowButton({
  title,
  ariaLabel,
  disabled = false,
  onConfirm,
}: ConfirmRemoveRowButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <Trash2 className="size-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            작성된 내용이 함께 삭제되며 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
