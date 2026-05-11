'use client';

import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  cancelLabel?: string;
  actionLabel: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * 시스템 네이티브 confirm() 대체용 공통 확인 다이얼로그.
 * shadcn AlertDialog 를 래핑해 프로젝트 전반에서 일관된 톤·라벨·a11y 를 제공한다.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = '취소',
  actionLabel,
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const handleAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    // loading 또는 비동기 onConfirm 처리를 부모에서 제어할 수 있도록
    // 기본 닫힘 동작을 막고 onConfirm 호출만 위임한다.
    event.preventDefault();
    void onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="sr-only">
              이 작업을 진행하려면 &quot;{actionLabel}&quot; 을 선택하세요.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={loading}
            onClick={handleAction}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
